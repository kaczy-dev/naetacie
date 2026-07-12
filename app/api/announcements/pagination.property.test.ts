import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculatePagination } from './pagination';

/**
 * Feature: construction-ads-aggregator, Property 11: Pagination metadata calculation
 * Validates: Requirements 8.8
 */
describe('Property 11: Pagination metadata calculation', () => {
  it('returns total_pages = Math.ceil(total_count / page_size), correct current_page and page_size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),   // total_count >= 0
        fc.integer({ min: 1, max: 10_000 }),    // page >= 1
        fc.integer({ min: 1, max: 100 }),       // page_size between 1 and 100
        (totalCount, page, pageSize) => {
          const result = calculatePagination(totalCount, page, pageSize);

          // total_pages = Math.ceil(total_count / page_size), except 0 when total_count is 0
          const expectedTotalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
          expect(result.total_pages).toBe(expectedTotalPages);

          // current_page = page (pass-through)
          expect(result.current_page).toBe(page);

          // page_size equals the input page_size
          expect(result.page_size).toBe(pageSize);

          // total_count equals the input total_count
          expect(result.total_count).toBe(totalCount);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns total_pages = 0 when total_count is 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000 }),  // page >= 1
        fc.integer({ min: 1, max: 100 }),     // page_size between 1 and 100
        (page, pageSize) => {
          const result = calculatePagination(0, page, pageSize);
          expect(result.total_pages).toBe(0);
          expect(result.total_count).toBe(0);
          expect(result.current_page).toBe(page);
          expect(result.page_size).toBe(pageSize);
        }
      ),
      { numRuns: 100 }
    );
  });
});
