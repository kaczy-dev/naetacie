import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveLocation } from './index';

// Mock the nominatim module
vi.mock('./nominatim', () => {
  const mockQuery = vi.fn();
  return {
    buildNominatimQuery: (text: string) => `${text}, Szczecin, Poland`,
    NominatimRateLimiter: class {
      async waitForSlot() {}
      query = mockQuery;
    },
  };
});

// Get reference to the mocked query function
import { NominatimRateLimiter } from './nominatim';

function createMockFirestore(cacheData: Record<string, any> = {}) {
  const setFn = vi.fn().mockResolvedValue(undefined);

  const mockDoc = (docId: string) => {
    const data = cacheData[docId];
    return {
      get: vi.fn().mockResolvedValue({
        exists: !!data,
        data: () => data,
      }),
      set: setFn,
    };
  };

  const firestore = {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockImplementation(mockDoc),
    }),
    _setFn: setFn,
  };

  return firestore as any;
}

describe('resolveLocation', () => {
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    // Get the mock query from a fresh instance
    const limiter = new NominatimRateLimiter(1000);
    mockQuery = limiter.query as ReturnType<typeof vi.fn>;
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('empty/whitespace input handling', () => {
    it('returns null coords with fromCache=false for empty string', async () => {
      const firestore = createMockFirestore();
      const result = await resolveLocation('', firestore);

      expect(result).toEqual({
        latitude: null,
        longitude: null,
        fromCache: false,
      });
      // Should not query Firestore at all
      expect(firestore.collection).not.toHaveBeenCalled();
    });

    it('returns null coords with fromCache=false for whitespace-only string', async () => {
      const firestore = createMockFirestore();
      const result = await resolveLocation('   \t\n  ', firestore);

      expect(result).toEqual({
        latitude: null,
        longitude: null,
        fromCache: false,
      });
      expect(firestore.collection).not.toHaveBeenCalled();
    });

    it('returns null coords with fromCache=false for undefined-like input', async () => {
      const firestore = createMockFirestore();
      const result = await resolveLocation(null as any, firestore);

      expect(result).toEqual({
        latitude: null,
        longitude: null,
        fromCache: false,
      });
    });
  });

  describe('cache hit (not stale)', () => {
    it('returns cached positive coordinates', async () => {
      const tenDaysAgo = new Date('2024-06-05T12:00:00Z');
      const firestore = createMockFirestore({
        'ul. mickiewicza 5': {
          location_text: 'ul. mickiewicza 5',
          latitude: 53.4285,
          longitude: 14.5528,
          resolved_at: { toDate: () => tenDaysAgo },
        },
      });

      const result = await resolveLocation('ul. Mickiewicza 5', firestore);

      expect(result).toEqual({
        latitude: 53.4285,
        longitude: 14.5528,
        fromCache: true,
      });
      // Should not query Nominatim
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('returns cached negative entry (null coords) as a cache hit', async () => {
      const fiveDaysAgo = new Date('2024-06-10T12:00:00Z');
      const firestore = createMockFirestore({
        'unknown place': {
          location_text: 'unknown place',
          latitude: null,
          longitude: null,
          resolved_at: { toDate: () => fiveDaysAgo },
        },
      });

      const result = await resolveLocation('Unknown Place', firestore);

      expect(result).toEqual({
        latitude: null,
        longitude: null,
        fromCache: true,
      });
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('stale cache entries (older than 30 days)', () => {
    it('re-fetches when cache entry is stale', async () => {
      const thirtyOneDaysAgo = new Date('2024-05-15T11:00:00Z');
      const setFn = vi.fn().mockResolvedValue(undefined);

      const firestore = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                location_text: 'stale place',
                latitude: 53.0,
                longitude: 14.0,
                resolved_at: { toDate: () => thirtyOneDaysAgo },
              }),
            }),
            set: setFn,
          }),
        }),
      } as any;

      mockQuery.mockResolvedValueOnce({ lat: 53.5, lng: 14.5 });

      const result = await resolveLocation('Stale Place', firestore);

      expect(result).toEqual({
        latitude: 53.5,
        longitude: 14.5,
        fromCache: false,
      });
      expect(mockQuery).toHaveBeenCalled();
      expect(setFn).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 53.5,
          longitude: 14.5,
        })
      );
    });
  });

  describe('cache miss', () => {
    it('queries Nominatim and stores positive result', async () => {
      const setFn = vi.fn().mockResolvedValue(undefined);

      const firestore = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: false,
              data: () => undefined,
            }),
            set: setFn,
          }),
        }),
      } as any;

      mockQuery.mockResolvedValueOnce({ lat: 53.4285, lng: 14.5528 });

      const result = await resolveLocation('ul. Mickiewicza 5', firestore);

      expect(result).toEqual({
        latitude: 53.4285,
        longitude: 14.5528,
        fromCache: false,
      });
      expect(mockQuery).toHaveBeenCalledWith('ul. mickiewicza 5');
      expect(setFn).toHaveBeenCalledWith(
        expect.objectContaining({
          location_text: 'ul. mickiewicza 5',
          latitude: 53.4285,
          longitude: 14.5528,
          resolved_at: expect.any(Date),
        })
      );
    });

    it('queries Nominatim and stores negative result when no match found', async () => {
      const setFn = vi.fn().mockResolvedValue(undefined);

      const firestore = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: false,
              data: () => undefined,
            }),
            set: setFn,
          }),
        }),
      } as any;

      mockQuery.mockResolvedValueOnce(null);

      const result = await resolveLocation('totally fake place xyz', firestore);

      expect(result).toEqual({
        latitude: null,
        longitude: null,
        fromCache: false,
      });
      expect(setFn).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: null,
          longitude: null,
        })
      );
    });
  });

  describe('normalization', () => {
    it('normalizes location text before cache lookup (case-insensitive)', async () => {
      const tenDaysAgo = new Date('2024-06-05T12:00:00Z');

      const docMock = vi.fn().mockImplementation((docId: string) => {
        if (docId === 'ul. mickiewicza 5') {
          return {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                location_text: 'ul. mickiewicza 5',
                latitude: 53.4285,
                longitude: 14.5528,
                resolved_at: { toDate: () => tenDaysAgo },
              }),
            }),
            set: vi.fn(),
          };
        }
        return {
          get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
          set: vi.fn(),
        };
      });

      const firestore = {
        collection: vi.fn().mockReturnValue({ doc: docMock }),
      } as any;

      // Different casing should still hit the cache
      const result = await resolveLocation('UL. MICKIEWICZA 5', firestore);

      expect(result.fromCache).toBe(true);
      expect(docMock).toHaveBeenCalledWith('ul. mickiewicza 5');
    });

    it('collapses whitespace before cache lookup', async () => {
      const tenDaysAgo = new Date('2024-06-05T12:00:00Z');

      const docMock = vi.fn().mockImplementation((docId: string) => {
        if (docId === 'ul. mickiewicza 5') {
          return {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                location_text: 'ul. mickiewicza 5',
                latitude: 53.4285,
                longitude: 14.5528,
                resolved_at: { toDate: () => tenDaysAgo },
              }),
            }),
            set: vi.fn(),
          };
        }
        return {
          get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
          set: vi.fn(),
        };
      });

      const firestore = {
        collection: vi.fn().mockReturnValue({ doc: docMock }),
      } as any;

      const result = await resolveLocation('  ul.   Mickiewicza    5  ', firestore);

      expect(result.fromCache).toBe(true);
      expect(docMock).toHaveBeenCalledWith('ul. mickiewicza 5');
    });
  });
});
