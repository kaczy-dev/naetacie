import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getStaggerDelay, STAGGER_DELAY_MS } from './stagger';

// Feature: ux-security-enhancements, Property 19: Stagger animation delay computation

/**
 * Feature: ux-security-enhancements, Property 19: Stagger animation delay computation
 * Validates: Requirements 14.3
 *
 * For any card index n (non-negative integer), the computed entrance animation delay
 * SHALL equal n * 50 milliseconds.
 */
describe('Property 19: Stagger animation delay computation', () => {
  it('computed delay equals index * 50ms for any non-negative integer index', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        (index) => {
          const delay = getStaggerDelay(index);
          expect(delay).toBe(index * 50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('delay at index 0 is always 0ms', () => {
    expect(getStaggerDelay(0)).toBe(0);
  });

  it('delay increases monotonically with index', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 9999 }),
        (index) => {
          const delayA = getStaggerDelay(index);
          const delayB = getStaggerDelay(index + 1);
          expect(delayB).toBeGreaterThan(delayA);
          expect(delayB - delayA).toBe(STAGGER_DELAY_MS);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('delay difference between any two indices equals (b - a) * 50ms', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 5000 }),
        fc.nat({ max: 5000 }),
        (indexA, indexB) => {
          const delayA = getStaggerDelay(indexA);
          const delayB = getStaggerDelay(indexB);
          expect(delayB - delayA).toBe((indexB - indexA) * 50);
        }
      ),
      { numRuns: 100 }
    );
  });
});
