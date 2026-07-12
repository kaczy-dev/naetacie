import { describe, it, expect } from 'vitest';
import { DEFAULT_SCRAPER_CONFIG, getRandomDelay } from './config';

describe('DEFAULT_SCRAPER_CONFIG', () => {
  it('has correct default cron schedule (every 6 hours)', () => {
    expect(DEFAULT_SCRAPER_CONFIG.cronSchedule).toBe('0 */6 * * *');
  });

  it('has maxAdsPerPortal set to 500', () => {
    expect(DEFAULT_SCRAPER_CONFIG.maxAdsPerPortal).toBe(500);
  });

  it('has minDelayMs set to 2000', () => {
    expect(DEFAULT_SCRAPER_CONFIG.minDelayMs).toBe(2000);
  });

  it('has maxDelayMs set to 5000', () => {
    expect(DEFAULT_SCRAPER_CONFIG.maxDelayMs).toBe(5000);
  });

  it('has maxRetries set to 3', () => {
    expect(DEFAULT_SCRAPER_CONFIG.maxRetries).toBe(3);
  });

  it('has retryBaseDelayMs set to 2000', () => {
    expect(DEFAULT_SCRAPER_CONFIG.retryBaseDelayMs).toBe(2000);
  });

  it('has retryMultiplier set to 2', () => {
    expect(DEFAULT_SCRAPER_CONFIG.retryMultiplier).toBe(2);
  });

  it('has at least 5 user agents', () => {
    expect(DEFAULT_SCRAPER_CONFIG.userAgents.length).toBeGreaterThanOrEqual(5);
  });
});

describe('getRandomDelay', () => {
  it('returns a value between minDelayMs and maxDelayMs', () => {
    for (let i = 0; i < 100; i++) {
      const delay = getRandomDelay(DEFAULT_SCRAPER_CONFIG);
      expect(delay).toBeGreaterThanOrEqual(DEFAULT_SCRAPER_CONFIG.minDelayMs);
      expect(delay).toBeLessThanOrEqual(DEFAULT_SCRAPER_CONFIG.maxDelayMs);
    }
  });

  it('returns integer values', () => {
    for (let i = 0; i < 50; i++) {
      const delay = getRandomDelay(DEFAULT_SCRAPER_CONFIG);
      expect(Number.isInteger(delay)).toBe(true);
    }
  });
});
