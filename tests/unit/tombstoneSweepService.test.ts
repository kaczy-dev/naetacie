import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runTombstoneSweep } from '@/lib/verification/tombstoneSweep';

// Mock Firestore
vi.mock('@/lib/firebase/admin', () => {
  const mockDocs = [
    {
      id: 'doc-active-1',
      ref: { path: 'announcements/doc-active-1' },
      data: () => ({
        source_url: 'https://olx.pl/oferta/1',
        source_portal: 'olx',
        published_at: new Date().toISOString(),
      }),
    },
    {
      id: 'doc-old-2',
      ref: { path: 'announcements/doc-old-2' },
      data: () => ({
        source_url: 'https://pracuj.pl/oferta/2',
        source_portal: 'pracuj',
        published_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days old
      }),
    },
    {
      id: 'doc-dead-3',
      ref: { path: 'announcements/doc-dead-3' },
      data: () => ({
        source_url: 'https://olx.pl/oferta/dead',
        source_portal: 'olx',
        published_at: new Date().toISOString(),
      }),
    },
  ];

  const mockBatch = {
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(true),
  };

  const mockCollection = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({
        empty: false,
        docs: mockDocs,
      }),
    }),
  };

  return {
    adminFirestore: {
      collection: vi.fn().mockReturnValue(mockCollection),
      batch: vi.fn().mockReturnValue(mockBatch),
    },
  };
});

// Mock availability checker
vi.mock('@/lib/verification/offerAvailability', () => ({
  checkOfferAge: vi.fn().mockImplementation((ad) => {
    const pub = ad.published_at;
    if (pub && Date.now() - new Date(pub).getTime() > 30 * 24 * 60 * 60 * 1000) {
      return { valid: false, details: 'Expired age threshold' };
    }
    return { valid: true };
  }),
  checkLiveHttpAvailability: vi.fn().mockImplementation(async (url) => {
    if (url.includes('dead')) {
      return { isAvailable: false, reason: 'HTTP_NOT_FOUND', details: 'Status 404' };
    }
    return { isAvailable: true };
  }),
}));

describe('Tombstone Sweep Service', () => {
  it('correctly discovers expired and 404 listings and marks them inactive', async () => {
    const result = await runTombstoneSweep({ limit: 10, maxAgeDays: 30 });

    expect(result.probedCount).toBe(3);
    expect(result.expiredCount).toBe(2); // doc-old-2 (age) + doc-dead-3 (404)
    expect(result.activeCount).toBe(1);  // doc-active-1
    expect(result.expiredItems.length).toBe(2);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
