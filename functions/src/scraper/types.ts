import type { SourcePortal, ScrapedAd } from '@lib/types/announcement';

export type { SourcePortal, ScrapedAd } from '@lib/types/announcement';

/**
 * Minimal Browser interface for portal scrapers.
 * Uses only what's needed to avoid requiring the full playwright dependency at type-check time.
 */
export interface Browser {
  newPage(): Promise<unknown>;
  close(): Promise<void>;
}

/**
 * Configuration for the scraping engine.
 */
export interface ScraperConfig {
  /** Cron expression for scheduled runs. Default: "0 *​/6 * * *" */
  cronSchedule: string;
  /** Maximum ads to scrape per portal per run. Default: 500 */
  maxAdsPerPortal: number;
  /** Minimum random delay between page requests in ms. Default: 2000 */
  minDelayMs: number;
  /** Maximum random delay between page requests in ms. Default: 5000 */
  maxDelayMs: number;
  /** Maximum retry attempts on failure. Default: 3 */
  maxRetries: number;
  /** Base delay for exponential backoff in ms. Default: 2000 */
  retryBaseDelayMs: number;
  /** Multiplier for exponential backoff. Default: 2 */
  retryMultiplier: number;
  /** User-Agent strings for rotation (minimum 5). */
  userAgents: string[];
}

/**
 * Summary of a single portal scraping run.
 */
export interface ScrapingResult {
  portal: SourcePortal;
  adsScraped: number;
  adsDeduplicated: number;
  adsStored: number;
  errors: ScrapingError[];
}

/**
 * Error that occurred during a scraping attempt.
 */
export interface ScrapingError {
  portal: SourcePortal;
  timestamp: Date;
  reason: string;
  retryAttempt: number;
}

/**
 * Interface that portal-specific scrapers must implement.
 */
export interface PortalScraper {
  portal: SourcePortal;
  scrape(browser: Browser, config: ScraperConfig): Promise<ScrapedAd[]>;
}
