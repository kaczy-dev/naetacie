import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { splitIntoBatches } from './index';

/**
 * Feature: construction-ads-aggregator, Property 13: Batch write splitting
 * Validates: Requirements 12.2
 */
describe('Property 13: Batch write splitting', () => {
  const MAX_BATCH_SIZE = 500;

  it('produces Math.ceil(N / 500) batches, each ≤ 500 items, total items preserved, order preserved', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 0, maxLength: 2000 }),
        (documents) => {
          const batches = splitIntoBatches(documents, MAX_BATCH_SIZE);
          const N = documents.length;

          // Correct number of batches produced
          const expectedBatchCount = N === 0 ? 0 : Math.ceil(N / MAX_BATCH_SIZE);
          expect(batches.length).toBe(expectedBatchCount);

          // Each batch has at most 500 items
          for (const batch of batches) {
            expect(batch.length).toBeGreaterThan(0);
            expect(batch.length).toBeLessThanOrEqual(MAX_BATCH_SIZE);
          }

          // Total items across all batches equals N
          const totalItems = batches.reduce((sum, batch) => sum + batch.length, 0);
          expect(totalItems).toBe(N);

          // Order of documents is preserved (flattening batches returns original array)
          const flattened = batches.flat();
          expect(flattened).toEqual(documents);
        }
      ),
      { numRuns: 200 }
    );
  });
});
