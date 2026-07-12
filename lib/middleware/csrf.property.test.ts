import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateCsrfToken, generateCsrfToken } from './csrf';

// Feature: ux-security-enhancements, Property 12: CSRF token validation accepts matching pairs only

/**
 * Property 12: CSRF token validation accepts matching pairs only
 * Validates: Requirements 6.3
 *
 * For any pair of tokens (cookieToken, headerToken), the CSRF validator SHALL return
 * true if and only if both tokens are non-empty strings and cookieToken === headerToken.
 */
describe('Property 12: CSRF token validation accepts matching pairs only', () => {
  it('for any non-empty string token, validateCsrfToken(token, token) === true (matching pair)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (token) => {
          expect(validateCsrfToken(token, token)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any two different non-empty strings, validateCsrfToken(a, b) === false (mismatched pair)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        (a, b) => {
          fc.pre(a !== b);
          expect(validateCsrfToken(a, b)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any string with empty counterpart, validation returns false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (token) => {
          expect(validateCsrfToken('', token)).toBe(false);
          expect(validateCsrfToken(token, '')).toBe(false);
          expect(validateCsrfToken('', '')).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generated tokens always produce valid matching pairs', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const token = generateCsrfToken();

          // Generated token is a non-empty string
          expect(typeof token).toBe('string');
          expect(token.length).toBeGreaterThan(0);

          // Generated token validates against itself
          expect(validateCsrfToken(token, token)).toBe(true);

          // Generated token is a 64-character hex string (32 bytes)
          expect(token).toMatch(/^[0-9a-f]{64}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
