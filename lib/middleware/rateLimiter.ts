/**
 * Rate Limiter Middleware - Sliding Window Implementation
 *
 * Tracks request timestamps per IP address using an in-memory Map.
 * Prunes expired entries on each check to prevent memory leaks.
 *
 * Configuration:
 * - General endpoints: 100 requests per 60-second window
 * - Auth endpoints: 10 requests per 60-second window
 */

export interface RateLimitConfig {
  windowMs: number; // Sliding window duration in milliseconds
  maxRequests: number; // Maximum requests allowed per window
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  remaining: number;
}

/** Predefined config for general API endpoints */
export const GENERAL_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 100,
};

/** Predefined config for auth endpoints (login, register) */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,
};

/**
 * In-memory store of request timestamps per client IP.
 * Key: client IP (or prefixed key like `auth:<ip>` for auth endpoints)
 * Value: array of request timestamps (epoch ms) within the current window
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Check whether a request from the given client IP is allowed
 * under the specified rate limit configuration.
 *
 * Uses a sliding window approach: only timestamps within the last
 * `config.windowMs` milliseconds are counted.
 *
 * @param clientIp - The client's IP address (or a prefixed key)
 * @param config - Rate limit configuration (window size and max requests)
 * @returns RateLimitResult indicating whether the request is allowed
 */
export function checkRateLimit(
  clientIp: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get existing timestamps or initialize empty array
  const timestamps = rateLimitStore.get(clientIp) || [];

  // Prune expired entries (those outside the current sliding window)
  const validTimestamps = timestamps.filter((ts) => ts > windowStart);

  if (validTimestamps.length >= config.maxRequests) {
    // Rate limit exceeded - calculate retry-after based on oldest timestamp in window
    const oldestTimestamp = validTimestamps[0];
    const retryAfterMs = oldestTimestamp + config.windowMs - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    // Update store with pruned timestamps
    rateLimitStore.set(clientIp, validTimestamps);

    return {
      allowed: false,
      retryAfterSeconds: Math.max(retryAfterSeconds, 1),
      remaining: 0,
    };
  }

  // Request is allowed - add current timestamp
  validTimestamps.push(now);
  rateLimitStore.set(clientIp, validTimestamps);

  return {
    allowed: true,
    remaining: config.maxRequests - validTimestamps.length,
  };
}

/**
 * Reset the rate limit store. Primarily for testing purposes.
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Get the current size of the rate limit store.
 * Useful for monitoring memory usage.
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}
