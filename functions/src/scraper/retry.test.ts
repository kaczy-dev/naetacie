import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateBackoffDelay, retryWithBackoff } from './retry';
import type { RetryConfig, RetryContext } from './retry';

vi.mock('firebase-functions/logger', () => ({
  error: vi.fn(),
}));

describe('calculateBackoffDelay', () => {
  it('returns baseDelayMs * multiplier^0 for attempt 0', () => {
    expect(calculateBackoffDelay(0, 2000, 2)).toBe(2000);
  });

  it('returns baseDelayMs * multiplier^1 for attempt 1', () => {
    expect(calculateBackoffDelay(1, 2000, 2)).toBe(4000);
  });

  it('returns baseDelayMs * multiplier^2 for attempt 2', () => {
    expect(calculateBackoffDelay(2, 2000, 2)).toBe(8000);
  });

  it('works with different base delays and multipliers', () => {
    expect(calculateBackoffDelay(0, 1000, 3)).toBe(1000);
    expect(calculateBackoffDelay(1, 1000, 3)).toBe(3000);
    expect(calculateBackoffDelay(2, 1000, 3)).toBe(9000);
  });
});

describe('retryWithBackoff', () => {
  const defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 2000,
    multiplier: 2,
  };

  const defaultContext: RetryContext = {
    portal: 'olx',
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, defaultConfig, defaultContext);
    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and returns result on subsequent success', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, defaultConfig, defaultContext);

    // Advance past the first backoff delay (attempt 0: 2000ms)
    await vi.advanceTimersByTimeAsync(2000);

    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries multiple times before succeeding', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, defaultConfig, defaultContext);

    // Advance past first backoff (2000ms) and second backoff (4000ms)
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('returns null after all retries are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

    const resultPromise = retryWithBackoff(fn, defaultConfig, defaultContext);

    // Advance past all backoff delays: 2000 + 4000 + 8000
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    await vi.advanceTimersByTimeAsync(8000);

    const result = await resultPromise;

    expect(result).toBeNull();
    // 1 initial + 3 retries = 4 total attempts
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('logs error with portal name, timestamp, and failure reason when retries exhausted', async () => {
    const logger = await import('firebase-functions/logger');
    const fn = vi.fn().mockRejectedValue(new Error('connection timeout'));

    const resultPromise = retryWithBackoff(fn, defaultConfig, defaultContext);

    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    await vi.advanceTimersByTimeAsync(8000);

    await resultPromise;

    expect(logger.error).toHaveBeenCalledWith(
      'All retry attempts exhausted for portal scraping',
      expect.objectContaining({
        portal: 'olx',
        timestamp: expect.any(String),
        failureReason: 'connection timeout',
        totalAttempts: 4,
      })
    );
  });

  it('handles non-Error thrown values in failure reason', async () => {
    const logger = await import('firebase-functions/logger');
    const fn = vi.fn().mockRejectedValue('string error');

    const resultPromise = retryWithBackoff(fn, defaultConfig, defaultContext);

    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    await vi.advanceTimersByTimeAsync(8000);

    await resultPromise;

    expect(logger.error).toHaveBeenCalledWith(
      'All retry attempts exhausted for portal scraping',
      expect.objectContaining({
        failureReason: 'string error',
      })
    );
  });

  it('works with zero maxRetries (single attempt only)', async () => {
    const config: RetryConfig = { maxRetries: 0, baseDelayMs: 1000, multiplier: 2 };
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    const result = await retryWithBackoff(fn, config, defaultContext);

    expect(result).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
