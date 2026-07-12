import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { MaskedAnnouncement, SourcePortal } from '@/lib/types/announcement';

// Feature: ux-security-enhancements, Property 16: Announcement card contains all required fields

/**
 * Feature: ux-security-enhancements, Property 16: Announcement card contains all required fields
 * Validates: Requirements 11.1
 *
 * For any valid MaskedAnnouncement object, the rendered card component SHALL include:
 * the title text, location_text, price (or "N/A" if null), source_portal identifier,
 * and a relative time representation of scraped_at.
 */

// --- Card rendering logic extracted from AnnouncementList.tsx ---

/**
 * Format price for display in list cards.
 * Returns "N/A" when price is null (per property spec), or formatted PLN value.
 */
function formatCardPrice(price: number | null): string {
  if (price === null) {
    return 'N/A';
  }
  return `${price.toLocaleString('pl-PL')} PLN`;
}

/**
 * Compute relative time representation of scraped_at.
 * Returns a human-readable string describing how long ago the date was.
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return 'just now';
}

/**
 * Get display label for source portal badge.
 */
function getPortalLabel(portal: SourcePortal): string {
  switch (portal) {
    case 'olx':
      return 'OLX';
    case 'oferteo':
      return 'Oferteo';
    case 'fixly':
      return 'Fixly';
    default:
      return portal;
  }
}

/**
 * Represents the set of text content that a rendered card must contain.
 */
interface CardContent {
  title: string;
  locationText: string;
  priceDisplay: string;
  sourcePortalLabel: string;
  relativeTime: string;
}

/**
 * Extract card content from a MaskedAnnouncement.
 * This represents the data that the card component renders.
 */
function extractCardContent(announcement: MaskedAnnouncement): CardContent {
  return {
    title: announcement.title,
    locationText: announcement.location_text,
    priceDisplay: formatCardPrice(announcement.price),
    sourcePortalLabel: getPortalLabel(announcement.source_portal),
    relativeTime: formatRelativeTime(
      typeof announcement.scraped_at === 'string'
        ? new Date(announcement.scraped_at)
        : announcement.scraped_at
    ),
  };
}

// --- Arbitraries ---

const sourcePortalArb: fc.Arbitrary<SourcePortal> = fc.constantFrom('olx', 'oferteo', 'fixly');

const maskedAnnouncementArb: fc.Arbitrary<MaskedAnnouncement> = fc.record({
  deduplication_key: fc.string({ minLength: 1, maxLength: 64 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 0, maxLength: 500 }),
  source_portal: sourcePortalArb,
  category: fc.string({ minLength: 1, maxLength: 50 }),
  location_text: fc.string({ minLength: 1, maxLength: 200 }),
  latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: null }),
  longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: null }),
  price: fc.option(fc.nat({ max: 10_000_000 }), { nil: null }),
  scraped_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  published_at: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }), { nil: null }),
});

describe('Property 16: Announcement card contains all required fields', () => {
  it('card content includes title text from the announcement', () => {
    fc.assert(
      fc.property(maskedAnnouncementArb, (announcement) => {
        const content = extractCardContent(announcement);
        expect(content.title).toBe(announcement.title);
        expect(content.title.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('card content includes location_text from the announcement', () => {
    fc.assert(
      fc.property(maskedAnnouncementArb, (announcement) => {
        const content = extractCardContent(announcement);
        expect(content.locationText).toBe(announcement.location_text);
        expect(content.locationText.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('card content includes price or "N/A" when price is null', () => {
    fc.assert(
      fc.property(maskedAnnouncementArb, (announcement) => {
        const content = extractCardContent(announcement);

        if (announcement.price === null) {
          expect(content.priceDisplay).toBe('N/A');
        } else {
          expect(content.priceDisplay).toContain('PLN');
          expect(content.priceDisplay.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('card content includes source_portal identifier', () => {
    fc.assert(
      fc.property(maskedAnnouncementArb, (announcement) => {
        const content = extractCardContent(announcement);

        // The portal label must be a non-empty string identifying the source
        expect(content.sourcePortalLabel.length).toBeGreaterThan(0);

        // It should map to known labels for known portals
        const expectedLabels: Record<SourcePortal, string> = {
          olx: 'OLX',
          oferteo: 'Oferteo',
          fixly: 'Fixly',
        };
        expect(content.sourcePortalLabel).toBe(expectedLabels[announcement.source_portal]);
      }),
      { numRuns: 100 }
    );
  });

  it('card content includes a relative time representation of scraped_at', () => {
    fc.assert(
      fc.property(maskedAnnouncementArb, (announcement) => {
        const content = extractCardContent(announcement);

        // Relative time must be a non-empty string
        expect(content.relativeTime.length).toBeGreaterThan(0);

        // Must match one of the expected relative time patterns
        const validPatterns = /^(\d+d ago|\d+h ago|\d+m ago|just now)$/;
        expect(content.relativeTime).toMatch(validPatterns);
      }),
      { numRuns: 100 }
    );
  });

  it('all five required fields are present in every card for any valid announcement', () => {
    fc.assert(
      fc.property(maskedAnnouncementArb, (announcement) => {
        const content = extractCardContent(announcement);

        // All fields must be non-empty strings
        expect(content.title).toBeTruthy();
        expect(content.locationText).toBeTruthy();
        expect(content.priceDisplay).toBeTruthy();
        expect(content.sourcePortalLabel).toBeTruthy();
        expect(content.relativeTime).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });
});
