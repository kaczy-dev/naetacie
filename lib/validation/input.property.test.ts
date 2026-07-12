import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  sanitizeString,
  validateAndSanitize,
  MAX_QUERY_PARAM_LENGTH,
  MAX_BODY_FIELD_LENGTH,
  type ValidationSchema,
} from './input';

// Feature: ux-security-enhancements, Property 8: Input sanitization removes dangerous patterns
// **Validates: Requirements 4.3**

/**
 * Property 8: Input sanitization removes dangerous patterns
 *
 * For any string containing HTML tags, <script> elements, event handler attributes,
 * or SQL injection patterns, the sanitizeString function SHALL return a string that
 * contains none of these dangerous patterns while preserving the safe textual content.
 */
describe('Property 8: Input sanitization removes dangerous patterns', () => {
  // Arbitraries for generating dangerous content

  /** Generates an arbitrary HTML tag wrapping safe text */
  const htmlTagArb = fc.tuple(
    fc.constantFrom('div', 'span', 'p', 'a', 'b', 'i', 'img', 'table', 'form', 'iframe'),
    fc.string({ minLength: 1, maxLength: 30 })
  ).map(([tag, content]) => `<${tag}>${content}</${tag}>`);

  /** Generates a <script> element with arbitrary content */
  const scriptElementArb = fc.string({ minLength: 1, maxLength: 50 }).map(
    (content) => `<script>${content}</script>`
  );

  /** Generates an element with an event handler attribute */
  const eventHandlerArb = fc.tuple(
    fc.constantFrom('onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur', 'onsubmit'),
    fc.string({ minLength: 1, maxLength: 30 }),
    fc.string({ minLength: 1, maxLength: 20 })
  ).map(([handler, code, text]) => `<div ${handler}="${code}">${text}</div>`);

  /** Generates SQL injection patterns */
  const sqlInjectionArb = fc.constantFrom(
    "'; DROP TABLE users;",
    "' OR 1=1 --",
    "'; DELETE FROM accounts;",
    "' OR 'a'='a'",
    "1; EXEC xp_cmdshell('cmd');",
    "UNION SELECT * FROM users --",
    "'; TRUNCATE TABLE data;",
    "' AND 1=1 --",
    "'; ALTER TABLE users;",
    "'; INSERT INTO admin;",
  );

  /** Generates a string with injected HTML tags around safe text */
  const stringWithHtmlArb = fc.tuple(
    fc.string({ minLength: 0, maxLength: 20 }),
    htmlTagArb,
    fc.string({ minLength: 0, maxLength: 20 })
  ).map(([prefix, html, suffix]) => `${prefix}${html}${suffix}`);

  /** Generates a string with injected script elements */
  const stringWithScriptArb = fc.tuple(
    fc.string({ minLength: 0, maxLength: 20 }),
    scriptElementArb,
    fc.string({ minLength: 0, maxLength: 20 })
  ).map(([prefix, script, suffix]) => `${prefix}${script}${suffix}`);

  /** Generates a string with injected event handlers */
  const stringWithEventHandlerArb = fc.tuple(
    fc.string({ minLength: 0, maxLength: 20 }),
    eventHandlerArb,
    fc.string({ minLength: 0, maxLength: 20 })
  ).map(([prefix, handler, suffix]) => `${prefix}${handler}${suffix}`);

  /** Generates a string with injected SQL patterns */
  const stringWithSqlArb = fc.tuple(
    fc.string({ minLength: 0, maxLength: 20 }),
    sqlInjectionArb,
    fc.string({ minLength: 0, maxLength: 20 })
  ).map(([prefix, sql, suffix]) => `${prefix}${sql}${suffix}`);

  it('removes all HTML tags from input strings', () => {
    fc.assert(
      fc.property(stringWithHtmlArb, (input) => {
        const result = sanitizeString(input);
        // No HTML tags should remain
        expect(result).not.toMatch(/<\/?[a-z][^>]*>/i);
      }),
      { numRuns: 100 }
    );
  });

  it('removes <script> elements and their content', () => {
    fc.assert(
      fc.property(stringWithScriptArb, (input) => {
        const result = sanitizeString(input);
        // No script tags or content should remain
        expect(result.toLowerCase()).not.toContain('<script');
        expect(result.toLowerCase()).not.toContain('</script>');
      }),
      { numRuns: 100 }
    );
  });

  it('removes event handler attributes', () => {
    fc.assert(
      fc.property(stringWithEventHandlerArb, (input) => {
        const result = sanitizeString(input);
        // No event handler attributes should remain
        expect(result).not.toMatch(/\bon\w+\s*=/i);
      }),
      { numRuns: 100 }
    );
  });

  it('removes SQL injection patterns', () => {
    fc.assert(
      fc.property(stringWithSqlArb, (input) => {
        const result = sanitizeString(input);
        // Key SQL keywords in injection context should be removed
        expect(result).not.toMatch(/;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|TRUNCATE)\b/i);
        expect(result).not.toMatch(/\bOR\b\s+\d+\s*=\s*\d+/i);
        expect(result).not.toMatch(/\bOR\b\s+\w+\s*=\s*\w+/i);
        expect(result).not.toContain('--');
      }),
      { numRuns: 100 }
    );
  });

  it('preserves safe textual content that has no dangerous patterns', () => {
    // Generate strings from a safe alphabet that won't trigger any sanitization rules
    const safeCharArb = fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?:()[]{}@$%^&*+-_=~'.split('')
    );
    const safeTextArb = fc.array(safeCharArb, { minLength: 1, maxLength: 80 }).map((chars) => chars.join(''));

    fc.assert(
      fc.property(safeTextArb, (input) => {
        const result = sanitizeString(input);
        // Safe text should be preserved (possibly with whitespace normalization)
        expect(result).toBe(input.replace(/\s{2,}/g, ' ').trim());
      }),
      { numRuns: 100 }
    );
  });

  it('handles combined dangerous patterns (HTML + script + SQL)', () => {
    const combinedDangerousArb = fc.tuple(
      scriptElementArb,
      eventHandlerArb,
      sqlInjectionArb,
      fc.string({ minLength: 1, maxLength: 20 })
    ).map(([script, handler, sql, safe]) => `${script}${handler}${sql}${safe}`);

    fc.assert(
      fc.property(combinedDangerousArb, (input) => {
        const result = sanitizeString(input);
        expect(result).not.toMatch(/<\/?[a-z][^>]*>/i);
        expect(result.toLowerCase()).not.toContain('<script');
        expect(result).not.toMatch(/\bon\w+\s*=/i);
        expect(result).not.toContain('--');
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: ux-security-enhancements, Property 9: Input validation rejects oversized parameters
// **Validates: Requirements 4.4, 4.5**

/**
 * Property 9: Input validation rejects oversized parameters
 *
 * For any string parameter exceeding 200 characters (query params) or 1000 characters
 * (body fields), the validator SHALL reject the input. For any request body exceeding
 * 10KB total size, the API SHALL return HTTP 413.
 */
describe('Property 9: Input validation rejects oversized parameters', () => {
  const schema: ValidationSchema = {
    search: { type: 'string', required: true },
  };

  it('rejects query parameters exceeding 200 characters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_QUERY_PARAM_LENGTH + 1, max: MAX_QUERY_PARAM_LENGTH + 500 }),
        (length) => {
          const oversizedInput = 'a'.repeat(length);
          const result = validateAndSanitize({ search: oversizedInput }, schema, 'query');

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0].field).toBe('search');
          expect(result.errors[0].reason).toContain(`${MAX_QUERY_PARAM_LENGTH} characters`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts query parameters of exactly 200 characters or fewer', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_QUERY_PARAM_LENGTH }),
        (length) => {
          const validInput = 'a'.repeat(length);
          const result = validateAndSanitize({ search: validInput }, schema, 'query');

          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects body fields exceeding 1000 characters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_BODY_FIELD_LENGTH + 1, max: MAX_BODY_FIELD_LENGTH + 500 }),
        (length) => {
          const oversizedInput = 'a'.repeat(length);
          const result = validateAndSanitize({ search: oversizedInput }, schema, 'body');

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0].field).toBe('search');
          expect(result.errors[0].reason).toContain(`${MAX_BODY_FIELD_LENGTH} characters`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts body fields of exactly 1000 characters or fewer', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_BODY_FIELD_LENGTH }),
        (length) => {
          const validInput = 'a'.repeat(length);
          const result = validateAndSanitize({ search: validInput }, schema, 'body');

          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects any string field exceeding default max length regardless of content', () => {
    // Generate arbitrary strings that are too long for query context
    const oversizedStringArb = fc.string({
      minLength: MAX_QUERY_PARAM_LENGTH + 1,
      maxLength: MAX_QUERY_PARAM_LENGTH + 200,
    });

    fc.assert(
      fc.property(oversizedStringArb, (oversizedInput) => {
        const result = validateAndSanitize({ search: oversizedInput }, schema, 'query');
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === 'search')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects each oversized field independently in multi-field schemas', () => {
    // Validates that when multiple body fields exceed the limit, each is rejected
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_BODY_FIELD_LENGTH + 1, max: MAX_BODY_FIELD_LENGTH + 500 }),
        (length) => {
          const multiFieldSchema: ValidationSchema = {
            field1: { type: 'string', required: true },
            field2: { type: 'string', required: true },
          };
          const oversized = 'x'.repeat(length);
          const result = validateAndSanitize(
            { field1: oversized, field2: oversized },
            multiFieldSchema,
            'body'
          );
          expect(result.valid).toBe(false);
          // Both oversized fields should generate errors
          expect(result.errors.length).toBe(2);
          const errorFields = result.errors.map((e) => e.field);
          expect(errorFields).toContain('field1');
          expect(errorFields).toContain('field2');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: ux-security-enhancements, Property 10: Input validation error responses contain field and reason
// **Validates: Requirements 4.1, 4.2**

/**
 * Property 10: Input validation error responses contain field and reason
 *
 * For any invalid request parameter, the API response SHALL be HTTP 400 with a JSON body
 * containing the invalid field name and a human-readable reason, and SHALL NOT contain
 * stack traces, file paths, or internal identifiers.
 */
describe('Property 10: Input validation error responses contain field and reason', () => {
  // Reserved names from Object.prototype that would cause false matches
  const RESERVED_NAMES = new Set([
    'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf',
    'propertyIsEnumerable', 'toLocaleString', 'constructor',
    '__proto__', '__defineGetter__', '__defineSetter__',
    '__lookupGetter__', '__lookupSetter__',
  ]);

  /** Generate arbitrary field names (valid identifiers, avoiding Object.prototype collisions) */
  const fieldNameArb = fc.string({ minLength: 2, maxLength: 20 }).filter(
    (s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) && !RESERVED_NAMES.has(s)
  );

  it('error responses contain the invalid field name', () => {
    fc.assert(
      fc.property(fieldNameArb, (fieldName) => {
        const schema: ValidationSchema = {
          [fieldName]: { type: 'string', required: true },
        };

        // Omit the required field to trigger validation error
        const result = validateAndSanitize({}, schema);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        // The error must reference the field name
        expect(result.errors[0].field).toBe(fieldName);
      }),
      { numRuns: 100 }
    );
  });

  it('error responses contain a human-readable reason string', () => {
    fc.assert(
      fc.property(fieldNameArb, (fieldName) => {
        const schema: ValidationSchema = {
          [fieldName]: { type: 'string', required: true },
        };

        const result = validateAndSanitize({}, schema);

        expect(result.valid).toBe(false);
        for (const error of result.errors) {
          // Reason must be a non-empty string
          expect(typeof error.reason).toBe('string');
          expect(error.reason.length).toBeGreaterThan(0);
          // Reason should be human-readable (contains actual words, not just codes)
          expect(error.reason).toMatch(/[a-zA-Z\s]/);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('error responses do NOT contain stack traces, file paths, or internal identifiers', () => {
    // Patterns that should never appear in error responses
    const dangerousInfoPatterns = [
      /at\s+\w+\s+\(/,         // Stack trace pattern: "at FunctionName ("
      /\.(ts|js|tsx|jsx):\d+/, // File paths with line numbers
      /\/[a-z]+\/[a-z]+\//i,   // Unix-style paths
      /\\[a-z]+\\[a-z]+\\/i,   // Windows-style paths
      /node_modules/,           // Internal dependency paths
      /Error:\s/,               // Raw error messages
      /TypeError|ReferenceError|SyntaxError/, // JS error types
    ];

    fc.assert(
      fc.property(
        fieldNameArb,
        fc.constantFrom('string', 'number', 'boolean', 'email') as fc.Arbitrary<'string' | 'number' | 'boolean' | 'email'>,
        (fieldName, fieldType) => {
          const schema: ValidationSchema = {
            [fieldName]: { type: fieldType, required: true },
          };

          // Provide invalid values for each type to trigger errors
          const invalidValues: Record<string, unknown> = {
            string: 'a'.repeat(MAX_QUERY_PARAM_LENGTH + 1), // too long for query context
            number: 'not_a_number',
            boolean: 'maybe',
            email: 'invalid-email',
          };

          const result = validateAndSanitize(
            { [fieldName]: invalidValues[fieldType] },
            schema,
            'query'
          );

          if (!result.valid) {
            for (const error of result.errors) {
              const combined = `${error.field} ${error.reason}`;
              for (const pattern of dangerousInfoPatterns) {
                expect(combined).not.toMatch(pattern);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces errors for wrong type inputs (number field given non-numeric value)', () => {
    const nonNumericArb = fc.string({ minLength: 1, maxLength: 20 }).filter(
      (s) => isNaN(Number(s)) && s !== '' && s !== 'true' && s !== 'false'
    );

    fc.assert(
      fc.property(
        fieldNameArb,
        nonNumericArb,
        (fieldName, invalidValue) => {
          const schema: ValidationSchema = {
            [fieldName]: { type: 'number', required: true },
          };

          const result = validateAndSanitize({ [fieldName]: invalidValue }, schema);

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0].field).toBe(fieldName);
          expect(result.errors[0].reason.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces errors for invalid email format with field and reason', () => {
    // Generate strings that are definitely not valid emails
    const invalidEmailArb = fc.string({ minLength: 1, maxLength: 50 }).filter(
      (s) => !s.includes('@') || s.startsWith('@') || s.endsWith('@') || s.includes(' ')
    );

    fc.assert(
      fc.property(
        fieldNameArb,
        invalidEmailArb,
        (fieldName, invalidEmail) => {
          const schema: ValidationSchema = {
            [fieldName]: { type: 'email', required: true },
          };

          const result = validateAndSanitize({ [fieldName]: invalidEmail }, schema);

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0].field).toBe(fieldName);
          expect(typeof result.errors[0].reason).toBe('string');
          expect(result.errors[0].reason.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all errors in multi-field validation contain both field and reason', () => {
    fc.assert(
      fc.property(
        fc.array(fieldNameArb, { minLength: 2, maxLength: 5 }),
        (fieldNames) => {
          // Ensure unique field names
          const uniqueFields = [...new Set(fieldNames)];
          if (uniqueFields.length < 2) return;

          const schema: ValidationSchema = {};
          for (const name of uniqueFields) {
            schema[name] = { type: 'string', required: true };
          }

          // Submit empty object so all required fields fail
          const result = validateAndSanitize({}, schema);

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBe(uniqueFields.length);

          for (const error of result.errors) {
            // Each error must have a field and reason
            expect(error.field).toBeTruthy();
            expect(error.reason).toBeTruthy();
            expect(typeof error.field).toBe('string');
            expect(typeof error.reason).toBe('string');
            // Field must be one of the schema fields
            expect(uniqueFields).toContain(error.field);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
