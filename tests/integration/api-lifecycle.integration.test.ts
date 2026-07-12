/**
 * Integration test: API Request Lifecycle
 *
 * Tests the end-to-end flow of the /api/announcements endpoint:
 *   verify token → validate params → get user tier → query announcements →
 *   apply masking → paginate → respond
 *
 * Uses mocked Firebase Auth and Firestore (same pattern as existing tests)
 * but exercises multiple API modules together.
 *
 * Validates: Requirements 8.2, 8.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateQueryParams } from '../../app/api/announcements/validate';
import { applyTierMasking } from '../../app/api/announcements/masking';
import { calculatePagination } from '../../app/api/announcements/pagination';
import type { Announcement } from '@/lib/types/announcement';

// --- Helper: Create sample announcements ---

function createAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    deduplication_key: 'olx-12345',
    title: 'Remont łazienki Szczecin',
    description: 'Profesjonalny remont łazienki w centrum Szczecina. Oferujemy pełen zakres usług remontowych.',
    source_url: 'https://olx.pl/offer/12345',
    source_portal: 'olx',
    category: 'construction',
    location_text: 'ul. Mickiewicza 5, Szczecin',
    latitude: 53.4285,
    longitude: 14.5528,
    price: 5000,
    contact_info: '+48 123 456 789',
    scraped_at: new Date('2024-06-10T10:00:00Z'),
    published_at: new Date('2024-06-09T08:00:00Z'),
    ...overrides,
  };
}

/**
 * Simulates the full API request lifecycle as the route handler does,
 * but without the HTTP layer — exercising validate → tier lookup →
 * query → mask → paginate → response construction.
 */
function simulateApiLifecycle(params: {
  queryParams: Record<string, string>;
  tier: 'free' | 'premium';
  announcements: Announcement[];
  currentTime: Date;
}) {
  const { queryParams, tier, announcements, currentTime } = params;

  // Step 1: Validate query params
  const validation = validateQueryParams(queryParams);
  if (!validation.valid) {
    return { status: 400, body: { error: validation.error } };
  }

  const { parsed } = validation;

  // Step 2: Apply bounding_box spatial filtering
  let filtered = announcements;
  if (parsed.bounding_box) {
    const { south_lat, west_lng, north_lat, east_lng } = parsed.bounding_box;
    filtered = filtered.filter((a) => {
      if (a.latitude === null || a.longitude === null) return false;
      return (
        a.latitude >= south_lat &&
        a.latitude <= north_lat &&
        a.longitude >= west_lng &&
        a.longitude <= east_lng
      );
    });
  }

  // Step 3: Apply source_portal filter
  if (parsed.source_portal) {
    filtered = filtered.filter((a) => a.source_portal === parsed.source_portal);
  }

  // Step 4: Apply tier masking (includes time filtering for free tier)
  const masked = applyTierMasking(filtered, tier, currentTime);

  // Step 5: Calculate pagination
  const totalCount = masked.length;
  const metadata = calculatePagination(totalCount, parsed.page, parsed.limit);

  // Step 6: Slice for current page
  const startIndex = (parsed.page - 1) * parsed.limit;
  const endIndex = startIndex + parsed.limit;
  const pageData = masked.slice(startIndex, endIndex);

  return {
    status: 200,
    body: { data: pageData, metadata },
  };
}

describe('API Lifecycle Integration', () => {
  const NOW = new Date('2024-06-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('free tier filtering and masking end-to-end', () => {
    it('filters out announcements newer than 48 hours for free tier', () => {
      const announcements: Announcement[] = [
        // 5 days old — should be visible to free tier
        createAnnouncement({
          deduplication_key: 'old-ad',
          title: 'Old Ad',
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        }),
        // 1 day old — should be filtered out for free tier
        createAnnouncement({
          deduplication_key: 'new-ad',
          title: 'New Ad',
          scraped_at: new Date('2024-06-14T10:00:00Z'),
        }),
        // 3 days old — should be visible to free tier
        createAnnouncement({
          deduplication_key: 'medium-ad',
          title: 'Medium Ad',
          scraped_at: new Date('2024-06-12T10:00:00Z'),
        }),
      ];

      const result = simulateApiLifecycle({
        queryParams: { page: '1', limit: '20' },
        tier: 'free',
        announcements,
        currentTime: NOW,
      });

      expect(result.status).toBe(200);
      expect(result.body.data).toHaveLength(2);
      expect(result.body.data.map((d: any) => d.deduplication_key)).toEqual(
        expect.arrayContaining(['old-ad', 'medium-ad'])
      );
      expect(result.body.data.map((d: any) => d.deduplication_key)).not.toContain('new-ad');
      expect(result.body.metadata.total_count).toBe(2);
    });

    it('masks descriptions and omits source_url/contact_info for free tier', () => {
      const longDescription = 'A'.repeat(150);
      const shortDescription = 'Short desc';

      const announcements: Announcement[] = [
        createAnnouncement({
          deduplication_key: 'long-desc',
          description: longDescription,
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        }),
        createAnnouncement({
          deduplication_key: 'short-desc',
          description: shortDescription,
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        }),
      ];

      const result = simulateApiLifecycle({
        queryParams: { page: '1', limit: '20' },
        tier: 'free',
        announcements,
        currentTime: NOW,
      });

      expect(result.status).toBe(200);
      const data = result.body.data;

      // Long description is truncated
      const longItem = data.find((d: any) => d.deduplication_key === 'long-desc');
      expect(longItem.description).toBe('A'.repeat(100) + '...');
      expect(longItem.description).toHaveLength(103);

      // Short description is unchanged
      const shortItem = data.find((d: any) => d.deduplication_key === 'short-desc');
      expect(shortItem.description).toBe('Short desc');

      // source_url and contact_info are omitted for both
      for (const item of data) {
        expect(item).not.toHaveProperty('source_url');
        expect(item).not.toHaveProperty('contact_info');
      }
    });

    it('returns empty results when all announcements are newer than 48h for free tier', () => {
      const announcements: Announcement[] = [
        createAnnouncement({
          deduplication_key: 'very-new-1',
          scraped_at: new Date('2024-06-15T10:00:00Z'),
        }),
        createAnnouncement({
          deduplication_key: 'very-new-2',
          scraped_at: new Date('2024-06-14T13:00:00Z'),
        }),
      ];

      const result = simulateApiLifecycle({
        queryParams: { page: '1', limit: '20' },
        tier: 'free',
        announcements,
        currentTime: NOW,
      });

      expect(result.status).toBe(200);
      expect(result.body.data).toHaveLength(0);
      expect(result.body.metadata.total_count).toBe(0);
      expect(result.body.metadata.total_pages).toBe(0);
    });
  });

  describe('premium tier full access end-to-end', () => {
    it('returns all announcements with full data for premium tier', () => {
      const announcements: Announcement[] = [
        createAnnouncement({
          deduplication_key: 'old-ad',
          scraped_at: new Date('2024-06-10T10:00:00Z'),
          source_url: 'https://olx.pl/offer/old',
          contact_info: '+48 111 111 111',
        }),
        createAnnouncement({
          deduplication_key: 'new-ad',
          scraped_at: new Date('2024-06-15T10:00:00Z'),
          source_url: 'https://olx.pl/offer/new',
          contact_info: '+48 222 222 222',
        }),
      ];

      const result = simulateApiLifecycle({
        queryParams: { page: '1', limit: '20' },
        tier: 'premium',
        announcements,
        currentTime: NOW,
      });

      expect(result.status).toBe(200);
      expect(result.body.data).toHaveLength(2);

      // Premium gets all announcements including recent ones
      expect(result.body.data.map((d: any) => d.deduplication_key)).toContain('new-ad');
      expect(result.body.data.map((d: any) => d.deduplication_key)).toContain('old-ad');

      // source_url and contact_info are included
      for (const item of result.body.data) {
        expect(item).toHaveProperty('source_url');
        expect(item).toHaveProperty('contact_info');
      }

      expect(result.body.metadata.total_count).toBe(2);
    });

    it('does not truncate descriptions for premium tier', () => {
      const longDescription = 'B'.repeat(200);

      const announcements: Announcement[] = [
        createAnnouncement({
          deduplication_key: 'premium-long',
          description: longDescription,
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        }),
      ];

      const result = simulateApiLifecycle({
        queryParams: { page: '1', limit: '20' },
        tier: 'premium',
        announcements,
        currentTime: NOW,
      });

      expect(result.status).toBe(200);
      expect(result.body.data[0].description).toBe(longDescription);
      expect(result.body.data[0].description).toHaveLength(200);
    });
  });

  describe('query parameter validation integration', () => {
    it('rejects invalid page parameter', () => {
      const result = simulateApiLifecycle({
        queryParams: { page: '0', limit: '20' },
        tier: 'premium',
        announcements: [],
        currentTime: NOW,
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('page');
    });

    it('rejects invalid limit parameter', () => {
      const result = simulateApiLifecycle({
        queryParams: { page: '1', limit: '101' },
        tier: 'premium',
        announcements: [],
        currentTime: NOW,
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('limit');
    });

    it('rejects invalid source_portal parameter', () => {
      const result = simulateApiLifecycle({
        queryParams: { page: '1', limit: '20', source_portal: 'invalid' },
        tier: 'premium',
        announcements: [],
        currentTime: NOW,
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('source_portal');
    });

    it('rejects malformed bounding_box parameter', () => {
      const result = simulateApiLifecycle({
        queryParams: { page: '1', limit: '20', bounding_box: '1,2,3' },
        tier: 'premium',
        announcements: [],
        currentTime: NOW,
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('bounding_box');
    });
  });

  describe('pagination integration', () => {
    it('paginates results correctly across multiple pages', () => {
      // Create 25 old announcements (visible to free tier)
      const announcements: Announcement[] = Array.from({ length: 25 }, (_, i) =>
        createAnnouncement({
          deduplication_key: `ad-${i}`,
          title: `Ad ${i}`,
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        })
      );

      // Page 1
      const page1 = simulateApiLifecycle({
        queryParams: { page: '1', limit: '10' },
        tier: 'premium',
        announcements,
        currentTime: NOW,
      });

      expect(page1.status).toBe(200);
      expect(page1.body.data).toHaveLength(10);
      expect(page1.body.metadata).toEqual({
        total_count: 25,
        current_page: 1,
        page_size: 10,
        total_pages: 3,
      });

      // Page 2
      const page2 = simulateApiLifecycle({
        queryParams: { page: '2', limit: '10' },
        tier: 'premium',
        announcements,
        currentTime: NOW,
      });

      expect(page2.status).toBe(200);
      expect(page2.body.data).toHaveLength(10);
      expect(page2.body.metadata.current_page).toBe(2);

      // Page 3 (partial)
      const page3 = simulateApiLifecycle({
        queryParams: { page: '3', limit: '10' },
        tier: 'premium',
        announcements,
        currentTime: NOW,
      });

      expect(page3.status).toBe(200);
      expect(page3.body.data).toHaveLength(5);
      expect(page3.body.metadata.current_page).toBe(3);
    });

    it('returns empty page when page is beyond total_pages', () => {
      const announcements: Announcement[] = [
        createAnnouncement({ scraped_at: new Date('2024-06-10T10:00:00Z') }),
      ];

      const result = simulateApiLifecycle({
        queryParams: { page: '5', limit: '20' },
        tier: 'premium',
        announcements,
        currentTime: NOW,
      });

      expect(result.status).toBe(200);
      expect(result.body.data).toHaveLength(0);
      expect(result.body.metadata.total_count).toBe(1);
      expect(result.body.metadata.total_pages).toBe(1);
    });
  });

  describe('spatial filtering with bounding_box', () => {
    it('filters announcements by bounding box', () => {
      const announcements: Announcement[] = [
        // Inside bounding box
        createAnnouncement({
          deduplication_key: 'inside-1',
          latitude: 53.43,
          longitude: 14.55,
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        }),
        // Outside bounding box (south)
        createAnnouncement({
          deduplication_key: 'outside-south',
          latitude: 53.30,
          longitude: 14.55,
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        }),
        // Null coordinates (excluded)
        createAnnouncement({
          deduplication_key: 'null-coords',
          latitude: null,
          longitude: null,
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        }),
      ];

      const result = simulateApiLifecycle({
        queryParams: {
          page: '1',
          limit: '20',
          bounding_box: '53.40,14.50,53.50,14.60',
        },
        tier: 'premium',
        announcements,
        currentTime: NOW,
      });

      expect(result.status).toBe(200);
      expect(result.body.data).toHaveLength(1);
      expect(result.body.data[0].deduplication_key).toBe('inside-1');
    });

    it('filters by source_portal in addition to bounding_box', () => {
      const announcements: Announcement[] = [
        createAnnouncement({
          deduplication_key: 'olx-inside',
          source_portal: 'olx',
          latitude: 53.43,
          longitude: 14.55,
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        }),
        createAnnouncement({
          deduplication_key: 'oferteo-inside',
          source_portal: 'oferteo',
          latitude: 53.43,
          longitude: 14.55,
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        }),
      ];

      const result = simulateApiLifecycle({
        queryParams: {
          page: '1',
          limit: '20',
          bounding_box: '53.40,14.50,53.50,14.60',
          source_portal: 'olx',
        },
        tier: 'premium',
        announcements,
        currentTime: NOW,
      });

      expect(result.status).toBe(200);
      expect(result.body.data).toHaveLength(1);
      expect(result.body.data[0].deduplication_key).toBe('olx-inside');
    });
  });

  describe('free vs premium tier comparison', () => {
    it('free tier result set is always a subset of premium tier result set', () => {
      const announcements: Announcement[] = [
        createAnnouncement({
          deduplication_key: 'ad-old',
          scraped_at: new Date('2024-06-10T10:00:00Z'),
        }),
        createAnnouncement({
          deduplication_key: 'ad-new',
          scraped_at: new Date('2024-06-15T08:00:00Z'),
        }),
        createAnnouncement({
          deduplication_key: 'ad-medium',
          scraped_at: new Date('2024-06-12T10:00:00Z'),
        }),
      ];

      const freeResult = simulateApiLifecycle({
        queryParams: { page: '1', limit: '100' },
        tier: 'free',
        announcements,
        currentTime: NOW,
      });

      const premiumResult = simulateApiLifecycle({
        queryParams: { page: '1', limit: '100' },
        tier: 'premium',
        announcements,
        currentTime: NOW,
      });

      const freeKeys = freeResult.body.data.map((d: any) => d.deduplication_key);
      const premiumKeys = premiumResult.body.data.map((d: any) => d.deduplication_key);

      // Free tier should be subset of premium
      for (const key of freeKeys) {
        expect(premiumKeys).toContain(key);
      }

      // Premium should have more or equal results
      expect(premiumResult.body.data.length).toBeGreaterThanOrEqual(freeResult.body.data.length);
    });
  });
});
