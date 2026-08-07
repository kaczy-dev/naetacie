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

/**
 * Formats numeric or string price into a compact badge label for map markers.
 * e.g., 12000 -> "12k", 8500 -> "8.5k", null -> "Oferta"
 */
export function formatMarkerBadgePrice(price: number | string | null): string {
  if (price === null || price === undefined) return 'Oferta';

  let numPrice: number | null = null;
  if (typeof price === 'number') {
    numPrice = price;
  } else if (typeof price === 'string') {
    const extracted = parseFloat(price.replace(/[^\d.]/g, ''));
    if (!isNaN(extracted) && extracted > 0) numPrice = extracted;
  }

  if (numPrice === null || numPrice <= 0) return 'Oferta';

  if (numPrice >= 1000) {
    const inK = numPrice / 1000;
    return `${Number.isInteger(inK) ? inK : inK.toFixed(1)}k`;
  }
  return `${numPrice} zł`;
}

/**
 * Determines price tier category for map pin styling.
 * - 'high': >= 10000 PLN (Green Glow)
 * - 'medium': 6000 - 9999 PLN (Blue Accent)
 * - 'normal': < 6000 PLN or unstated
 */
export function getMarkerPriceTier(price: number | string | null): 'high' | 'medium' | 'normal' {
  let numPrice: number | null = null;
  if (typeof price === 'number') {
    numPrice = price;
  } else if (typeof price === 'string') {
    const extracted = parseFloat(price.replace(/[^\d.]/g, ''));
    if (!isNaN(extracted) && extracted > 0) numPrice = extracted;
  }

  if (numPrice !== null) {
    if (numPrice >= 10000) return 'high';
    if (numPrice >= 6000) return 'medium';
  }
  return 'normal';
}

