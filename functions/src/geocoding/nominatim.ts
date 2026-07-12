/**
 * Nominatim geocoding query builder and rate-limited client.
 *
 * - buildNominatimQuery: Pure function that appends geographic context to location text
 * - NominatimRateLimiter: Class that enforces 1 req/s rate limit when querying Nominatim
 */

/**
 * Builds a Nominatim search query by appending ", Szczecin, Poland" to the trimmed text.
 * This provides geographic context to improve geocoding accuracy for the Szczecin area.
 *
 * @param trimmedText - Pre-trimmed, non-empty location text
 * @returns Query string with geographic context appended
 */
export function buildNominatimQuery(trimmedText: string): string {
  return `${trimmedText}, Szczecin, Poland`;
}

/**
 * Rate-limited Nominatim geocoding client.
 * Ensures a minimum interval between consecutive requests to respect Nominatim's usage policy.
 */
export class NominatimRateLimiter {
  private lastRequestTime: number = 0;
  private readonly minIntervalMs: number;

  /**
   * @param minIntervalMs - Minimum milliseconds between consecutive requests (default: 1000)
   */
  constructor(minIntervalMs: number = 1000) {
    this.minIntervalMs = minIntervalMs;
  }

  /**
   * Waits until enough time has elapsed since the last request to respect the rate limit.
   */
  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Queries the Nominatim API for coordinates matching the given text.
   * Respects rate limiting and handles errors gracefully.
   *
   * @param text - Location text to geocode (will be passed through buildNominatimQuery)
   * @returns Object with lat/lng coordinates, or null if no results or on error
   */
  async query(text: string): Promise<{ lat: number; lng: number } | null> {
    await this.waitForSlot();

    const queryString = buildNominatimQuery(text);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryString)}&format=json&limit=1`;

    try {
      this.lastRequestTime = Date.now();

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ConstructionAdsAggregator/1.0',
        },
      });

      if (!response.ok) {
        return null;
      }

      const results: Array<{ lat: string; lon: string }> = await response.json();

      if (!results || results.length === 0) {
        return null;
      }

      const { lat, lon } = results[0];
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lon);

      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        return null;
      }

      return { lat: parsedLat, lng: parsedLng };
    } catch {
      return null;
    }
  }
}
