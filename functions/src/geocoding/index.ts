/**
 * Geocoding resolution service with Firestore cache.
 *
 * Resolves location text to geographic coordinates using a cache-first strategy:
 * 1. Empty/whitespace-only input → skip geocoding entirely
 * 2. Normalize text → look up in geo_cache collection
 * 3. Cache hit (not stale) → return cached coordinates
 * 4. Cache miss or stale → query Nominatim, store result in geo_cache
 *
 * Negative cache entries (null coords) are treated as valid cache hits within TTL.
 * TTL: 30 days from resolved_at timestamp.
 */

import type { Firestore } from 'firebase-admin/firestore';
import type { GeocodingResult } from '../../../lib/types/geo';
import { normalizeLocationText } from './normalize';
import { NominatimRateLimiter } from './nominatim';

/** 30 days in milliseconds */
export const GEO_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Shared rate limiter instance (1 request per second) */
const rateLimiter = new NominatimRateLimiter(1000);

/**
 * Resolves a location text string to geographic coordinates using a cache-first strategy.
 *
 * @param locationText - Raw location text from a scraped ad
 * @param firestore - Firestore instance for cache reads/writes
 * @returns GeocodingResult with coordinates (or null) and cache status
 */
export async function resolveLocation(
  locationText: string,
  firestore: Firestore
): Promise<GeocodingResult> {
  // Step 1: If locationText is empty or whitespace-only, skip geocoding entirely
  if (!locationText || locationText.trim().length === 0) {
    return { latitude: null, longitude: null, fromCache: false };
  }

  // Step 2: Normalize the text for cache lookup
  const normalized = normalizeLocationText(locationText);

  // Step 3: Look up in geo_cache collection (normalized text as doc ID)
  const cacheRef = firestore.collection('geo_cache').doc(normalized);
  const cacheDoc = await cacheRef.get();

  if (cacheDoc.exists) {
    const data = cacheDoc.data()!;
    const resolvedAt = data.resolved_at?.toDate?.()
      ? data.resolved_at.toDate()
      : new Date(data.resolved_at);
    const age = Date.now() - resolvedAt.getTime();

    // Step 4/5: Check TTL — if not stale, return cached result
    if (age < GEO_CACHE_TTL_MS) {
      // Step 6: Negative cache entries (null coords) are valid cache hits
      return {
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        fromCache: true,
      };
    }
    // If stale (older than 30 days), fall through to re-fetch
  }

  // Step 7: Cache miss or stale — query Nominatim
  const result = await rateLimiter.query(normalized);

  const latitude = result?.lat ?? null;
  const longitude = result?.lng ?? null;

  // Store result in geo_cache (positive or negative)
  await cacheRef.set({
    location_text: normalized,
    latitude,
    longitude,
    resolved_at: new Date(),
  });

  return { latitude, longitude, fromCache: false };
}

/**
 * Resolves a batch of location text strings using a batch-first cache lookup.
 *
 * @param locationTexts - Array of raw location texts
 * @param firestore - Firestore instance
 * @returns Map of raw location text to resolved coordinates
 */
export async function resolveLocationsBatch(
  locationTexts: string[],
  firestore: Firestore
): Promise<Map<string, { latitude: number | null; longitude: number | null }>> {
  const results = new Map<string, { latitude: number | null; longitude: number | null }>();
  if (locationTexts.length === 0) return results;

  const normalizedToRaw = new Map<string, string[]>();

  for (const raw of locationTexts) {
    if (!raw || raw.trim().length === 0) {
      results.set(raw, { latitude: null, longitude: null });
      continue;
    }
    const normalized = normalizeLocationText(raw);
    const existing = normalizedToRaw.get(normalized) || [];
    existing.push(raw);
    normalizedToRaw.set(normalized, existing);
  }

  const uniqueNormalized = Array.from(normalizedToRaw.keys());

  // Batch fetch cache entries
  const cacheMap = new Map<string, { latitude: number | null; longitude: number | null }>();
  if (uniqueNormalized.length > 0) {
    const refs = uniqueNormalized.map(norm => firestore.collection('geo_cache').doc(norm));
    const snapshots = await firestore.getAll(...refs);

    for (let i = 0; i < uniqueNormalized.length; i++) {
      const snap = snapshots[i];
      const norm = uniqueNormalized[i];
      if (snap.exists) {
        const data = snap.data()!;
        const resolvedAt = data.resolved_at?.toDate?.()
          ? data.resolved_at.toDate()
          : new Date(data.resolved_at);
        const age = Date.now() - resolvedAt.getTime();

        if (age < GEO_CACHE_TTL_MS) {
          cacheMap.set(norm, {
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
          });
        }
      }
    }
  }

  // Assign results
  for (const raw of locationTexts) {
    if (!raw || raw.trim().length === 0) continue;
    const normalized = normalizeLocationText(raw);
    if (cacheMap.has(normalized)) {
      results.set(raw, cacheMap.get(normalized)!);
    } else {
      // Cache miss or stale entry: resolve individually
      const res = await resolveLocation(raw, firestore);
      const coords = { latitude: res.latitude, longitude: res.longitude };
      results.set(raw, coords);
      // Store in local cache map for any duplicate locations in the same batch
      cacheMap.set(normalized, coords);
    }
  }

  return results;
}

export { normalizeLocationText } from './normalize';
export { buildNominatimQuery, NominatimRateLimiter } from './nominatim';
