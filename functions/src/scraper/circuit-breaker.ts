/**
 * Circuit Breaker pattern implementation for web scraping.
 *
 * Prevents cascading failures and IP bans when a portal returns
 * repeated 429 (Too Many Requests), 403 (Forbidden), or network timeouts.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. Default: 3 */
  failureThreshold?: number;
  /** Cooldown period in ms before moving from OPEN to HALF_OPEN. Default: 30,000 (30s) */
  cooldownMs?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private nextAttemptTime = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30_000;
  }

  /** Gets the current circuit state */
  getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  /**
   * Checks if an execution is allowed.
   * Throws an error if the circuit is OPEN.
   */
  canExecute(): boolean {
    const currentState = this.getState();
    return currentState !== 'OPEN';
  }

  /** Records a successful execution, resetting failure counts */
  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  /** Records a failed execution, incrementing failures and potentially opening the circuit */
  recordFailure(): void {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.cooldownMs;
    }
  }

  /**
   * Executes a given async operation guarded by the circuit breaker.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error(`CircuitBreaker is OPEN. Cooldown expires at ${new Date(this.nextAttemptTime).toISOString()}`);
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}
