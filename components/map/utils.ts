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
 * Returns "Cena niepodana" if price is null.
 */
export function formatPrice(price: number | null): string {
  if (price === null) {
    return 'Cena niepodana';
  }
  return `${price.toLocaleString('pl-PL')} PLN`;
}

/**
 * Checks whether a 2D point [lat, lng] is inside a polygon defined by an array of vertex coordinates [[lng, lat]].
 * Uses the classic Ray-casting algorithm.
 */
export function isPointInPolygon(
  point: [number, number],
  vs: Array<[number, number]>
): boolean {
  const [x, y] = point; // lat, lng
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][1], yi = vs[i][0]; // lat, lng
    const xj = vs[j][1], yj = vs[j][0]; // lat, lng

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

