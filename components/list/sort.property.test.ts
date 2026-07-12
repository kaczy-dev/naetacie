import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sortByScrapedAtDesc } from './sort';
import type { Announcement } from '@/lib/types/announcement';

/**
 * Feature: construction-ads-aggregator, Property 12: Announcement list sort order
 * Validates: Requirements 10.1
 *
 * For any list of announcements returned by the list view,
 * for every consecutive pair (a[i], a[i+1]),
 * a[i].scraped_at >= a[i+1].scraped_at (descending order).
 */

const sourcePortalArb = fc.constantFrom('olx' as const, 'oferteo' as const, 'fixly' as const);

const announcementArb: fc.Arbitrary<Announcement> = fc.record({
  deduplication_key: fc.string({ minLength: 1 }),
  title: fc.string(),
  description: fc.string(),
  source_url: fc.webUrl(),
  source_portal: sourcePortalArb,
  category: fc.string(),
  location_text: fc.string(),
  latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
  longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
  price: fc.option(fc.double({ min: 0, max: 1_000_000, noNaN: true }), { nil: null }),
  contact_info: fc.option(fc.string(), { nil: null }),
  scraped_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  published_at: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: null }),
});

describe('Property 12: Announcement list sort order', () => {
  it('for all consecutive pairs, a[i].scraped_at >= a[i+1].scraped_at (descending order)', () => {
    fc.assert(
      fc.property(
        fc.array(announcementArb, { minLength: 0, maxLength: 50 }),
        (announcements) => {
          const sorted = sortByScrapedAtDesc(announcements);

          // Verify descending order for all consecutive pairs
          for (let i = 0; i < sorted.length - 1; i++) {
            const currentTime = sorted[i].scraped_at.getTime();
            const nextTime = sorted[i + 1].scraped_at.getTime();
            expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sorted output contains the same elements as input', () => {
    fc.assert(
      fc.property(
        fc.array(announcementArb, { minLength: 0, maxLength: 50 }),
        (announcements) => {
          const sorted = sortByScrapedAtDesc(announcements);

          // Same length
          expect(sorted.length).toBe(announcements.length);

          // Same elements (by deduplication_key, since that's the identity)
          const inputKeys = announcements.map((a) => a.deduplication_key).sort();
          const outputKeys = sorted.map((a) => a.deduplication_key).sort();
          expect(outputKeys).toEqual(inputKeys);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(announcementArb, { minLength: 1, maxLength: 20 }),
        (announcements) => {
          const originalOrder = announcements.map((a) => a.deduplication_key);
          sortByScrapedAtDesc(announcements);
          const afterOrder = announcements.map((a) => a.deduplication_key);
          expect(afterOrder).toEqual(originalOrder);
        }
      ),
      { numRuns: 100 }
    );
  });
});
