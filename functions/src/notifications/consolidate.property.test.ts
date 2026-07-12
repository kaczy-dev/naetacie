import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { consolidateForEmail } from './consolidate';
import { Announcement, SourcePortal } from '../../../lib/types/announcement';

/**
 * Feature: construction-ads-aggregator, Property 8: Notification consolidation respects maximum
 * Validates: Requirements 6.6
 */
describe('Property 8: Notification consolidation respects maximum', () => {
  const sourcePortalArb: fc.Arbitrary<SourcePortal> = fc.constantFrom('olx', 'oferteo', 'fixly');

  const announcementArb: fc.Arbitrary<Announcement> = fc.record({
    deduplication_key: fc.string({ minLength: 1 }),
    title: fc.string(),
    description: fc.string(),
    source_url: fc.webUrl(),
    source_portal: sourcePortalArb,
    category: fc.string(),
    location_text: fc.string(),
    latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }), { nil: null }),
    longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }), { nil: null }),
    price: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true, noDefaultInfinity: true }), { nil: null }),
    contact_info: fc.option(fc.string(), { nil: null }),
    scraped_at: fc.date(),
    published_at: fc.option(fc.date(), { nil: null }),
  });

  const announcementListArb = fc.array(announcementArb, { minLength: 0, maxLength: 100 });

  it('output length equals min(input.length, 10)', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = consolidateForEmail(announcements);
        expect(result.length).toBe(Math.min(announcements.length, 10));
      }),
      { numRuns: 100 }
    );
  });

  it('returned items are the first 10 items from input preserving order', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = consolidateForEmail(announcements);
        const expected = announcements.slice(0, 10);

        expect(result).toEqual(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('order is preserved — each result item matches the input at the same index', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = consolidateForEmail(announcements);

        for (let i = 0; i < result.length; i++) {
          expect(result[i]).toBe(announcements[i]);
        }
      }),
      { numRuns: 100 }
    );
  });
});
