import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { withErrorSanitization } from './errorSanitizer';

// Feature: ux-security-enhancements, Property 13: Error response sanitization

/**
 * Property 13: Error response sanitization
 * Validates: Requirements 6.5, 6.6
 *
 * For any Error object thrown during API processing (with arbitrary message, stack trace,
 * and internal details), the HTTP response SHALL always be { error: "Internal server error" }
 * with status 500, containing no stack traces, file paths, database queries, or
 * implementation details.
 */
describe('Property 13: Error response sanitization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Generators for sensitive content
  const filePathArb = fc.oneof(
    fc.tuple(
      fc.constantFrom('/home/', '/app/', '/src/', '/usr/local/', 'C:\\Users\\'),
      fc.stringMatching(/^[a-zA-Z0-9/_.-]{1,50}$/)
    ).map(([prefix, rest]) => `${prefix}${rest}`),
    fc.constantFrom(
      '/var/log/app.log',
      'C:\\Projects\\secret\\config.ts',
      '/node_modules/.pnpm/next@14.0.0/dist/server.js',
      '../../../etc/passwd'
    )
  );

  const stackTraceArb = fc.tuple(
    fc.string({ minLength: 1, maxLength: 50 }),
    filePathArb,
    fc.nat({ max: 9999 }),
    fc.nat({ max: 999 })
  ).map(([msg, path, line, col]) =>
    `Error: ${msg}\n    at Object.<anonymous> (${path}:${line}:${col})\n    at Module._compile (node:internal/modules/cjs/loader:1234:14)`
  );

  const sqlQueryArb = fc.oneof(
    fc.constantFrom(
      "SELECT * FROM users WHERE id = 'admin'",
      "INSERT INTO sessions (token, user_id) VALUES ('abc123', 1)",
      "DROP TABLE announcements;",
      "UPDATE users SET tier = 'premium' WHERE email = 'test@test.com'",
      "'; DELETE FROM users; --"
    ),
    fc.tuple(
      fc.constantFrom('SELECT', 'INSERT', 'UPDATE', 'DELETE'),
      fc.string({ minLength: 1, maxLength: 40 })
    ).map(([cmd, rest]) => `${cmd} ${rest}`)
  );

  const sensitiveMessageArb = fc.oneof(
    filePathArb,
    stackTraceArb,
    sqlQueryArb,
    fc.string({ minLength: 1, maxLength: 200 })
  );

  it('for any Error with arbitrary message, response is always { error: "Internal server error" } with status 500', async () => {
    await fc.assert(
      fc.asyncProperty(
        sensitiveMessageArb,
        async (message) => {
          const handler = async () => {
            throw new Error(message);
          };

          const wrapped = withErrorSanitization(handler);
          const response = await wrapped();
          const body = await response.json();

          expect(response.status).toBe(500);
          expect(body).toEqual({ error: 'Internal server error' });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any non-Error throwable (strings, objects, numbers), response is still sanitized 500', async () => {
    const nonErrorThrowableArb = fc.oneof(
      fc.string({ minLength: 0, maxLength: 200 }),
      fc.integer(),
      fc.double({ noNaN: true }),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ maxLength: 50 })),
      fc.array(fc.string({ maxLength: 30 }), { maxLength: 5 })
    );

    await fc.assert(
      fc.asyncProperty(
        nonErrorThrowableArb,
        async (throwable) => {
          const handler = async () => {
            throw throwable;
          };

          const wrapped = withErrorSanitization(handler);
          const response = await wrapped();
          const body = await response.json();

          expect(response.status).toBe(500);
          expect(body).toEqual({ error: 'Internal server error' });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('response text never contains stack traces, file paths, SQL queries, or the original error message', async () => {
    await fc.assert(
      fc.asyncProperty(
        sensitiveMessageArb,
        fc.option(stackTraceArb, { nil: undefined }),
        async (message, customStack) => {
          const error = new Error(message);
          if (customStack !== undefined) {
            error.stack = customStack;
          }

          const handler = async () => {
            throw error;
          };

          const wrapped = withErrorSanitization(handler);
          const response = await wrapped();
          const responseText = await response.text();

          // Response must not contain the original error message
          // (unless it happens to be a substring of the generic response)
          if (!('{"error":"Internal server error"}').includes(message)) {
            expect(responseText).not.toContain(message);
          }

          // Response must not contain stack trace patterns
          expect(responseText).not.toMatch(/at\s+\S+\s+\(/);
          expect(responseText).not.toMatch(/node:internal/);
          expect(responseText).not.toMatch(/at Module\._compile/);

          // Response must not contain file path patterns
          expect(responseText).not.toMatch(/\.[tj]sx?:\d+/);
          expect(responseText).not.toMatch(/[A-Z]:\\/);
          expect(responseText).not.toMatch(/\/(?:home|app|src|usr|var|node_modules)\//);

          // Response must not contain SQL patterns
          expect(responseText).not.toMatch(/\bSELECT\s+/i);
          expect(responseText).not.toMatch(/\bINSERT\s+INTO\b/i);
          expect(responseText).not.toMatch(/\bDROP\s+TABLE\b/i);
          expect(responseText).not.toMatch(/\bDELETE\s+FROM\b/i);
          expect(responseText).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
        }
      ),
      { numRuns: 100 }
    );
  });
});
