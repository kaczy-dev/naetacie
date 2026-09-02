import type { Announcement, MaskedAnnouncement } from '@/lib/types/announcement';

/** 48 hours in milliseconds */
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/** Maximum description length before truncation for free tier */
const MAX_DESCRIPTION_LENGTH = 100;

/**
 * Applies tier-based masking to a list of announcements.
 *
 * Free tier:
 *  1. Filter: only announcements where scraped_at is more than 48 hours before currentTime
 *  2. Truncate description: if > 100 chars, keep first 100 + "..."
 *  3. Omit source_url and contact_info
 *
 * Premium tier:
 *  Return all announcements with full data.
 */
export function applyTierMasking(
  announcements: Announcement[],
  tier: 'free' | 'premium',
  currentTime: Date
): MaskedAnnouncement[] {
  if (tier === 'premium') {
    return announcements.map((a) => ({
      deduplication_key: a.deduplication_key,
      title: a.title,
      description: a.description,
      source_portal: a.source_portal,
      category: a.category,
      location_text: a.location_text,
      latitude: a.latitude,
      longitude: a.longitude,
      price: a.price,
      scraped_at: a.scraped_at,
      published_at: a.published_at,
      source_url: a.source_url,
      contact_info: a.contact_info,
      company: a.company ?? null,
      employment_type: a.employment_type ?? null,
      posted_days_ago: a.posted_days_ago ?? null,
      traits: a.traits,
    }));
  }

  // Free tier
  const cutoffTime = currentTime.getTime() - FORTY_EIGHT_HOURS_MS;

  return announcements
    .filter((a) => a.scraped_at.getTime() < cutoffTime)
    .map((a) => ({
      deduplication_key: a.deduplication_key,
      title: a.title,
      description: maskDescription(a.description),
      source_portal: a.source_portal,
      category: a.category,
      location_text: a.location_text,
      latitude: a.latitude,
      longitude: a.longitude,
      price: a.price,
      scraped_at: a.scraped_at,
      published_at: a.published_at,
      company: a.company ?? null,
      employment_type: a.employment_type ?? null,
      posted_days_ago: a.posted_days_ago ?? null,
      traits: a.traits,
    }));
}

/**
 * Truncates a description to 100 characters + "..." if it exceeds 100 characters.
 * Returns unchanged if ≤ 100 characters.
 */
function maskDescription(description: string): string {
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return description.slice(0, MAX_DESCRIPTION_LENGTH) + '...';
  }
  return description;
}
