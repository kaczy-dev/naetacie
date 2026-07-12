import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { applyTierMasking } from './masking';
import type { Announcement, SourcePortal } from '@/lib/types/announcement';

/**
 * Feature: construction-ads-aggregator, Property 5: Tier-based time filtering
 * Validates: Requirements 5.1, 5.3, 8.6, 8.7
 *
 * For any list of announcements and any reference timestamp:
 * - Free tier returns only announcements where scraped_at is more than 48h before the reference time
 * - Premium tier returns all announcements
 * - The free tier result set is always a subset of the premium tier result set
 */

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

const sourcePortalArb: fc.Arbitrary<SourcePortal> = fc.constantFrom('olx', 'oferteo', 'fixly');

const announcementArb = (referenceTime: Date): fc.Arbitrary<Announcement> =>
  fc
    .record({
      deduplication_key: fc.string({ minLength: 1, maxLength: 50 }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      description: fc.string({ minLength: 0, maxLength: 500 }),
      source_url: fc.webUrl(),
      source_portal: sourcePortalArb,
      category: fc.string({ minLength: 1, maxLength: 50 }),
      location_text: fc.string({ minLength: 1, maxLength: 100 }),
      latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
      longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
      price: fc.option(fc.double({ min: 0, max: 100000, noNaN: true }), { nil: null }),
      contact_info: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
      // Generate scraped_at spanning both sides of the 48h boundary
      scraped_at: fc
        .integer({ min: -100 * 60 * 60 * 1000, max: 10 * 60 * 60 * 1000 })
        .map((offset) => new Date(referenceTime.getTime() - FORTY_EIGHT_HOURS_MS + offset)),
      published_at: fc.option(fc.date(), { nil: null }),
    });

const referenceTimeArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-01-01'),
});

describe('Property 5: Tier-based time filtering', () => {
  it('free tier returns only announcements where scraped_at is more than 48h before reference time', () => {
    fc.assert(
      fc.property(
        referenceTimeArb,
        fc.array(fc.constant(null), { minLength: 1, maxLength: 20 }).chain((_arr) =>
          referenceTimeArb.chain((refTime) =>
            fc.array(announcementArb(refTime), { minLength: 1, maxLength: 20 }).map(
              (announcements) => ({ announcements, refTime })
            )
          )
        ),
        (_, { announcements, refTime }) => {
          const freeResult = applyTierMasking(announcements, 'free', refTime);
          const cutoffTime = refTime.getTime() - FORTY_EIGHT_HOURS_MS;

          // Every returned announcement must have scraped_at < cutoffTime
          for (const masked of freeResult) {
            expect(masked.scraped_at.getTime()).toBeLessThan(cutoffTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('free tier does not miss any announcements older than 48h', () => {
    fc.assert(
      fc.property(
        referenceTimeArb.chain((refTime) =>
          fc.array(announcementArb(refTime), { minLength: 1, maxLength: 20 }).map(
            (announcements) => ({ announcements, refTime })
          )
        ),
        ({ announcements, refTime }) => {
          const freeResult = applyTierMasking(announcements, 'free', refTime);
          const cutoffTime = refTime.getTime() - FORTY_EIGHT_HOURS_MS;

          // Count how many input announcements are older than 48h
          const expectedCount = announcements.filter(
            (a) => a.scraped_at.getTime() < cutoffTime
          ).length;

          expect(freeResult.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('premium tier returns all announcements regardless of scraped_at', () => {
    fc.assert(
      fc.property(
        referenceTimeArb.chain((refTime) =>
          fc.array(announcementArb(refTime), { minLength: 0, maxLength: 20 }).map(
            (announcements) => ({ announcements, refTime })
          )
        ),
        ({ announcements, refTime }) => {
          const premiumResult = applyTierMasking(announcements, 'premium', refTime);
          expect(premiumResult.length).toBe(announcements.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('free tier result set is always a subset of premium tier result set (by deduplication_key)', () => {
    fc.assert(
      fc.property(
        referenceTimeArb.chain((refTime) =>
          fc.array(announcementArb(refTime), { minLength: 0, maxLength: 20 }).map(
            (announcements) => ({ announcements, refTime })
          )
        ),
        ({ announcements, refTime }) => {
          const freeResult = applyTierMasking(announcements, 'free', refTime);
          const premiumResult = applyTierMasking(announcements, 'premium', refTime);

          const premiumKeys = new Set(premiumResult.map((a) => a.deduplication_key));
          for (const freeAd of freeResult) {
            expect(premiumKeys.has(freeAd.deduplication_key)).toBe(true);
          }

          // Free tier can never return more items than premium
          expect(freeResult.length).toBeLessThanOrEqual(premiumResult.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: construction-ads-aggregator, Property 6: Free-tier description masking
 * Validates: Requirements 5.2
 *
 * For any announcement:
 * - If description.length > 100: free tier truncates to first 100 chars + "..."
 * - If description.length ≤ 100: free tier keeps description unchanged
 * - Free tier result never contains source_url or contact_info fields
 */
describe('Property 6: Free-tier description masking', () => {
  // Create announcements guaranteed to be older than 48h so they pass the time filter
  const oldAnnouncementArb = (descArb: fc.Arbitrary<string>): fc.Arbitrary<{ announcement: Announcement; refTime: Date }> =>
    fc.record({
      deduplication_key: fc.string({ minLength: 1, maxLength: 50 }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      description: descArb,
      source_url: fc.webUrl(),
      source_portal: sourcePortalArb,
      category: fc.string({ minLength: 1, maxLength: 50 }),
      location_text: fc.string({ minLength: 1, maxLength: 100 }),
      latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
      longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
      price: fc.option(fc.double({ min: 0, max: 100000, noNaN: true }), { nil: null }),
      contact_info: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
      scraped_at: fc.constant(new Date('2020-01-01T00:00:00Z')),
      published_at: fc.option(fc.date(), { nil: null }),
    }).map((announcement) => ({
      announcement,
      // Reference time well after the announcement's scraped_at (way more than 48h)
      refTime: new Date('2025-01-01T00:00:00Z'),
    }));

  it('descriptions > 100 chars are truncated to first 100 chars + "..."', () => {
    const longDescArb = fc.string({ minLength: 101, maxLength: 1000 });

    fc.assert(
      fc.property(oldAnnouncementArb(longDescArb), ({ announcement, refTime }) => {
        const [result] = applyTierMasking([announcement], 'free', refTime);

        expect(result.description).toHaveLength(103); // 100 chars + "..."
        expect(result.description).toBe(announcement.description.slice(0, 100) + '...');
      }),
      { numRuns: 100 }
    );
  });

  it('descriptions ≤ 100 chars are kept unchanged', () => {
    const shortDescArb = fc.string({ minLength: 0, maxLength: 100 });

    fc.assert(
      fc.property(oldAnnouncementArb(shortDescArb), ({ announcement, refTime }) => {
        const [result] = applyTierMasking([announcement], 'free', refTime);

        expect(result.description).toBe(announcement.description);
      }),
      { numRuns: 100 }
    );
  });

  it('free tier results never contain source_url or contact_info fields', () => {
    const anyDescArb = fc.string({ minLength: 0, maxLength: 500 });

    fc.assert(
      fc.property(oldAnnouncementArb(anyDescArb), ({ announcement, refTime }) => {
        const [result] = applyTierMasking([announcement], 'free', refTime);

        // source_url and contact_info must not be present as own properties
        expect('source_url' in result).toBe(false);
        expect('contact_info' in result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('premium tier always preserves full description unchanged', () => {
    const anyDescArb = fc.string({ minLength: 0, maxLength: 1000 });

    fc.assert(
      fc.property(
        fc.record({
          deduplication_key: fc.string({ minLength: 1, maxLength: 50 }),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: anyDescArb,
          source_url: fc.webUrl(),
          source_portal: sourcePortalArb,
          category: fc.string({ minLength: 1, maxLength: 50 }),
          location_text: fc.string({ minLength: 1, maxLength: 100 }),
          latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
          longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
          price: fc.option(fc.double({ min: 0, max: 100000, noNaN: true }), { nil: null }),
          contact_info: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
          scraped_at: fc.constant(new Date('2020-01-01T00:00:00Z')),
          published_at: fc.option(fc.date(), { nil: null }),
        }),
        (announcement) => {
          const refTime = new Date('2025-01-01T00:00:00Z');
          const [result] = applyTierMasking([announcement], 'premium', refTime);

          expect(result.description).toBe(announcement.description);
          expect(result.source_url).toBe(announcement.source_url);
          expect(result.contact_info).toBe(announcement.contact_info);
        }
      ),
      { numRuns: 100 }
    );
  });
});
