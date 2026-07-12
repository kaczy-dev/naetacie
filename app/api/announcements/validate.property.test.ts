import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateQueryParams } from './validate';

/**
 * Feature: construction-ads-aggregator, Property 10: Query parameter validation
 * Validates: Requirements 8.4
 *
 * For any set of query parameters, validateQueryParams SHALL return invalid if:
 * - page < 1
 * - limit < 1
 * - limit > 100
 * - bounding_box contains non-numeric values or doesn't have exactly 4 comma-separated decimals
 * - source_portal is not one of "olx", "oferteo", "fixly"
 *
 * For all other inputs conforming to the constraints, it SHALL return valid with correctly parsed values.
 */
describe('Property 10: Query parameter validation', () => {
  const VALID_PORTALS = ['olx', 'oferteo', 'fixly'] as const;

  // --- Generators ---

  /** Generates a valid page string (integer >= 1) */
  const validPageArb = fc.integer({ min: 1, max: 10000 }).map(String);

  /** Generates a valid limit string (integer 1-100) */
  const validLimitArb = fc.integer({ min: 1, max: 100 }).map(String);

  /** Generates a valid source_portal */
  const validPortalArb = fc.constantFrom(...VALID_PORTALS);

  /** Generates a valid bounding_box string (4 comma-separated decimals) */
  const validBoundingBoxArb = fc
    .tuple(
      fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true })
    )
    .map(([s, w, n, e]) => `${s},${w},${n},${e}`);

  // --- Property: Valid inputs always accepted ---

  it('accepts valid parameters and returns correctly parsed values', () => {
    fc.assert(
      fc.property(
        validPageArb,
        validLimitArb,
        validPortalArb,
        validBoundingBoxArb,
        (page, limit, portal, bbox) => {
          const params: Record<string, string> = {
            page,
            limit,
            source_portal: portal,
            bounding_box: bbox,
          };

          const result = validateQueryParams(params);
          expect(result.valid).toBe(true);

          if (result.valid) {
            expect(result.parsed.page).toBe(Number(page));
            expect(result.parsed.limit).toBe(Number(limit));
            expect(result.parsed.source_portal).toBe(portal);
            expect(result.parsed.bounding_box).toBeDefined();

            const parts = bbox.split(',').map(Number);
            expect(result.parsed.bounding_box!.south_lat).toBe(parts[0]);
            expect(result.parsed.bounding_box!.west_lng).toBe(parts[1]);
            expect(result.parsed.bounding_box!.north_lat).toBe(parts[2]);
            expect(result.parsed.bounding_box!.east_lng).toBe(parts[3]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // --- Property: Invalid page always rejected ---

  it('rejects page < 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10000, max: 0 }).map(String),
        (page) => {
          const result = validateQueryParams({ page });
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-integer page values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true })
          .filter((n) => !Number.isInteger(n))
          .map(String),
        (page) => {
          const result = validateQueryParams({ page });
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // --- Property: Invalid limit always rejected ---

  it('rejects limit < 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10000, max: 0 }).map(String),
        (limit) => {
          const result = validateQueryParams({ limit });
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects limit > 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 101, max: 10000 }).map(String),
        (limit) => {
          const result = validateQueryParams({ limit });
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-integer limit values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.01, max: 99.99, noNaN: true, noDefaultInfinity: true })
          .filter((n) => !Number.isInteger(n))
          .map(String),
        (limit) => {
          const result = validateQueryParams({ limit });
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // --- Property: Invalid source_portal always rejected ---

  it('rejects source_portal not in allowed set', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(
          (s) => !VALID_PORTALS.includes(s as any)
        ),
        (portal) => {
          const result = validateQueryParams({ source_portal: portal });
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // --- Property: Invalid bounding_box always rejected ---

  it('rejects bounding_box with fewer or more than 4 comma-separated values', () => {
    const invalidCountArb = fc.oneof(
      // 1-3 values
      fc.integer({ min: 1, max: 3 }).chain((count) =>
        fc.array(fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }), {
          minLength: count,
          maxLength: count,
        }).map((nums) => nums.join(','))
      ),
      // 5+ values
      fc.integer({ min: 5, max: 8 }).chain((count) =>
        fc.array(fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }), {
          minLength: count,
          maxLength: count,
        }).map((nums) => nums.join(','))
      )
    );

    fc.assert(
      fc.property(invalidCountArb, (bbox) => {
        const result = validateQueryParams({ bounding_box: bbox });
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects bounding_box containing non-numeric values', () => {
    // Generate 4 comma-separated values where at least one is non-numeric
    const nonNumericBboxArb = fc
      .tuple(
        fc.array(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 10 }).filter((s) => isNaN(Number(s)) && s !== ''),
            fc.constant('abc'),
            fc.constant('NaN'),
            fc.constant('undefined')
          ),
          { minLength: 1, maxLength: 4 }
        ),
        fc.array(
          fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }).map(String),
          { minLength: 0, maxLength: 3 }
        )
      )
      .filter(([nonNums, nums]) => nonNums.length + nums.length === 4)
      .map(([nonNums, nums]) => {
        // Shuffle them together, ensuring at least one non-numeric is present
        const all = [...nonNums, ...nums];
        // Simple deterministic interleave: put non-numeric first
        return all.join(',');
      });

    fc.assert(
      fc.property(nonNumericBboxArb, (bbox) => {
        const result = validateQueryParams({ bounding_box: bbox });
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // --- Property: Default values applied correctly for omitted params ---

  it('applies default page=1 and limit=20 when params are omitted', () => {
    fc.assert(
      fc.property(fc.constant({}), (_) => {
        const result = validateQueryParams({});
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.parsed.page).toBe(1);
          expect(result.parsed.limit).toBe(20);
          expect(result.parsed.source_portal).toBeUndefined();
          expect(result.parsed.bounding_box).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  // --- Property: Arbitrary random objects generate correct accept/reject decisions ---

  it('correctly accepts or rejects arbitrary param combinations', () => {
    const arbitraryParams = fc.record({
      page: fc.oneof(
        fc.constant(undefined),
        fc.integer({ min: -100, max: 1000 }).map(String),
        fc.string({ minLength: 0, maxLength: 10 })
      ),
      limit: fc.oneof(
        fc.constant(undefined),
        fc.integer({ min: -100, max: 500 }).map(String),
        fc.string({ minLength: 0, maxLength: 10 })
      ),
      source_portal: fc.oneof(
        fc.constant(undefined),
        fc.constantFrom('olx', 'oferteo', 'fixly'),
        fc.string({ minLength: 1, maxLength: 20 })
      ),
      bounding_box: fc.oneof(
        fc.constant(undefined),
        validBoundingBoxArb,
        fc.string({ minLength: 1, maxLength: 50 })
      ),
    });

    fc.assert(
      fc.property(arbitraryParams, (params) => {
        // Build the Record<string, string> (filter out undefined)
        const input: Record<string, string> = {};
        if (params.page !== undefined) input.page = params.page;
        if (params.limit !== undefined) input.limit = params.limit;
        if (params.source_portal !== undefined) input.source_portal = params.source_portal;
        if (params.bounding_box !== undefined) input.bounding_box = params.bounding_box;

        const result = validateQueryParams(input);

        // Determine expected validity
        let shouldBeValid = true;

        // Check page
        if (input.page !== undefined && input.page !== '') {
          const parsed = Number(input.page);
          if (!Number.isInteger(parsed) || parsed < 1) {
            shouldBeValid = false;
          }
        }

        // Check limit
        if (shouldBeValid && input.limit !== undefined && input.limit !== '') {
          const parsed = Number(input.limit);
          if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
            shouldBeValid = false;
          }
        }

        // Check source_portal
        if (shouldBeValid && input.source_portal !== undefined && input.source_portal !== '') {
          if (!VALID_PORTALS.includes(input.source_portal as any)) {
            shouldBeValid = false;
          }
        }

        // Check bounding_box
        if (shouldBeValid && input.bounding_box !== undefined && input.bounding_box !== '') {
          const parts = input.bounding_box.split(',');
          if (parts.length !== 4) {
            shouldBeValid = false;
          } else {
            const numbers = parts.map((p) => Number(p.trim()));
            if (numbers.some((n) => isNaN(n))) {
              shouldBeValid = false;
            }
          }
        }

        expect(result.valid).toBe(shouldBeValid);
      }),
      { numRuns: 200 }
    );
  });
});
