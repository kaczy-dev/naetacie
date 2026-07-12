/**
 * Notification processor for new announcements.
 *
 * After new announcements are batch-written by the scraper orchestrator,
 * this processor finds premium users with configured notification preferences
 * and sends consolidated email notifications for matching announcements
 * within each user's geographic radius.
 *
 * Requirements: 6.1, 6.5
 */

import { Firestore } from 'firebase-admin/firestore';
import nodemailer, { Transporter } from 'nodemailer';

import { Announcement } from '../../../lib/types/announcement';
import { UserProfile } from '../../../lib/types/user';
import { isWithinRadius } from './distance';
import { consolidateForEmail } from './consolidate';
import { sendNotificationEmail } from './email';

/**
 * Create a Nodemailer SMTP transporter from environment variables.
 *
 * Expects: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */
function createTransporter(): Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: (Number(process.env.SMTP_PORT) || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Fetch premium users with enabled notification preferences from Firestore.
 *
 * Queries the `users` collection for documents where:
 * - tier == 'premium'
 * - notification_prefs.enabled == true
 */
async function getPremiumUsersWithNotifications(
  firestore: Firestore
): Promise<UserProfile[]> {
  const snapshot = await firestore
    .collection('users')
    .where('tier', '==', 'premium')
    .where('notification_prefs.enabled', '==', true)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: data.email,
      display_name: data.display_name,
      tier: data.tier,
      created_at: data.created_at?.toDate?.() ?? data.created_at,
      updated_at: data.updated_at?.toDate?.() ?? data.updated_at,
      notification_prefs: data.notification_prefs ?? null,
    } as UserProfile;
  });
}

/**
 * Filter announcements that have valid coordinates (non-null lat/lng).
 */
function filterAnnouncementsWithCoordinates(
  announcements: Announcement[]
): Announcement[] {
  return announcements.filter(
    (a) => a.latitude !== null && a.longitude !== null
  );
}

/**
 * Find announcements that fall within a user's notification radius.
 */
function findMatchingAnnouncements(
  announcements: Announcement[],
  user: UserProfile
): Announcement[] {
  if (!user.notification_prefs || !user.notification_prefs.enabled) {
    return [];
  }

  return announcements.filter((a) =>
    isWithinRadius(
      { latitude: a.latitude!, longitude: a.longitude! },
      user.notification_prefs!
    )
  );
}

/**
 * Process notifications for newly stored announcements.
 *
 * Called after a batch write in the scraper orchestrator. For each premium
 * user with configured notification preferences, checks if any new
 * announcement's coordinates fall within their radius, consolidates
 * matching announcements (max 10), and sends a notification email.
 *
 * - Skips announcements without coordinates (null lat/lng)
 * - Skips users without notification_prefs configured or with enabled: false
 * - Consolidates matching announcements per user (max 10 per email)
 * - Sends within 5 minutes of storage (designed to be called immediately after batch write)
 *
 * @param announcements - Newly stored announcements from the scraper
 * @param firestore - Firestore instance for querying users
 */
export async function processNotifications(
  announcements: Announcement[],
  firestore: Firestore
): Promise<void> {
  // Skip entirely if no announcements
  if (announcements.length === 0) {
    return;
  }

  // Filter to only announcements with valid coordinates
  const geoAnnouncements = filterAnnouncementsWithCoordinates(announcements);

  if (geoAnnouncements.length === 0) {
    return;
  }

  // Fetch premium users with enabled notification preferences
  const users = await getPremiumUsersWithNotifications(firestore);

  if (users.length === 0) {
    return;
  }

  // Create SMTP transporter
  const transporter = createTransporter();

  // For each user, find matching announcements and send notifications
  for (const user of users) {
    // Skip users without properly configured notification_prefs
    if (!user.notification_prefs || !user.notification_prefs.enabled) {
      continue;
    }

    const matching = findMatchingAnnouncements(geoAnnouncements, user);

    if (matching.length === 0) {
      continue;
    }

    // Consolidate to max 10 announcements per email
    const consolidated = consolidateForEmail(matching);

    // Send notification email
    await sendNotificationEmail(user.email, consolidated, transporter);
  }
}
