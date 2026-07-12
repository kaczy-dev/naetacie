import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterGeocodedAnnouncements } from './utils';
import { MaskedAnnouncement, SourcePortal } from '@/lib/types/announcement';

/**
 * Feature: construction-ads-aggregator, Property 9: Map marker coordinate filtering
 * Validates: Requirements 7.2
 */
describe('Property 9: Map marker coordinate filtering', () => {
  const sourcePortalArb: fc.Arbitrary<SourcePortal> = fc.constantFrom('olx', 'oferteo', 'fixly');

  const maskedAnnouncementArb: fc.Arbitrary<MaskedAnnouncement> = fc.record({
    deduplication_key: fc.string({ minLength: 1 }),
    title: fc.string(),
    description: fc.string(),
    source_portal: sourcePortalArb,
    category: fc.string(),
    location_text: fc.string(),
    latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }), { nil: null }),
    longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }), { nil: null }),
    price: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true, noDefaultInfinity: true }), { nil: null }),
    scraped_at: fc.date(),
    published_at: fc.option(fc.date(), { nil: null }),
    source_url: fc.option(fc.webUrl(), { nil: undefined }),
    contact_info: fc.option(fc.string(), { nil: null }),
  });

  const announcementListArb = fc.array(maskedAnnouncementArb, { minLength: 0, maxLength: 50 });

  it('returns only announcements where both latitude and longitude are non-null', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = filterGeocodedAnnouncements(announcements);

        for (const item of result) {
          expect(item.latitude).not.toBeNull();
          expect(item.longitude).not.toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('no announcement with null latitude appears in the output', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = filterGeocodedAnnouncements(announcements);

        const hasNullLat = result.some((a) => a.latitude === null);
        expect(hasNullLat).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('no announcement with null longitude appears in the output', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = filterGeocodedAnnouncements(announcements);

        const hasNullLng = result.some((a) => a.longitude === null);
        expect(hasNullLng).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('all announcements with both non-null coordinates are included in the output', () => {
    fc.assert(
      fc.property(announcementListArb, (announcements) => {
        const result = filterGeocodedAnnouncements(announcements);
        const expected = announcements.filter(
          (a) => a.latitude !== null && a.longitude !== null
        );

        expect(result.length).toBe(expected.length);

        for (let i = 0; i < result.length; i++) {
          expect(result[i]).toBe(expected[i]);
        }
      }),
      { numRuns: 100 }
    );
  });
});
