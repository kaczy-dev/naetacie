import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PortalCircuitBreaker,
  getPortalCircuitBreaker,
  AdaptiveRateLimiter,
} from '@/lib/scraper/circuitBreaker';

describe('PortalCircuitBreaker & AdaptiveRateLimiter', () => {
  let breaker: PortalCircuitBreaker;

  beforeEach(() => {
    breaker = new PortalCircuitBreaker({
      failureThreshold: 3,
      cooldownMs: 500,
      successThreshold: 2,
    });
  });

  describe('PortalCircuitBreaker', () => {
    it('starts in CLOSED state and allows requests', () => {
      expect(breaker.state).toBe('CLOSED');
      expect(breaker.isAvailable()).toBe(true);
    });

    it('transitions from CLOSED to OPEN after reaching failure threshold', () => {
      breaker.recordFailure('Timeout 1');
      expect(breaker.state).toBe('CLOSED');
      expect(breaker.isAvailable()).toBe(true);

      breaker.recordFailure('Timeout 2');
      expect(breaker.state).toBe('CLOSED');

      breaker.recordFailure('Timeout 3');
      expect(breaker.state).toBe('OPEN');
      expect(breaker.isAvailable()).toBe(false);
      expect(breaker.getStatus().lastError).toBe('Timeout 3');
    });

    it('transitions to HALF_OPEN after cooldown and can close again upon consecutive successes', async () => {
      breaker.recordFailure('Err 1');
      breaker.recordFailure('Err 2');
      breaker.recordFailure('Err 3');
      expect(breaker.state).toBe('OPEN');
      expect(breaker.isAvailable()).toBe(false);

      // Wait for cooldown
      await new Promise((r) => setTimeout(r, 550));

      expect(breaker.isAvailable()).toBe(true);
      expect(breaker.state).toBe('HALF_OPEN');

      // First success in HALF_OPEN
      breaker.recordSuccess();
      expect(breaker.state).toBe('HALF_OPEN');

      // Second success in HALF_OPEN (meets successThreshold=2)
      breaker.recordSuccess();
      expect(breaker.state).toBe('CLOSED');
      expect(breaker.isAvailable()).toBe(true);
    });

    it('re-opens immediately if probe fails in HALF_OPEN state', async () => {
      breaker.recordFailure('Err 1');
      breaker.recordFailure('Err 2');
      breaker.recordFailure('Err 3');

      await new Promise((r) => setTimeout(r, 550));
      expect(breaker.isAvailable()).toBe(true);
      expect(breaker.state).toBe('HALF_OPEN');

      breaker.recordFailure('Probe failed');
      expect(breaker.state).toBe('OPEN');
      expect(breaker.isAvailable()).toBe(false);
    });

    it('manages singleton breakers via getPortalCircuitBreaker', () => {
      const b1 = getPortalCircuitBreaker('olx');
      const b2 = getPortalCircuitBreaker('olx');
      expect(b1).toBe(b2);
    });
  });

  describe('AdaptiveRateLimiter', () => {
    it('allows requests within window capacity', async () => {
      const limiter = new AdaptiveRateLimiter(5, 500);
      const start = Date.now();

      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(Date.now() - start).toBeLessThan(100);
    });
  });
});
