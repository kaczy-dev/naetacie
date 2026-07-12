/**
 * Client-side Nominatim geocoder with in-memory + localStorage cache.
 *
 * Usage: geocode("Szczecin, Pogodno") → { lat: 53.433, lng: 14.518 }
 *
 * Caches results in localStorage (key: `geo_cache`) so repeated requests
 * for the same district name are instant. Falls back to a static lookup
 * table for known Szczecin districts when offline/rate-limited.
 *
 * Nominatim usage policy: max 1 req/sec, custom User-Agent.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_KEY = 'nominatim_geo_cache';
const USER_AGENT = 'NaEtacie/1.0 (szczecin-job-aggregator)';

/** Known districts for instant offline lookup (no network needed). */
const STATIC_LOOKUP: Record<string, { lat: number; lng: number }> = {
  'szczecin': { lat: 53.4285, lng: 14.5528 },
  'szczecin, centrum': { lat: 53.4285, lng: 14.5528 },
  'szczecin, pogodno': { lat: 53.4335, lng: 14.5183 },
  'szczecin, niebuszewo': { lat: 53.4468, lng: 14.5622 },
  'szczecin, gumieńce': { lat: 53.3973, lng: 14.5064 },
  'szczecin, prawobrzeże': { lat: 53.4090, lng: 14.6133 },
  'szczecin, dąbie': { lat: 53.4539, lng: 14.5281 },
  'szczecin, bezrzecze': { lat: 53.3683, lng: 14.5789 },
  'szczecin, załom': { lat: 53.3932, lng: 14.6488 },
  'szczecin, warszewo': { lat: 53.4726, lng: 14.5467 },
  'police': { lat: 53.5513, lng: 14.5692 },
  'stargard': { lat: 53.3362, lng: 15.0500 },
  'goleniów': { lat: 53.5640, lng: 14.8298 },
  'gryfino': { lat: 53.2538, lng: 14.4889 },
  'koszalin': { lat: 54.1942, lng: 16.1714 },
  'świnoujście': { lat: 53.9100, lng: 14.2475 },
  'myślibórz': { lat: 52.9236, lng: 14.8665 },
  'świdwin': { lat: 53.7747, lng: 15.7722 },
  'darłowo': { lat: 54.4195, lng: 16.4079 },
  'czaplinek': { lat: 53.5583, lng: 16.2339 },
};

interface GeoResult {
  lat: number;
  lng: number;
}

/** In-memory cache (fastest, lives for the session). */
const memCache = new Map<string, GeoResult>();

/** Load persisted cache from localStorage. */
function loadDiskCache(): Record<string, GeoResult> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Save result to localStorage cache. */
function saveToDisk(key: string, result: GeoResult): void {
  try {
    const cache = loadDiskCache();
    cache[key] = result;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full — ignore */ }
}

/**
 * Geocode a location string to lat/lng.
 * Priority: memCache → localStorage → static lookup → Nominatim API.
 */
export async function geocode(locationText: string): Promise<GeoResult | null> {
  const key = locationText.toLowerCase().trim();
  if (!key) return null;

  // 1. Memory cache (instant)
  if (memCache.has(key)) return memCache.get(key)!;

  // 2. localStorage cache
  const disk = loadDiskCache();
  if (disk[key]) {
    memCache.set(key, disk[key]);
    return disk[key];
  }

  // 3. Static lookup (known Szczecin districts — offline-safe)
  if (STATIC_LOOKUP[key]) {
    memCache.set(key, STATIC_LOOKUP[key]);
    return STATIC_LOOKUP[key];
  }
  // Try partial match (e.g. "Szczecin, Warszewo" matches "szczecin, warszewo")
  for (const [staticKey, coords] of Object.entries(STATIC_LOOKUP)) {
    if (key.includes(staticKey) || staticKey.includes(key)) {
      memCache.set(key, coords);
      return coords;
    }
  }

  // 4. Nominatim API (last resort — 1 req/sec policy)
  try {
    const params = new URLSearchParams({
      q: `${locationText}, zachodniopomorskie, Polska`,
      format: 'json',
      limit: '1',
      addressdetails: '0',
    });

    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.length > 0) {
      const result: GeoResult = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      memCache.set(key, result);
      saveToDisk(key, result);
      return result;
    }
  } catch {
    // Network error — return null (caller uses jitter fallback)
  }

  return null;
}
