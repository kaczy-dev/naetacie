import type { Announcement } from '@/lib/types/announcement';

/**
 * Sorts announcements by scraped_at in descending order (newest first).
 * Returns a new array without mutating the input.
 */
export function sortByScrapedAtDesc<T extends Pick<Announcement, 'scraped_at'>>(
  announcements: T[]
): T[] {
  return [...announcements].sort((a, b) => {
    const timeA = a.scraped_at instanceof Date ? a.scraped_at.getTime() : new Date(a.scraped_at).getTime();
    const timeB = b.scraped_at instanceof Date ? b.scraped_at.getTime() : new Date(b.scraped_at).getTime();
    return timeB - timeA;
  });
}
