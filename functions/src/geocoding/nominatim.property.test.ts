import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildNominatimQuery } from './nominatim';

/**
 * Feature: construction-ads-aggregator, Property 3: Nominatim query construction appends geographic context
 *
 * Validates: Requirements 3.4
 */
describe('Property 3: Nominatim query construction appends geographic context', () => {
  it('for any trimmed non-empty text, output equals `${text}, Szczecin, Poland`', () => {
    const trimmedNonEmptyString = fc.string({ minLength: 1 }).map((s) => s.trim()).filter((s) => s.length > 0);

    fc.assert(
      fc.property(trimmedNonEmptyString, (text) => {
        const result = buildNominatimQuery(text);
        expect(result).toBe(`${text}, Szczecin, Poland`);
      }),
      { numRuns: 100 }
    );
  });
});
