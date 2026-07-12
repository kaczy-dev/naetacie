import { Announcement } from '../../../lib/types/announcement';

/**
 * Consolidate announcements for email notification.
 *
 * Returns the first min(input.length, 10) items from the input list,
 * preserving their original order. This limits the email content to
 * a maximum of 10 announcements per notification.
 */
export function consolidateForEmail(announcements: Announcement[]): Announcement[] {
  return announcements.slice(0, 10);
}
