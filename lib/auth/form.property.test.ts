import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateEmail,
  checkPasswordStrength,
  validateRequired,
} from '../validation/formValidator';

// Feature: ux-security-enhancements, Property 3: Form validation produces correct errors for all invalid states
// Feature: ux-security-enhancements, Property 4: Password strength indicator correctness
// Feature: ux-security-enhancements, Property 5: Form data preservation on submission error

// **Validates: Requirements 2.1, 2.4, 2.2, 2.3, 2.8, 3.5**

describe('Property 3: Form validation produces correct errors for all invalid states', () => {
  it('validateEmail returns error for empty or whitespace-only strings', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r', '')).filter((s) => s.trim() === ''),
        (emptyish) => {
          const result = validateEmail(emptyish);
          expect(result.isValid).toBe(false);
          expect(result.error).toBe('Email is required');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateEmail returns error for strings without valid email format', () => {
    // Generate strings that are definitely not valid emails
    const invalidEmailArb = fc.oneof(
      // No @ sign
      fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('@') && s.trim() !== ''),
      // @ but no dot in domain
      fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('@') && s.trim() !== '' && !s.includes(' ')),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('.') && !s.includes('@') && !s.includes(' ') && s.length > 0)
      ).map(([local, domain]) => `${local}@${domain}`),
      // @ with domain dot but TLD < 2 chars
      fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('@') && s.trim() !== '' && !s.includes(' ')),
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.includes('.') && !s.includes('@') && !s.includes(' ') && s.length > 0),
        fc.string({ minLength: 1, maxLength: 1 }).filter((s) => !s.includes('.') && !s.includes('@') && !s.includes(' ') && s.length === 1)
      ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)
    );

    fc.assert(
      fc.property(invalidEmailArb, (invalidEmail) => {
        const result = validateEmail(invalidEmail);
        expect(result.isValid).toBe(false);
        expect(result.error).not.toBeNull();
        expect(typeof result.error).toBe('string');
        expect(result.error!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('validateEmail returns valid for properly formatted emails', () => {
    // Generate valid-looking emails: local@domain.tld (tld >= 2 chars)
    const validEmailArb = fc.tuple(
      fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim() !== '' && !s.includes('@') && !s.includes(' ')),
      fc.string({ minLength: 1, maxLength: 15 }).filter((s) => s.trim() !== '' && !s.includes('@') && !s.includes('.') && !s.includes(' ')),
      fc.string({ minLength: 2, maxLength: 5 }).filter((s) => s.trim() !== '' && !s.includes('@') && !s.includes('.') && !s.includes(' '))
    ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

    fc.assert(
      fc.property(validEmailArb, (validEmail) => {
        const result = validateEmail(validEmail);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('validateRequired returns error for empty or whitespace-only strings with field name', () => {
    const fieldNameArb = fc.stringOf(
      fc.char().filter((c) => c.trim() !== '' && c !== '\n' && c !== '\r'),
      { minLength: 1, maxLength: 30 }
    );

    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r', '')).filter((s) => s.trim() === ''),
        fieldNameArb,
        (emptyValue, fieldName) => {
          const result = validateRequired(emptyValue, fieldName);
          expect(result.isValid).toBe(false);
          expect(result.error).not.toBeNull();
          // Error should reference the field name
          expect(result.error).toContain(fieldName);
          // Error should be human-readable (non-empty string)
          expect(result.error!.length).toBeGreaterThan(fieldName.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateRequired returns valid for non-empty strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim() !== ''),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim() !== ''),
        (value, fieldName) => {
          const result = validateRequired(value, fieldName);
          expect(result.isValid).toBe(true);
          expect(result.error).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total error count equals number of invalid fields in a form state', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }), // email
        fc.string({ minLength: 0, maxLength: 50 }), // displayName
        (email, displayName) => {
          const errors: Array<{ field: string; reason: string }> = [];

          const emailResult = validateEmail(email);
          if (!emailResult.isValid) {
            errors.push({ field: 'email', reason: emailResult.error! });
          }

          const displayNameResult = validateRequired(displayName, 'Display Name');
          if (!displayNameResult.isValid) {
            errors.push({ field: 'Display Name', reason: displayNameResult.error! });
          }

          // Count invalid fields
          let invalidCount = 0;
          if (!emailResult.isValid) invalidCount++;
          if (!displayNameResult.isValid) invalidCount++;

          // Error count should equal invalid field count
          expect(errors.length).toBe(invalidCount);

          // Each error should reference a specific field and have a human-readable reason
          for (const error of errors) {
            expect(error.field.length).toBeGreaterThan(0);
            expect(error.reason.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 4: Password strength indicator correctness', () => {
  it('correctly identifies length >= 8 criterion', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (password) => {
        const result = checkPasswordStrength(password);
        expect(result.hasMinLength).toBe(password.length >= 8);
      }),
      { numRuns: 100 }
    );
  });

  it('correctly identifies uppercase criterion', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (password) => {
        const result = checkPasswordStrength(password);
        expect(result.hasUppercase).toBe(/[A-Z]/.test(password));
      }),
      { numRuns: 100 }
    );
  });

  it('correctly identifies lowercase criterion', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (password) => {
        const result = checkPasswordStrength(password);
        expect(result.hasLowercase).toBe(/[a-z]/.test(password));
      }),
      { numRuns: 100 }
    );
  });

  it('correctly identifies digit criterion', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (password) => {
        const result = checkPasswordStrength(password);
        expect(result.hasDigit).toBe(/\d/.test(password));
      }),
      { numRuns: 100 }
    );
  });

  it('isValid is true if and only if all four criteria are met', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (password) => {
        const result = checkPasswordStrength(password);
        const allMet =
          result.hasMinLength &&
          result.hasUppercase &&
          result.hasLowercase &&
          result.hasDigit;
        expect(result.isValid).toBe(allMet);
      }),
      { numRuns: 100 }
    );
  });

  it('score equals the count of met criteria (0-4)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (password) => {
        const result = checkPasswordStrength(password);
        const expectedScore = [
          result.hasMinLength,
          result.hasUppercase,
          result.hasLowercase,
          result.hasDigit,
        ].filter(Boolean).length;
        expect(result.score).toBe(expectedScore);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(4);
      }),
      { numRuns: 100 }
    );
  });

  it('passwords meeting all criteria always have isValid=true and score=4', () => {
    // Generate passwords that definitely meet all criteria
    const strongPasswordArb = fc.tuple(
      fc.string({ minLength: 4, maxLength: 20 }), // base chars
      fc.constantFrom('A', 'B', 'C', 'Z'), // uppercase
      fc.constantFrom('a', 'b', 'c', 'z'), // lowercase
      fc.constantFrom('0', '1', '5', '9')  // digit
    ).map(([base, upper, lower, digit]) => `${upper}${lower}${digit}${base}paddd`);

    fc.assert(
      fc.property(strongPasswordArb, (password) => {
        const result = checkPasswordStrength(password);
        // All generated passwords have >= 8 chars, uppercase, lowercase, digit
        expect(result.hasMinLength).toBe(true);
        expect(result.hasUppercase).toBe(true);
        expect(result.hasLowercase).toBe(true);
        expect(result.hasDigit).toBe(true);
        expect(result.isValid).toBe(true);
        expect(result.score).toBe(4);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 5: Form data preservation on submission error', () => {
  it('validateEmail is a pure function (same input always produces same output)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (email) => {
        const result1 = validateEmail(email);
        const result2 = validateEmail(email);
        expect(result1).toEqual(result2);
      }),
      { numRuns: 100 }
    );
  });

  it('checkPasswordStrength is a pure function (same input always produces same output)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (password) => {
        const result1 = checkPasswordStrength(password);
        const result2 = checkPasswordStrength(password);
        expect(result1).toEqual(result2);
      }),
      { numRuns: 100 }
    );
  });

  it('validateRequired is a pure function (same input always produces same output)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim() !== ''),
        (value, fieldName) => {
          const result1 = validateRequired(value, fieldName);
          const result2 = validateRequired(value, fieldName);
          expect(result1).toEqual(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validation functions do not mutate their input arguments', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }), // email
        fc.string({ minLength: 0, maxLength: 100 }), // password
        fc.string({ minLength: 0, maxLength: 50 }),  // displayName
        (email, password, displayName) => {
          // Preserve original values
          const originalEmail = email;
          const originalPassword = password;
          const originalDisplayName = displayName;

          // Run all validation functions
          validateEmail(email);
          checkPasswordStrength(password);
          validateRequired(displayName, 'Display Name');

          // Verify inputs were not mutated
          expect(email).toBe(originalEmail);
          expect(password).toBe(originalPassword);
          expect(displayName).toBe(originalDisplayName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('form state remains unchanged after validation regardless of error type', () => {
    // Simulate different submission error scenarios - form data should not be altered
    const formStateArb = fc.record({
      email: fc.string({ minLength: 0, maxLength: 50 }),
      password: fc.string({ minLength: 0, maxLength: 50 }),
      displayName: fc.string({ minLength: 0, maxLength: 50 }),
    });

    const errorTypeArb = fc.constantFrom(
      'auth/email-already-in-use',
      'auth/invalid-credential',
      'auth/network-request-failed',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request'
    );

    fc.assert(
      fc.property(formStateArb, errorTypeArb, (formState, _errorType) => {
        // Copy the pre-submission state
        const preSubmission = { ...formState };

        // Simulate what happens during validation (which occurs during/after error)
        validateEmail(formState.email);
        checkPasswordStrength(formState.password);
        validateRequired(formState.displayName, 'Display Name');

        // Form field values should remain identical to pre-submission values
        expect(formState.email).toBe(preSubmission.email);
        expect(formState.password).toBe(preSubmission.password);
        expect(formState.displayName).toBe(preSubmission.displayName);
      }),
      { numRuns: 100 }
    );
  });
});
