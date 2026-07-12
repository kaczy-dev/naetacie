import type { ScraperConfig } from './types';
import { USER_AGENTS } from './user-agents';

/**
 * Default scraper configuration.
 * Values can be overridden per environment or at runtime.
 */
export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  cronSchedule: '0 */6 * * *',
  maxAdsPerPortal: 500,
  minDelayMs: 2000,
  maxDelayMs: 5000,
  maxRetries: 3,
  retryBaseDelayMs: 2000,
  retryMultiplier: 2,
  userAgents: USER_AGENTS,
};

/**
 * Returns a random delay between minDelayMs and maxDelayMs (inclusive).
 */
export function getRandomDelay(config: ScraperConfig): number {
  return (
    Math.floor(Math.random() * (config.maxDelayMs - config.minDelayMs + 1)) +
    config.minDelayMs
  );
}
