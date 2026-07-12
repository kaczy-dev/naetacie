import { MaskedAnnouncement } from '@/lib/types/announcement';

/**
 * Filters announcements to only those with valid (non-null) coordinates.
 * Only announcements where both latitude AND longitude are non-null
 * should be rendered as map markers.
 *
 * This is extracted as a pure function for testability (Property 9).
 */
export function filterGeocodedAnnouncements(
  announcements: MaskedAnnouncement[]
): MaskedAnnouncement[] {
  return announcements.filter(
    (a) => a.latitude !== null && a.longitude !== null
  );
}

/**
 * Formats a price for display in map popups.
 * Returns "Price not listed" if price is null.
 */
export function formatPrice(price: number | null): string {
  if (price === null) {
    return 'Price not listed';
  }
  return `${price.toLocaleString('pl-PL')} PLN`;
}
