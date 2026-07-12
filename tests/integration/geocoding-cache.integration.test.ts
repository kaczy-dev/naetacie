/**
 * Integration test: Geocoding Cache Flows
 *
 * Tests the geocoding cache behavior end-to-end:
 *   - Cache miss: normalize → query Nominatim → store in cache
 *   - Cache hit: normalize → find in cache → skip Nominatim
 *   - Negative cache: stored null coords → treat as hit
 *
 * Uses mocked Firestore and Nominatim (same pattern as existing tests)
 * but exercises the full geocoding resolution pipeline including
 * normalization and cache interaction.
 *
 * Validates: Requirements 3.1, 8.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveLocation, normalizeLocationText } from '../../functions/src/geocoding';

// Mock the Nominatim rate limiter
vi.mock('../../functions/src/geocoding/nominatim', () => {
  const mockQuery = vi.fn();
  return {
    buildNominatimQuery: (text: string) => `${text}, Szczecin, Poland`,
    NominatimRateLimiter: class {
      async waitForSlot() {}
      query = mockQuery;
    },
  };
});

import { NominatimRateLimiter } from '../../functions/src/geocoding/nominatim';

// --- Helper: Create a mock Firestore with geo_cache support ---

interface GeoCacheStore {
  [normalizedText: string]: {
    latitude: number | null;
    longitude: number | null;
    resolved_at: Date;
  };
}

function createGeoCacheMockFirestore(initialCache: GeoCacheStore = {}) {
  // In-memory representation of geo_cache
  const cache = { ...initialCache };
  const setCalls: Array<{ docId: string; data: Record<string, unknown> }> = [];

  const firestore = {
    collection: vi.fn().mockImplementation((collectionName: string) => {
      if (collectionName !== 'geo_cache') {
        throw new Error(`Unexpected collection: ${collectionName}`);
      }
      return {
        doc: vi.fn().mockImplementation((docId: string) => ({
          get: vi.fn().mockImplementation(async () => {
            const entry = cache[docId];
            if (entry) {
              return {
                exists: true,
                data: () => ({
                  location_text: docId,
                  latitude: entry.latitude,
                  longitude: entry.longitude,
                  resolved_at: { toDate: () => entry.resolved_at },
                }),
              };
            }
            return { exists: false, data: () => undefined };
          }),
          set: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
            setCalls.push({ docId, data });
            // Update in-memory cache to simulate persistence
            cache[docId] = {
              latitude: data.latitude as number | null,
              longitude: data.longitude as number | null,
              resolved_at: data.resolved_at as Date,
            };
          }),
        })),
      };
    }),
    _cache: cache,
    _setCalls: setCalls,
  };

  return firestore as any;
}

describe('Geocoding Cache Integration', () => {
  let mockNominatimQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    const limiter = new NominatimRateLimiter(1000);
    mockNominatimQuery = limiter.query as ReturnType<typeof vi.fn>;
    mockNominatimQuery.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('cache miss flow: normalize → query Nominatim → store in cache', () => {
    it('resolves a new location through Nominatim and caches the result', async () => {
      const firestore = createGeoCacheMockFirestore({});

      mockNominatimQuery.mockResolvedValueOnce({ lat: 53.4285, lng: 14.5528 });

      const result = await resolveLocation('ul. Mickiewicza 5, Szczecin', firestore);

      // Verify: returned fresh coordinates from Nominatim
      expect(result).toEqual({
        latitude: 53.4285,
        longitude: 14.5528,
        fromCache: false,
      });

      // Verify: Nominatim was called with the normalized text
      expect(mockNominatimQuery).toHaveBeenCalledTimes(1);
      expect(mockNominatimQuery).toHaveBeenCalledWith('ul. mickiewicza 5, szczecin');

      // Verify: result was stored in cache
      expect(firestore._setCalls).toHaveLength(1);
      expect(firestore._setCalls[0].docId).toBe('ul. mickiewicza 5, szczecin');
      expect(firestore._setCalls[0].data).toMatchObject({
        location_text: 'ul. mickiewicza 5, szczecin',
        latitude: 53.4285,
        longitude: 14.5528,
      });
    });

    it('normalizes location text consistently before cache lookup', async () => {
      const firestore = createGeoCacheMockFirestore({});
      mockNominatimQuery.mockResolvedValue({ lat: 53.0, lng: 14.0 });

      // Various inputs that should all normalize to the same key
      const inputs = [
        'Szczecin  Centrum',
        '  SZCZECIN CENTRUM  ',
        'szczecin centrum',
        'SZCZECIN   CENTRUM',
      ];

      for (const input of inputs) {
        const normalized = normalizeLocationText(input);
        expect(normalized).toBe('szczecin centrum');
      }

      // First call should query Nominatim
      await resolveLocation('Szczecin  Centrum', firestore);
      expect(mockNominatimQuery).toHaveBeenCalledTimes(1);

      // Subsequent call with differently-cased text should hit cache
      // (because normalization produces the same doc ID)
      const result2 = await resolveLocation('  SZCZECIN CENTRUM  ', firestore);
      expect(result2.fromCache).toBe(true);
      expect(mockNominatimQuery).toHaveBeenCalledTimes(1); // Still only 1 Nominatim call
    });

    it('handles Nominatim returning no result (stores negative cache)', async () => {
      const firestore = createGeoCacheMockFirestore({});
      mockNominatimQuery.mockResolvedValueOnce(null);

      const result = await resolveLocation('totally unknown place', firestore);

      // Returns null coordinates
      expect(result).toEqual({
        latitude: null,
        longitude: null,
        fromCache: false,
      });

      // Nominatim was called
      expect(mockNominatimQuery).toHaveBeenCalledTimes(1);

      // Negative result was stored in cache
      expect(firestore._setCalls).toHaveLength(1);
      expect(firestore._setCalls[0].data).toMatchObject({
        latitude: null,
        longitude: null,
      });
    });
  });

  describe('cache hit flow: normalize → find in cache → skip Nominatim', () => {
    it('returns cached coordinates without calling Nominatim', async () => {
      const firestore = createGeoCacheMockFirestore({
        'ul. mickiewicza 5, szczecin': {
          latitude: 53.4285,
          longitude: 14.5528,
          resolved_at: new Date('2024-06-10T00:00:00Z'), // 5 days ago, within TTL
        },
      });

      const result = await resolveLocation('ul. Mickiewicza 5, Szczecin', firestore);

      expect(result).toEqual({
        latitude: 53.4285,
        longitude: 14.5528,
        fromCache: true,
      });

      // Nominatim was NOT called
      expect(mockNominatimQuery).not.toHaveBeenCalled();

      // Nothing was written to cache
      expect(firestore._setCalls).toHaveLength(0);
    });

    it('returns cached result for case-insensitive match', async () => {
      const firestore = createGeoCacheMockFirestore({
        'szczecin dąbie': {
          latitude: 53.45,
          longitude: 14.58,
          resolved_at: new Date('2024-06-12T00:00:00Z'),
        },
      });

      // Input has different casing
      const result = await resolveLocation('SZCZECIN DĄBIE', firestore);

      expect(result).toEqual({
        latitude: 53.45,
        longitude: 14.58,
        fromCache: true,
      });
      expect(mockNominatimQuery).not.toHaveBeenCalled();
    });

    it('returns cached result for whitespace-collapsed match', async () => {
      const firestore = createGeoCacheMockFirestore({
        'szczecin pogodno': {
          latitude: 53.42,
          longitude: 14.55,
          resolved_at: new Date('2024-06-13T00:00:00Z'),
        },
      });

      // Input has extra whitespace
      const result = await resolveLocation('  Szczecin    Pogodno  ', firestore);

      expect(result).toEqual({
        latitude: 53.42,
        longitude: 14.55,
        fromCache: true,
      });
      expect(mockNominatimQuery).not.toHaveBeenCalled();
    });
  });

  describe('negative cache flow: stored null coords → treat as hit', () => {
    it('returns null coords from negative cache without calling Nominatim', async () => {
      const firestore = createGeoCacheMockFirestore({
        'nieznane miejsce': {
          latitude: null,
          longitude: null,
          resolved_at: new Date('2024-06-10T00:00:00Z'), // Within TTL
        },
      });

      const result = await resolveLocation('Nieznane Miejsce', firestore);

      // Returns null coords from cache
      expect(result).toEqual({
        latitude: null,
        longitude: null,
        fromCache: true,
      });

      // Nominatim was NOT called (negative cache is a valid hit)
      expect(mockNominatimQuery).not.toHaveBeenCalled();

      // Nothing was written to cache
      expect(firestore._setCalls).toHaveLength(0);
    });

    it('negative cache entry prevents Nominatim calls for the same location', async () => {
      const firestore = createGeoCacheMockFirestore({});

      // First call: Nominatim returns null
      mockNominatimQuery.mockResolvedValueOnce(null);
      const result1 = await resolveLocation('ghost location', firestore);

      expect(result1).toEqual({ latitude: null, longitude: null, fromCache: false });
      expect(mockNominatimQuery).toHaveBeenCalledTimes(1);

      // Second call: should hit the (now persisted) negative cache
      const result2 = await resolveLocation('ghost location', firestore);

      expect(result2).toEqual({ latitude: null, longitude: null, fromCache: true });
      // Still only 1 Nominatim call total
      expect(mockNominatimQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('stale cache entries (TTL expired)', () => {
    it('re-fetches from Nominatim when cache entry is older than 30 days', async () => {
      const thirtyOneDaysAgo = new Date('2024-05-15T10:00:00Z');

      const firestore = createGeoCacheMockFirestore({
        'stare miejsce': {
          latitude: 53.0,
          longitude: 14.0,
          resolved_at: thirtyOneDaysAgo,
        },
      });

      // Nominatim returns updated coordinates
      mockNominatimQuery.mockResolvedValueOnce({ lat: 53.5, lng: 14.5 });

      const result = await resolveLocation('Stare Miejsce', firestore);

      // Returns fresh data from Nominatim
      expect(result).toEqual({
        latitude: 53.5,
        longitude: 14.5,
        fromCache: false,
      });

      // Nominatim was called
      expect(mockNominatimQuery).toHaveBeenCalledTimes(1);

      // Updated value was stored in cache
      expect(firestore._setCalls).toHaveLength(1);
      expect(firestore._setCalls[0].data).toMatchObject({
        latitude: 53.5,
        longitude: 14.5,
      });
    });

    it('re-fetches negative cache entries when they become stale', async () => {
      const thirtyOneDaysAgo = new Date('2024-05-15T10:00:00Z');

      const firestore = createGeoCacheMockFirestore({
        'stary nieznany': {
          latitude: null,
          longitude: null,
          resolved_at: thirtyOneDaysAgo,
        },
      });

      // This time Nominatim finds it
      mockNominatimQuery.mockResolvedValueOnce({ lat: 53.3, lng: 14.3 });

      const result = await resolveLocation('Stary Nieznany', firestore);

      expect(result).toEqual({
        latitude: 53.3,
        longitude: 14.3,
        fromCache: false,
      });

      expect(mockNominatimQuery).toHaveBeenCalledTimes(1);
    });

    it('keeps cache entry within TTL (29 days old is still valid)', async () => {
      const twentyNineDaysAgo = new Date('2024-05-17T12:00:00Z');

      const firestore = createGeoCacheMockFirestore({
        'prawie stare': {
          latitude: 53.4,
          longitude: 14.4,
          resolved_at: twentyNineDaysAgo,
        },
      });

      const result = await resolveLocation('Prawie Stare', firestore);

      expect(result).toEqual({
        latitude: 53.4,
        longitude: 14.4,
        fromCache: true,
      });

      // Nominatim was NOT called — entry is still within TTL
      expect(mockNominatimQuery).not.toHaveBeenCalled();
    });
  });

  describe('empty/whitespace location text handling', () => {
    it('skips geocoding entirely for empty string', async () => {
      const firestore = createGeoCacheMockFirestore({});

      const result = await resolveLocation('', firestore);

      expect(result).toEqual({ latitude: null, longitude: null, fromCache: false });
      expect(firestore.collection).not.toHaveBeenCalled();
      expect(mockNominatimQuery).not.toHaveBeenCalled();
    });

    it('skips geocoding entirely for whitespace-only string', async () => {
      const firestore = createGeoCacheMockFirestore({});

      const result = await resolveLocation('   \t\n   ', firestore);

      expect(result).toEqual({ latitude: null, longitude: null, fromCache: false });
      expect(firestore.collection).not.toHaveBeenCalled();
      expect(mockNominatimQuery).not.toHaveBeenCalled();
    });
  });

  describe('multiple sequential resolutions (pipeline simulation)', () => {
    it('resolves multiple locations using cache and Nominatim efficiently', async () => {
      const firestore = createGeoCacheMockFirestore({
        // One location already cached
        'szczecin centrum': {
          latitude: 53.43,
          longitude: 14.55,
          resolved_at: new Date('2024-06-12T00:00:00Z'),
        },
      });

      // Nominatim will be called for new locations
      mockNominatimQuery
        .mockResolvedValueOnce({ lat: 53.45, lng: 14.58 })
        .mockResolvedValueOnce(null); // Unknown location

      const locations = [
        'Szczecin Centrum',       // cached
        'Szczecin Dąbie',         // new → Nominatim
        'Nieznane Miejsce 123',   // new → Nominatim returns null
        '',                       // empty → skip
      ];

      const results = [];
      for (const loc of locations) {
        results.push(await resolveLocation(loc, firestore));
      }

      // Cached
      expect(results[0]).toEqual({ latitude: 53.43, longitude: 14.55, fromCache: true });
      // Fresh from Nominatim
      expect(results[1]).toEqual({ latitude: 53.45, longitude: 14.58, fromCache: false });
      // Negative cache entry created
      expect(results[2]).toEqual({ latitude: null, longitude: null, fromCache: false });
      // Skipped entirely
      expect(results[3]).toEqual({ latitude: null, longitude: null, fromCache: false });

      // Only 2 Nominatim calls (cached + empty were skipped)
      expect(mockNominatimQuery).toHaveBeenCalledTimes(2);
    });
  });
});
