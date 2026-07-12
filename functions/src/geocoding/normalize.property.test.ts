import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { normalizeLocationText } from './normalize';

/**
 * Feature: construction-ads-aggregator, Property 2: Location text normalization is idempotent and case-insensitive
 *
 * Validates: Requirements 3.2, 11.4
 */
describe('Property 2: Location text normalization is idempotent and case-insensitive', () => {
  const encoder = new TextEncoder();

  it('idempotency: normalizeLocationText(normalizeLocationText(s)) === normalizeLocationText(s)', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = normalizeLocationText(s);
        const twice = normalizeLocationText(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 100 }
    );
  });

  it('case-insensitivity: strings differing only in casing produce the same output', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const fromOriginal = normalizeLocationText(s);
        const fromUpper = normalizeLocationText(s.toUpperCase());
        const fromLower = normalizeLocationText(s.toLowerCase());
        expect(fromOriginal).toBe(fromLower);
        expect(fromUpper).toBe(fromLower);
      }),
      { numRuns: 100 }
    );
  });

  it('output is always ≤ 1500 bytes (UTF-8)', () => {
    fc.assert(
      fc.property(fc.string16bits(), (s) => {
        const result = normalizeLocationText(s);
        const byteLength = encoder.encode(result).length;
        expect(byteLength).toBeLessThanOrEqual(1500);
      }),
      { numRuns: 100 }
    );
  });

  it('output is always trimmed (no leading/trailing whitespace)', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = normalizeLocationText(s);
        expect(result).toBe(result.trim());
      }),
      { numRuns: 100 }
    );
  });

  it('output has no consecutive whitespace', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = normalizeLocationText(s);
        // No two or more consecutive whitespace characters
        expect(result).not.toMatch(/\s{2,}/);
      }),
      { numRuns: 100 }
    );
  });
});
