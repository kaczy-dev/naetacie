/**
 * Deterministic geographic jitter for map markers.
 *
 * Problem: multiple offers from the same district share identical coordinates
 * (OLX returns approximate city-level lat/lng). Without jitter they stack
 * into one invisible pile.
 *
 * Solution: offset each marker by a small, STABLE amount derived from a hash
 * of its unique ID. The offset is:
 * - Small enough to stay within the same neighborhood (~200m)
 * - Deterministic — same ID always produces the same offset, so markers
 *   don't jump on re-render or filter change
 * - Visually even — uses golden ratio angular distribution
 */

/**
 * Simple numeric hash of a string (same output every run, fast, 32-bit).
 */
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Returns a jittered [lat, lng] pair.
 * @param lat  - original latitude
 * @param lng  - original longitude
 * @param id   - unique stable identifier (announcement ID)
 * @param radiusMeters - max jitter radius (default 180m ≈ same block)
 */
export function jitteredPosition(
  lat: number,
  lng: number,
  id: string,
  radiusMeters: number = 180
): [number, number] {
  const h = hashCode(id);

  // Golden angle distribution: each marker gets a unique angle offset
  const angle = (h * 2.399963) % (2 * Math.PI);

  // Radius varies by hash too (40%–100% of max) for natural spread
  const r = (0.4 + (((h >> 8) & 0xff) / 255) * 0.6) * radiusMeters;

  // Convert meters to approximate degrees (at Szczecin's latitude ~53°N)
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180);

  const dLat = (Math.sin(angle) * r) / mPerDegLat;
  const dLng = (Math.cos(angle) * r) / mPerDegLng;

  return [lat + dLat, lng + dLng];
}
