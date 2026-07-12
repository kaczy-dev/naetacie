/**
 * Integration test: Scraper Pipeline
 *
 * Tests the end-to-end flow of:
 *   scraped ads → deduplication key generation → batch existence check →
 *   geocoding resolution → batch splitting → Firestore write
 *
 * Uses mocked Firestore (same pattern as existing unit tests) but exercises
 * multiple modules together to verify they integrate correctly.
 *
 * Validates: Requirements 1.1, 2.3, 3.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateDeduplicationKey, batchCheckExists } from '../../functions/src/deduplication';
import { resolveLocation } from '../../functions/src/geocoding';
import { splitIntoBatches } from '../../functions/src/batch';
import type { ScrapedAd } from '@lib/types/announcement';

// Mock the Nominatim rate limiter used by geocoding
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

// --- Helper: Create a mock Firestore ---

interface MockFirestoreOptions {
  existingAnnouncementKeys?: string[];
  geoCacheEntries?: Record<string, { latitude: number | null; longitude: number | null; resolved_at: Date }>;
}

function createMockFirestore(options: MockFirestoreOptions = {}) {
  const { existingAnnouncementKeys = [], geoCacheEntries = {} } = options;

  const writtenDocs: Array<{ collection: string; docId: string; data: Record<string, unknown> }> = [];
  const batchCommits: Array<Array<{ docId: string; data: Record<string, unknown> }>> = [];

  let currentBatchOps: Array<{ docId: string; data: Record<string, unknown> }> = [];

  const firestore = {
    collection: vi.fn().mockImplementation((collectionName: string) => ({
      doc: vi.fn().mockImplementation((docId: string) => {
        const docRef = {
          id: docId,
          get: vi.fn().mockImplementation(async () => {
            if (collectionName === 'announcements') {
              return { exists: existingAnnouncementKeys.includes(docId) };
            }
            if (collectionName === 'geo_cache') {
              const cached = geoCacheEntries[docId];
              if (cached) {
                return {
                  exists: true,
                  data: () => ({
                    location_text: docId,
                    latitude: cached.latitude,
                    longitude: cached.longitude,
                    resolved_at: { toDate: () => cached.resolved_at },
                  }),
                };
              }
              return { exists: false, data: () => undefined };
            }
            return { exists: false, data: () => undefined };
          }),
          set: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
            writtenDocs.push({ collection: collectionName, docId, data });
          }),
        };
        return docRef;
      }),
    })),
    getAll: vi.fn().mockImplementation(async (...refs: Array<{ id: string }>) => {
      return refs.map((ref) => ({
        exists: existingAnnouncementKeys.includes(ref.id),
      }));
    }),
    batch: vi.fn().mockImplementation(() => {
      currentBatchOps = [];
      return {
        set: vi.fn().mockImplementation((docRef: { id: string }, data: Record<string, unknown>) => {
          currentBatchOps.push({ docId: docRef.id, data });
        }),
        commit: vi.fn().mockImplementation(async () => {
          batchCommits.push([...currentBatchOps]);
        }),
      };
    }),
    _writtenDocs: writtenDocs,
    _batchCommits: batchCommits,
  };

  return firestore as any;
}

// --- Helper: Create sample scraped ads ---

function createScrapedAd(overrides: Partial<ScrapedAd> = {}): ScrapedAd {
  return {
    nativeId: null,
    title: 'Remont łazienki Szczecin',
    description: 'Profesjonalny remont łazienki w centrum Szczecina',
    sourceUrl: 'https://olx.pl/offer/12345',
    sourcePortal: 'olx',
    category: 'construction',
    locationText: 'ul. Mickiewicza 5, Szczecin',
    price: 5000,
    contactInfo: '+48 123 456 789',
    publishedAt: new Date('2024-06-01T10:00:00Z'),
    ...overrides,
  };
}

describe('Scraper Pipeline Integration', () => {
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

  describe('full pipeline: scrape → deduplicate → geocode → write', () => {
    it('processes new ads through the complete pipeline', async () => {
      // Setup: 3 scraped ads, none exist in Firestore yet
      const ads: ScrapedAd[] = [
        createScrapedAd({ nativeId: 'olx-001', title: 'Ad 1', locationText: 'Szczecin Centrum' }),
        createScrapedAd({ nativeId: 'olx-002', title: 'Ad 2', locationText: 'Szczecin Dąbie' }),
        createScrapedAd({ nativeId: null, title: 'Ad 3', locationText: 'Szczecin Niebuszewo' }),
      ];

      const firestore = createMockFirestore({
        existingAnnouncementKeys: [],
        geoCacheEntries: {},
      });

      // Nominatim returns coordinates for each location
      mockNominatimQuery
        .mockResolvedValueOnce({ lat: 53.4285, lng: 14.5528 })
        .mockResolvedValueOnce({ lat: 53.4500, lng: 14.5800 })
        .mockResolvedValueOnce({ lat: 53.4400, lng: 14.5600 });

      // Step 1: Generate deduplication keys
      const adKeyPairs = ads.map((ad) => ({
        ad,
        key: generateDeduplicationKey(ad),
      }));

      expect(adKeyPairs[0].key).toBe('olx-olx-001');
      expect(adKeyPairs[1].key).toBe('olx-olx-002');
      // Third ad has no nativeId, so it gets SHA-256 hash
      expect(adKeyPairs[2].key).toMatch(/^[a-f0-9]{64}$/);

      // Step 2: Batch check existence
      const keys = adKeyPairs.map((p) => p.key);
      const existenceMap = await batchCheckExists(firestore, keys);

      // None exist yet
      expect(existenceMap.get(adKeyPairs[0].key)).toBe(false);
      expect(existenceMap.get(adKeyPairs[1].key)).toBe(false);
      expect(existenceMap.get(adKeyPairs[2].key)).toBe(false);

      // Filter to new ads only
      const newAdPairs = adKeyPairs.filter((p) => !existenceMap.get(p.key));
      expect(newAdPairs).toHaveLength(3);

      // Step 3: Geocode each new ad
      const announcementsToWrite: Array<{ key: string; data: Record<string, unknown> }> = [];

      for (const { ad, key } of newAdPairs) {
        const geo = await resolveLocation(ad.locationText, firestore);
        announcementsToWrite.push({
          key,
          data: {
            deduplication_key: key,
            title: ad.title,
            description: ad.description,
            source_url: ad.sourceUrl,
            source_portal: ad.sourcePortal,
            category: ad.category,
            location_text: ad.locationText,
            latitude: geo.latitude,
            longitude: geo.longitude,
            price: ad.price,
            contact_info: ad.contactInfo,
            scraped_at: new Date(),
            published_at: ad.publishedAt,
          },
        });
      }

      expect(announcementsToWrite).toHaveLength(3);
      expect(announcementsToWrite[0].data.latitude).toBe(53.4285);
      expect(announcementsToWrite[1].data.latitude).toBe(53.4500);
      expect(announcementsToWrite[2].data.latitude).toBe(53.4400);

      // Step 4: Split into batches and write
      const batches = splitIntoBatches(announcementsToWrite, 500);
      expect(batches).toHaveLength(1); // 3 items fit in 1 batch

      for (const batch of batches) {
        const writeBatch = firestore.batch();
        for (const item of batch) {
          const docRef = firestore.collection('announcements').doc(item.key);
          writeBatch.set(docRef, item.data);
        }
        await writeBatch.commit();
      }

      // Verify batch commit was called with all 3 docs
      expect(firestore._batchCommits).toHaveLength(1);
      expect(firestore._batchCommits[0]).toHaveLength(3);
    });

    it('skips existing ads during deduplication check', async () => {
      const ads: ScrapedAd[] = [
        createScrapedAd({ nativeId: 'olx-existing-1', title: 'Existing Ad' }),
        createScrapedAd({ nativeId: 'olx-new-1', title: 'New Ad', locationText: 'Szczecin Pogodno' }),
      ];

      const firestore = createMockFirestore({
        existingAnnouncementKeys: ['olx-olx-existing-1'],
        geoCacheEntries: {},
      });

      mockNominatimQuery.mockResolvedValueOnce({ lat: 53.42, lng: 14.55 });

      // Step 1: Generate keys
      const adKeyPairs = ads.map((ad) => ({
        ad,
        key: generateDeduplicationKey(ad),
      }));

      // Step 2: Batch check existence
      const keys = adKeyPairs.map((p) => p.key);
      const existenceMap = await batchCheckExists(firestore, keys);

      // First ad already exists
      expect(existenceMap.get('olx-olx-existing-1')).toBe(true);
      expect(existenceMap.get('olx-olx-new-1')).toBe(false);

      // Filter to new ads
      const newAdPairs = adKeyPairs.filter((p) => !existenceMap.get(p.key));
      expect(newAdPairs).toHaveLength(1);
      expect(newAdPairs[0].ad.title).toBe('New Ad');

      // Step 3: Geocode only new ad
      const geo = await resolveLocation(newAdPairs[0].ad.locationText, firestore);
      expect(geo.latitude).toBe(53.42);

      // Only 1 Nominatim call was made (for the new ad)
      expect(mockNominatimQuery).toHaveBeenCalledTimes(1);
    });

    it('handles ads with empty location text (skip geocoding)', async () => {
      const ads: ScrapedAd[] = [
        createScrapedAd({ nativeId: 'olx-no-loc', title: 'No Location', locationText: '' }),
        createScrapedAd({ nativeId: 'olx-ws-loc', title: 'Whitespace Only', locationText: '   ' }),
      ];

      const firestore = createMockFirestore({ existingAnnouncementKeys: [] });

      // Generate keys and check existence
      const adKeyPairs = ads.map((ad) => ({
        ad,
        key: generateDeduplicationKey(ad),
      }));

      const existenceMap = await batchCheckExists(firestore, adKeyPairs.map((p) => p.key));
      const newAdPairs = adKeyPairs.filter((p) => !existenceMap.get(p.key));

      // Geocode - should skip for empty/whitespace
      const results = [];
      for (const { ad } of newAdPairs) {
        const geo = await resolveLocation(ad.locationText, firestore);
        results.push(geo);
      }

      // Both should return null coordinates without calling Nominatim
      expect(results[0]).toEqual({ latitude: null, longitude: null, fromCache: false });
      expect(results[1]).toEqual({ latitude: null, longitude: null, fromCache: false });
      expect(mockNominatimQuery).not.toHaveBeenCalled();
    });

    it('splits large sets of ads into multiple batches', async () => {
      // Create 1200 items to verify batch splitting
      const items = Array.from({ length: 1200 }, (_, i) => ({
        key: `key-${i}`,
        data: { title: `Ad ${i}` },
      }));

      const batches = splitIntoBatches(items, 500);

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(500);
      expect(batches[1]).toHaveLength(500);
      expect(batches[2]).toHaveLength(200);

      // Verify order is preserved
      expect(batches[0][0].key).toBe('key-0');
      expect(batches[0][499].key).toBe('key-499');
      expect(batches[1][0].key).toBe('key-500');
      expect(batches[2][199].key).toBe('key-1199');
    });
  });

  describe('geocoding with cache integration', () => {
    it('uses cached coordinates when geo_cache has a hit', async () => {
      const firestore = createMockFirestore({
        existingAnnouncementKeys: [],
        geoCacheEntries: {
          'szczecin centrum': {
            latitude: 53.4285,
            longitude: 14.5528,
            resolved_at: new Date('2024-06-10T00:00:00Z'), // 5 days ago, within TTL
          },
        },
      });

      const ad = createScrapedAd({ nativeId: 'olx-cached', locationText: 'Szczecin Centrum' });
      const geo = await resolveLocation(ad.locationText, firestore);

      expect(geo).toEqual({ latitude: 53.4285, longitude: 14.5528, fromCache: true });
      expect(mockNominatimQuery).not.toHaveBeenCalled();
    });

    it('queries Nominatim on cache miss and stores result', async () => {
      const firestore = createMockFirestore({
        existingAnnouncementKeys: [],
        geoCacheEntries: {},
      });

      mockNominatimQuery.mockResolvedValueOnce({ lat: 53.45, lng: 14.58 });

      const ad = createScrapedAd({ nativeId: 'olx-miss', locationText: 'Szczecin Dąbie' });
      const geo = await resolveLocation(ad.locationText, firestore);

      expect(geo).toEqual({ latitude: 53.45, longitude: 14.58, fromCache: false });
      expect(mockNominatimQuery).toHaveBeenCalledTimes(1);

      // Verify the result was written to geo_cache
      const geoCacheWrites = firestore._writtenDocs.filter(
        (d: any) => d.collection === 'geo_cache'
      );
      expect(geoCacheWrites).toHaveLength(1);
      expect(geoCacheWrites[0].data.latitude).toBe(53.45);
      expect(geoCacheWrites[0].data.longitude).toBe(14.58);
    });
  });
});
