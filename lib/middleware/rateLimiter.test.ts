import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimitStore,
  GENERAL_RATE_LIMIT,
  AUTH_RATE_LIMIT,
  getRateLimitStoreSize,
  RateLimitConfig,
} from './rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('allows the first request from a new IP', () => {
      const result = checkRateLimit('192.168.1.1', GENERAL_RATE_LIMIT);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
      expect(result.retryAfterSeconds).toBeUndefined();
    });

    it('tracks remaining requests correctly', () => {
      const ip = '10.0.0.1';
      for (let i = 0; i < 5; i++) {
        checkRateLimit(ip, GENERAL_RATE_LIMIT);
      }
      const result = checkRateLimit(ip, GENERAL_RATE_LIMIT);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(94);
    });

    it('rejects requests after exceeding the general limit (100)', () => {
      const ip = '172.16.0.1';
      for (let i = 0; i < 100; i++) {
        const res = checkRateLimit(ip, GENERAL_RATE_LIMIT);
        expect(res.allowed).toBe(true);
      }
      const result = checkRateLimit(ip, GENERAL_RATE_LIMIT);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('rejects requests after exceeding the auth limit (10)', () => {
      const ip = 'auth:192.168.1.1';
      for (let i = 0; i < 10; i++) {
        const res = checkRateLimit(ip, AUTH_RATE_LIMIT);
        expect(res.allowed).toBe(true);
      }
      const result = checkRateLimit(ip, AUTH_RATE_LIMIT);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('allows requests again after the window expires', () => {
      const ip = '10.0.0.2';
      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit(ip, AUTH_RATE_LIMIT);
      }
      expect(checkRateLimit(ip, AUTH_RATE_LIMIT).allowed).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(60_001);

      const result = checkRateLimit(ip, AUTH_RATE_LIMIT);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('uses a sliding window (partial expiry)', () => {
      const ip = '10.0.0.3';
      const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 5 };

      // Make 3 requests at t=0
      for (let i = 0; i < 3; i++) {
        checkRateLimit(ip, config);
      }

      // Advance 30 seconds
      vi.advanceTimersByTime(30_000);

      // Make 2 more requests at t=30s
      for (let i = 0; i < 2; i++) {
        checkRateLimit(ip, config);
      }

      // At t=30s, all 5 requests are within window — next should be rejected
      expect(checkRateLimit(ip, config).allowed).toBe(false);

      // Advance to t=61s — the first 3 requests (made at t=0) expire
      vi.advanceTimersByTime(31_000);

      const result = checkRateLimit(ip, config);
      expect(result.allowed).toBe(true);
      // 2 requests from t=30s still valid + this new one = 3, so remaining = 2
      expect(result.remaining).toBe(2);
    });

    it('tracks different IPs independently', () => {
      const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 2 };

      checkRateLimit('ip-a', config);
      checkRateLimit('ip-a', config);
      checkRateLimit('ip-b', config);

      expect(checkRateLimit('ip-a', config).allowed).toBe(false);
      expect(checkRateLimit('ip-b', config).allowed).toBe(true);
    });

    it('returns retryAfterSeconds based on oldest request in window', () => {
      const ip = '10.0.0.4';
      const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 3 };

      // Make 3 requests
      checkRateLimit(ip, config);
      vi.advanceTimersByTime(10_000);
      checkRateLimit(ip, config);
      vi.advanceTimersByTime(10_000);
      checkRateLimit(ip, config);

      // Now at t=20s, limit reached. Next request should report retry-after
      const result = checkRateLimit(ip, config);
      expect(result.allowed).toBe(false);
      // Oldest request is at t=0, expires at t=60s, we're at t=20s → 40s remaining
      expect(result.retryAfterSeconds).toBe(40);
    });

    it('retryAfterSeconds is at least 1', () => {
      const ip = '10.0.0.5';
      const config: RateLimitConfig = { windowMs: 1000, maxRequests: 1 };

      checkRateLimit(ip, config);
      // Advance almost to the edge
      vi.advanceTimersByTime(999);

      const result = checkRateLimit(ip, config);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });
  });

  describe('resetRateLimitStore', () => {
    it('clears all tracked entries', () => {
      checkRateLimit('ip-1', GENERAL_RATE_LIMIT);
      checkRateLimit('ip-2', GENERAL_RATE_LIMIT);
      expect(getRateLimitStoreSize()).toBe(2);

      resetRateLimitStore();
      expect(getRateLimitStoreSize()).toBe(0);
    });
  });

  describe('predefined configs', () => {
    it('GENERAL_RATE_LIMIT has correct values', () => {
      expect(GENERAL_RATE_LIMIT.windowMs).toBe(60_000);
      expect(GENERAL_RATE_LIMIT.maxRequests).toBe(100);
    });

    it('AUTH_RATE_LIMIT has correct values', () => {
      expect(AUTH_RATE_LIMIT.windowMs).toBe(60_000);
      expect(AUTH_RATE_LIMIT.maxRequests).toBe(10);
    });
  });
});
