import { Transporter } from 'nodemailer';
import { Announcement } from '../../../lib/types/announcement';

/**
 * Format a single announcement entry for the email body.
 */
function formatAnnouncementEntry(announcement: Announcement): string {
  const priceText = announcement.price !== null
    ? `${announcement.price} PLN`
    : 'Price not listed';

  return [
    `• ${announcement.title}`,
    `  Location: ${announcement.location_text}`,
    `  Price: ${priceText}`,
  ].join('\n');
}

/**
 * Send a consolidated notification email listing matching announcements.
 *
 * Uses Nodemailer's Transporter interface to send the email.
 * On delivery failure, the error is logged and no retry is attempted.
 */
export async function sendNotificationEmail(
  recipientEmail: string,
  announcements: Announcement[],
  transporter: Transporter
): Promise<void> {
  const subject = announcements.length === 1
    ? 'New construction ad matching your preferences'
    : `${announcements.length} new construction ads matching your preferences`;

  const body = [
    'New matching construction/renovation ads have been found:\n',
    ...announcements.map(formatAnnouncementEntry),
    '\n---',
    'You are receiving this email because you have notifications enabled for your saved location radius.',
  ].join('\n');

  try {
    await transporter.sendMail({
      to: recipientEmail,
      subject,
      text: body,
    });
  } catch (error) {
    console.error(
      `Failed to send notification email to ${recipientEmail}:`,
      error instanceof Error ? error.message : error
    );
    // Do not retry on delivery failure per requirement 6.4
  }
}
