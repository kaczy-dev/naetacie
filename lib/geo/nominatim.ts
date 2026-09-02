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
  // Centrum & Śródmieście
  'szczecin': { lat: 53.4285, lng: 14.5528 },
  'szczecin, centrum': { lat: 53.4285, lng: 14.5528 },
  'szczecin, śródmieście': { lat: 53.4285, lng: 14.5528 },
  'szczecin, stare miasto': { lat: 53.4248, lng: 14.5605 },
  'szczecin, łasztownia': { lat: 53.4255, lng: 14.5680 },
  'szczecin, turzyn': { lat: 53.4245, lng: 14.5332 },
  'szczecin, nowe miasto': { lat: 53.4185, lng: 14.5490 },

  // Zachód & Pogodno
  'szczecin, pogodno': { lat: 53.4335, lng: 14.5183 },
  'szczecin, krzekowo': { lat: 53.4475, lng: 14.4925 },
  'szczecin, bezrzecze': { lat: 53.4520, lng: 14.4810 },
  'szczecin, krzekowo-bezrzecze': { lat: 53.4490, lng: 14.4850 },
  'szczecin, zawadzkiego': { lat: 53.4510, lng: 14.5050 },
  'szczecin, gumieńce': { lat: 53.3973, lng: 14.5064 },
  'szczecin, pomorzany': { lat: 53.4012, lng: 14.5320 },
  'szczecin, wierzejewo': { lat: 53.4830, lng: 14.5420 },

  // Północ
  'szczecin, niebuszewo': { lat: 53.4468, lng: 14.5622 },
  'szczecin, warszewo': { lat: 53.4726, lng: 14.5467 },
  'szczecin, osów': { lat: 53.4795, lng: 14.5120 },
  'szczecin, żelechowa': { lat: 53.4610, lng: 14.5750 },
  'szczecin, drzetowo': { lat: 53.4495, lng: 14.5730 },
  'szczecin, drzetowo-grabowo': { lat: 53.4420, lng: 14.5710 },
  'szczecin, golęcino': { lat: 53.4710, lng: 14.5930 },
  'szczecin, gocław': { lat: 53.4860, lng: 14.6050 },
  'szczecin, stołczyn': { lat: 53.5040, lng: 14.5960 },
  'szczecin, skolwin': { lat: 53.5280, lng: 14.6180 },

  // Prawobrzeże
  'szczecin, prawobrzeże': { lat: 53.4090, lng: 14.6133 },
  'szczecin, dąbie': { lat: 53.3980, lng: 14.6850 },
  'szczecin, zdroje': { lat: 53.3850, lng: 14.6150 },
  'szczecin, słoneczne': { lat: 53.3820, lng: 14.6460 },
  'szczecin, majowe': { lat: 53.3810, lng: 14.6620 },
  'szczecin, bukowe': { lat: 53.3710, lng: 14.6540 },
  'szczecin, kijewo': { lat: 53.3750, lng: 14.6850 },
  'szczecin, wielgowo': { lat: 53.4080, lng: 14.7320 },
  'szczecin, sławociesze': { lat: 53.3950, lng: 14.7180 },
  'szczecin, załom': { lat: 53.3932, lng: 14.6488 },
  'szczecin, płonia': { lat: 53.3480, lng: 14.7020 },
  'szczecin, podjuchy': { lat: 53.3640, lng: 14.6020 },
  'szczecin, żydowce': { lat: 53.3420, lng: 14.5650 },
  'szczecin, klucz': { lat: 53.3280, lng: 14.5510 },

  // Aglomeracja & Region
  'police': { lat: 53.5513, lng: 14.5692 },
  'stargard': { lat: 53.3362, lng: 15.0500 },
  'goleniów': { lat: 53.5640, lng: 14.8298 },
  'gryfino': { lat: 53.2538, lng: 14.4889 },
  'dobra szczecińska': { lat: 53.4889, lng: 14.3853 },
  'mierzyn': { lat: 53.4147, lng: 14.4642 },
  'przecław': { lat: 53.3683, lng: 14.4719 },
  'warzymice': { lat: 53.3765, lng: 14.4842 },
  'kołbaskowo': { lat: 53.3330, lng: 14.4440 },
  'kobylanka': { lat: 53.3486, lng: 14.8694 },
  'świnoujście': { lat: 53.9100, lng: 14.2475 },
  'koszalin': { lat: 54.1942, lng: 16.1714 },
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
