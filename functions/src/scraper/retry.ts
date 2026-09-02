import * as logger from 'firebase-functions/logger';

/**
 * Configuration for exponential backoff retry behavior.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts. Default: 3 */
  maxRetries: number;
  /** Base delay in milliseconds before first retry. Default: 2000 */
  baseDelayMs: number;
  /** Multiplier applied to base delay for each subsequent attempt. Default: 2 */
  multiplier: number;
}

/**
 * Context information for logging on failure.
 */
export interface RetryContext {
  portal: string;
}

/**
 * Pure function: calculates the backoff delay for a given attempt.
 *
 * @param attempt - Zero-based attempt number (0, 1, 2, ...)
 * @param baseDelayMs - Base delay in milliseconds
 * @param multiplier - Multiplier applied exponentially
 * @returns Delay in milliseconds: baseDelayMs * multiplier^attempt
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  multiplier: number
): number {
  return baseDelayMs * Math.pow(multiplier, attempt);
}

/**
 * Delays execution for the specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff.
 *
 * On each failure, waits baseDelayMs * multiplier^attempt before retrying.
 * After all retries are exhausted, logs the error with portal name, timestamp,
 * and failure reason to Cloud Logging and returns null.
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration (maxRetries, baseDelayMs, multiplier)
 * @param context - Context for error logging (portal name)
 * @returns The result of fn on success, or null if all retries are exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  context: RetryContext
): Promise<T | null> {
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === config.maxRetries;

      if (isLastAttempt) {
        const failureReason =
          error instanceof Error ? error.message : String(error);

        logger.error('All retry attempts exhausted for portal scraping', {
          portal: context.portal,
          timestamp: new Date().toISOString(),
          failureReason,
          totalAttempts: config.maxRetries + 1,
        });

        return null;
      }

      // Wait before next retry with exponential backoff
      const delay = calculateBackoffDelay(
        attempt,
        config.baseDelayMs,
        config.multiplier
      );
      await sleep(delay);
    }
  }

  // Unreachable, but TypeScript needs this
  return null;
}
