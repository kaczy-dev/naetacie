import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateBackoffDelay } from './retry';

/**
 * Feature: construction-ads-aggregator, Property 14: Exponential backoff calculation
 * Validates: Requirements 1.6
 */
describe('Property 14: Exponential backoff calculation', () => {
  it('for attempt n with base delay and multiplier, delay equals base * multiplier^n', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10 }),
        (attempt, baseDelay, multiplier) => {
          const result = calculateBackoffDelay(attempt, baseDelay, multiplier);
          const expected = baseDelay * Math.pow(multiplier, attempt);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('with default config (base=2000, multiplier=2), delays are 2000, 4000, 8000 for attempts 0, 1, 2', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(0, 1, 2),
        (attempt) => {
          const result = calculateBackoffDelay(attempt, 2000, 2);
          const expected = 2000 * Math.pow(2, attempt);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
