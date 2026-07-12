import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validatePassword } from './password';

/**
 * Feature: construction-ads-aggregator, Property 4: Password validation correctness
 * Validates: Requirements 4.4
 *
 * For any string s, validatePassword(s) returns valid=true if and only if:
 * - s.length >= 8 AND
 * - s contains at least one uppercase letter (A-Z) AND
 * - s contains at least one lowercase letter (a-z) AND
 * - s contains at least one digit (0-9)
 */
describe('Property 4: Password validation correctness', () => {
  const hasUppercase = (s: string) => /[A-Z]/.test(s);
  const hasLowercase = (s: string) => /[a-z]/.test(s);
  const hasDigit = (s: string) => /[0-9]/.test(s);

  const shouldBeValid = (s: string) =>
    s.length >= 8 && hasUppercase(s) && hasLowercase(s) && hasDigit(s);

  it('returns valid=true iff length>=8 AND has uppercase AND has lowercase AND has digit (arbitrary strings)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (password) => {
        const result = validatePassword(password);
        const expected = shouldBeValid(password);
        expect(result.valid).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('always returns valid=true for passwords that meet all criteria', () => {
    // Generator that always produces valid passwords
    const validPasswordArb = fc
      .tuple(
        fc.char().filter((c) => /[A-Z]/.test(c)),
        fc.char().filter((c) => /[a-z]/.test(c)),
        fc.char().filter((c) => /[0-9]/.test(c)),
        fc.string({ minLength: 5, maxLength: 50 })
      )
      .map(([upper, lower, digit, rest]) => upper + lower + digit + rest + upper + lower + digit + 'a');

    fc.assert(
      fc.property(validPasswordArb, (password) => {
        // These passwords always have length >= 8 and all required chars
        expect(password.length).toBeGreaterThanOrEqual(8);
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('always returns valid=false for passwords shorter than 8 characters', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 7 }), (password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('always returns valid=false for passwords without uppercase', () => {
    // Generate strings with only lowercase and digits, length >= 8
    const noUpperArb = fc
      .stringOf(fc.char().filter((c) => !/[A-Z]/.test(c)), { minLength: 8, maxLength: 50 });

    fc.assert(
      fc.property(noUpperArb, (password) => {
        const result = validatePassword(password);
        if (!hasUppercase(password)) {
          expect(result.valid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('always returns valid=false for passwords without lowercase', () => {
    const noLowerArb = fc
      .stringOf(fc.char().filter((c) => !/[a-z]/.test(c)), { minLength: 8, maxLength: 50 });

    fc.assert(
      fc.property(noLowerArb, (password) => {
        const result = validatePassword(password);
        if (!hasLowercase(password)) {
          expect(result.valid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('always returns valid=false for passwords without digit', () => {
    const noDigitArb = fc
      .stringOf(fc.char().filter((c) => !/[0-9]/.test(c)), { minLength: 8, maxLength: 50 });

    fc.assert(
      fc.property(noDigitArb, (password) => {
        const result = validatePassword(password);
        if (!hasDigit(password)) {
          expect(result.valid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('valid=false result always includes correct reasons', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (password) => {
        const result = validatePassword(password);
        if (!result.valid) {
          if (password.length < 8) {
            expect(result.reasons).toContain('Password must be at least 8 characters long');
          }
          if (!hasUppercase(password)) {
            expect(result.reasons).toContain('Password must contain at least one uppercase letter');
          }
          if (!hasLowercase(password)) {
            expect(result.reasons).toContain('Password must contain at least one lowercase letter');
          }
          if (!hasDigit(password)) {
            expect(result.reasons).toContain('Password must contain at least one digit');
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
