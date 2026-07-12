import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createHash } from 'crypto';
import { generateDeduplicationKey } from './index';
import type { ScrapedAd } from '@lib/types/announcement';

/**
 * Feature: construction-ads-aggregator, Property 1: Deduplication key generation determinism
 *
 * Validates: Requirements 2.1, 2.2
 *
 * For any scraped ad:
 * - If nativeId is non-empty: key === `${sourcePortal}-${nativeId}`
 * - If nativeId is null/empty: key === SHA-256 hex of `${title}|${publishedAt}|${description}`
 * - Calling the function twice with same input produces same output (determinism)
 */
describe('Feature: construction-ads-aggregator, Property 1: Deduplication key generation determinism', () => {
  const sourcePortalArb = fc.constantFrom('olx', 'oferteo', 'fixly') as fc.Arbitrary<
    'olx' | 'oferteo' | 'fixly'
  >;

  const baseAdArb = fc.record({
    title: fc.string({ minLength: 0, maxLength: 200 }),
    description: fc.string({ minLength: 0, maxLength: 500 }),
    sourceUrl: fc.string(),
    sourcePortal: sourcePortalArb,
    category: fc.string(),
    locationText: fc.string(),
    price: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 1_000_000, noNaN: true })),
    contactInfo: fc.oneof(fc.constant(null), fc.string()),
    publishedAt: fc.oneof(fc.constant(null), fc.date()),
  });

  it('should return `${sourcePortal}-${nativeId}` when nativeId is non-empty', () => {
    fc.assert(
      fc.property(
        baseAdArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        (baseAd, nativeId) => {
          const ad: ScrapedAd = { ...baseAd, nativeId };
          const key = generateDeduplicationKey(ad);
          expect(key).toBe(`${ad.sourcePortal}-${nativeId}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return SHA-256 hex of `${title}|${publishedAt}|${description}` when nativeId is null', () => {
    fc.assert(
      fc.property(baseAdArb, (baseAd) => {
        const ad: ScrapedAd = { ...baseAd, nativeId: null };
        const key = generateDeduplicationKey(ad);

        const publishedAtStr = ad.publishedAt != null ? ad.publishedAt.toISOString() : '';
        const expectedContent = `${ad.title}|${publishedAtStr}|${ad.description}`;
        const expectedHash = createHash('sha256').update(expectedContent).digest('hex');

        expect(key).toBe(expectedHash);
      }),
      { numRuns: 100 }
    );
  });

  it('should return SHA-256 hex of `${title}|${publishedAt}|${description}` when nativeId is empty string', () => {
    fc.assert(
      fc.property(baseAdArb, (baseAd) => {
        const ad: ScrapedAd = { ...baseAd, nativeId: '' };
        const key = generateDeduplicationKey(ad);

        const publishedAtStr = ad.publishedAt != null ? ad.publishedAt.toISOString() : '';
        const expectedContent = `${ad.title}|${publishedAtStr}|${ad.description}`;
        const expectedHash = createHash('sha256').update(expectedContent).digest('hex');

        expect(key).toBe(expectedHash);
      }),
      { numRuns: 100 }
    );
  });

  it('should be deterministic: same input always produces same output (non-empty nativeId)', () => {
    fc.assert(
      fc.property(
        baseAdArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        (baseAd, nativeId) => {
          const ad: ScrapedAd = { ...baseAd, nativeId };
          const key1 = generateDeduplicationKey(ad);
          const key2 = generateDeduplicationKey(ad);
          expect(key1).toBe(key2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be deterministic: same input always produces same output (null/empty nativeId)', () => {
    fc.assert(
      fc.property(
        baseAdArb,
        fc.constantFrom(null, ''),
        (baseAd, nativeId) => {
          const ad: ScrapedAd = { ...baseAd, nativeId };
          const key1 = generateDeduplicationKey(ad);
          const key2 = generateDeduplicationKey(ad);
          expect(key1).toBe(key2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
