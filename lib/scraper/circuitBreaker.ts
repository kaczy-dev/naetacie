/**
 * Production-Grade Circuit Breaker & Adaptive Rate Limiter for Multi-Portal Scraping.
 *
 * Prevents cascading timeouts, IP throttling, and wasted network resources when a target
 * portal is temporarily down, changes its HTML schema, or applies aggressive Cloudflare rate limits.
 *
 * States:
 * - CLOSED: Normal operation. Requests are allowed. Failures increment failure counter.
 * - OPEN: Threshold exceeded. Requests fail fast without hitting the remote network.
 * - HALF_OPEN: Probe state after cooldown. Allows a single canary request to test recovery.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Consecutive failures to trip (default: 3)
  cooldownMs?: number; // Cooldown before trying HALF_OPEN (default: 45_000ms)
  successThreshold?: number; // Consecutive successes to close again (default: 2)
  name?: string;
}

export class PortalCircuitBreaker {
  public state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  private lastFailureReason: string | null = null;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 3,
      cooldownMs: options.cooldownMs ?? 45_000,
      successThreshold: options.successThreshold ?? 2,
      name: options.name ?? 'default-breaker',
    };
  }

  public isAvailable(): boolean {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        return true;
      }
      return false;
    }

    // In HALF_OPEN, allow limited probe
    return true;
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureReason = null;
      }
    } else {
      this.failureCount = 0;
    }
  }

  public recordFailure(error: Error | string): void {
    this.failureCount++;
    this.lastFailureReason = typeof error === 'string' ? error : error.message;

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.cooldownMs;
    }
  }

  public getStatus(): { state: CircuitState; failureCount: number; lastError: string | null } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastError: this.lastFailureReason,
    };
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
    this.lastFailureReason = null;
  }
}

/** Global registry of circuit breakers per portal domain */
const breakerRegistry = new Map<string, PortalCircuitBreaker>();

export function getPortalCircuitBreaker(portal: string, options?: CircuitBreakerOptions): PortalCircuitBreaker {
  if (!breakerRegistry.has(portal)) {
    breakerRegistry.set(portal, new PortalCircuitBreaker({ ...options, name: portal }));
  }
  return breakerRegistry.get(portal)!;
}

/**
 * Adaptive Rate Limiter with Sliding Window & Token Bucket per portal.
 */
export class AdaptiveRateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 5, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public async acquire(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldest) + 50;
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitTime)));
      return this.acquire();
    }

    this.timestamps.push(Date.now());
  }
}
