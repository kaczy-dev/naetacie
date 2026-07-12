import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { checkRateLimit, resetRateLimitStore } from './rateLimiter';
import type { RateLimitConfig } from './rateLimiter';

// Feature: ux-security-enhancements, Property 11: Rate limiter enforces sliding window threshold
// **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

describe('Property 11: Rate limiter enforces sliding window threshold', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRateLimitStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows exactly M requests within a window and rejects request M+1', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 50 }).map((n) => n + 1), // maxRequests: 1..51
        fc.integer({ min: 1000, max: 120_000 }), // windowMs: 1s..120s
        fc.string({ minLength: 1, maxLength: 50 }), // clientIp
        (maxRequests, windowMs, clientIp) => {
          resetRateLimitStore();
          vi.setSystemTime(new Date(1_000_000_000_000)); // fixed starting time

          const config: RateLimitConfig = { windowMs, maxRequests };

          // First M requests should all be allowed
          for (let i = 0; i < maxRequests; i++) {
            const result = checkRateLimit(clientIp, config);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(maxRequests - i - 1);
          }

          // Request M+1 should be rejected
          const rejected = checkRateLimit(clientIp, config);
          expect(rejected.allowed).toBe(false);
          expect(rejected.remaining).toBe(0);
          expect(rejected.retryAfterSeconds).toBeDefined();
          expect(rejected.retryAfterSeconds).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('retryAfterSeconds equals seconds until oldest request in window expires', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }), // maxRequests: 2..20
        fc.integer({ min: 5000, max: 60_000 }), // windowMs: 5s..60s
        fc.string({ minLength: 1, maxLength: 30 }), // clientIp
        fc.integer({ min: 0, max: 4000 }), // timeElapsedAfterFirst: 0..4s
        (maxRequests, windowMs, clientIp, timeElapsedAfterFirst) => {
          resetRateLimitStore();
          const startTime = 1_000_000_000_000;
          vi.setSystemTime(new Date(startTime));

          const config: RateLimitConfig = { windowMs, maxRequests };

          // Make first request at startTime
          checkRateLimit(clientIp, config);

          // Advance time slightly then make remaining requests to fill the window
          vi.setSystemTime(new Date(startTime + timeElapsedAfterFirst));
          for (let i = 1; i < maxRequests; i++) {
            checkRateLimit(clientIp, config);
          }

          // Now make the M+1 request (should be rejected)
          const rejected = checkRateLimit(clientIp, config);
          expect(rejected.allowed).toBe(false);

          // The retry-after should be ceiling of (oldest_timestamp + windowMs - now) / 1000
          const now = startTime + timeElapsedAfterFirst;
          const oldestTimestamp = startTime; // first request was at startTime
          const expectedRetryMs = oldestTimestamp + windowMs - now;
          const expectedRetrySeconds = Math.ceil(expectedRetryMs / 1000);

          expect(rejected.retryAfterSeconds).toBe(
            Math.max(expectedRetrySeconds, 1)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('requests are allowed again after the sliding window expires', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // maxRequests
        fc.integer({ min: 1000, max: 30_000 }), // windowMs
        fc.string({ minLength: 1, maxLength: 30 }), // clientIp
        (maxRequests, windowMs, clientIp) => {
          resetRateLimitStore();
          const startTime = 1_000_000_000_000;
          vi.setSystemTime(new Date(startTime));

          const config: RateLimitConfig = { windowMs, maxRequests };

          // Fill up the window
          for (let i = 0; i < maxRequests; i++) {
            checkRateLimit(clientIp, config);
          }

          // Verify rejection
          const rejected = checkRateLimit(clientIp, config);
          expect(rejected.allowed).toBe(false);

          // Advance time past the window so all timestamps expire
          vi.setSystemTime(new Date(startTime + windowMs + 1));

          // Now the request should be allowed again
          const allowed = checkRateLimit(clientIp, config);
          expect(allowed.allowed).toBe(true);
          expect(allowed.remaining).toBe(maxRequests - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('general endpoint config: M=100, W=60000ms', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }), // clientIp
        (clientIp) => {
          resetRateLimitStore();
          vi.setSystemTime(new Date(1_000_000_000_000));

          const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 100 };

          // First 100 requests are allowed
          for (let i = 0; i < 100; i++) {
            const result = checkRateLimit(clientIp, config);
            expect(result.allowed).toBe(true);
          }

          // 101st is rejected
          const rejected = checkRateLimit(clientIp, config);
          expect(rejected.allowed).toBe(false);
          expect(rejected.retryAfterSeconds).toBeDefined();
          expect(rejected.retryAfterSeconds).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('auth endpoint config: M=10, W=60000ms', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }), // clientIp
        (clientIp) => {
          resetRateLimitStore();
          vi.setSystemTime(new Date(1_000_000_000_000));

          const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 10 };

          // First 10 requests are allowed
          for (let i = 0; i < 10; i++) {
            const result = checkRateLimit(clientIp, config);
            expect(result.allowed).toBe(true);
          }

          // 11th is rejected
          const rejected = checkRateLimit(clientIp, config);
          expect(rejected.allowed).toBe(false);
          expect(rejected.retryAfterSeconds).toBeDefined();
          expect(rejected.retryAfterSeconds).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('different IPs have independent rate limit windows', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 15 }), // maxRequests
        fc.integer({ min: 1000, max: 30_000 }), // windowMs
        fc.string({ minLength: 1, maxLength: 20 }), // ip1
        fc.string({ minLength: 1, maxLength: 20 }), // ip2
        (maxRequests, windowMs, ip1Base, ip2Base) => {
          // Ensure IPs are different
          const ip1 = `a_${ip1Base}`;
          const ip2 = `b_${ip2Base}`;

          resetRateLimitStore();
          vi.setSystemTime(new Date(1_000_000_000_000));

          const config: RateLimitConfig = { windowMs, maxRequests };

          // Fill ip1's window
          for (let i = 0; i < maxRequests; i++) {
            checkRateLimit(ip1, config);
          }

          // ip1 is now rate-limited
          const rejectedIp1 = checkRateLimit(ip1, config);
          expect(rejectedIp1.allowed).toBe(false);

          // ip2 should still be allowed
          const allowedIp2 = checkRateLimit(ip2, config);
          expect(allowedIp2.allowed).toBe(true);
          expect(allowedIp2.remaining).toBe(maxRequests - 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
