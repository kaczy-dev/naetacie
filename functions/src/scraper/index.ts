/**
 * Scheduled scraper orchestrator.
 *
 * Firebase Cloud Function v2 that runs every 6 hours to scrape
 * construction/renovation ads from OLX, Oferteo, and Fixly portals.
 *
 * Pipeline per portal:
 * 1. Scrape ads using Playwright with stealth plugin
 * 2. Generate deduplication keys and batch-check existence in Firestore
 * 3. Geocode new ads via resolveLocation (cache-first, Nominatim fallback)
 * 4. Batch write new announcements to Firestore (groups of up to 500)
 *
 * If a portal fails after all retries, the orchestrator logs the failure
 * and continues with remaining portals.
 */

import { onSchedule, type ScheduledEvent } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

import { DEFAULT_SCRAPER_CONFIG } from './config';
import { retryWithBackoff } from './retry';
import { olxScraper } from './portals/olx';
import { oferteoScraper } from './portals/oferteo';
import { fixlyScraper } from './portals/fixly';
import { generateDeduplicationKey, batchCheckExists } from '../deduplication';
import { resolveLocation } from '../geocoding';
import { splitIntoBatches } from '../batch';
import { processNotifications } from '../notifications';
import type { PortalScraper, ScrapingResult, Browser } from './types';
import type { ScrapedAd, Announcement } from '@lib/types/announcement';

// Ensure Firebase Admin is initialized
if (getApps().length === 0) {
  initializeApp();
}

/** All portal scrapers to orchestrate */
const PORTAL_SCRAPERS: PortalScraper[] = [olxScraper, oferteoScraper, fixlyScraper];

/**
 * Launches Playwright browser with stealth plugin enabled.
 * Returns a Browser instance that portal scrapers can use.
 */
async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import('playwright-extra');
  const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;

  chromium.use(StealthPlugin());

  const browser = await chromium.launch({ headless: true });
  return browser as unknown as Browser;
}

/**
 * Processes a single portal: scrapes ads, deduplicates, geocodes, and stores.
 *
 * @param scraper - Portal scraper implementation
 * @param browser - Playwright browser instance
 * @returns ScrapingResult summary for the portal
 */
async function processPortal(
  scraper: PortalScraper,
  browser: Browser
): Promise<ScrapingResult> {
  const firestore = getFirestore();
  const config = DEFAULT_SCRAPER_CONFIG;
  const result: ScrapingResult = {
    portal: scraper.portal,
    adsScraped: 0,
    adsDeduplicated: 0,
    adsStored: 0,
    errors: [],
  };

  // Step 1: Scrape ads from the portal with retry logic
  const scrapedAds = await retryWithBackoff<ScrapedAd[]>(
    () => scraper.scrape(browser, config),
    {
      maxRetries: config.maxRetries,
      baseDelayMs: config.retryBaseDelayMs,
      multiplier: config.retryMultiplier,
    },
    { portal: scraper.portal }
  );

  // If all retries failed, return early with zero results
  if (scrapedAds === null) {
    result.errors.push({
      portal: scraper.portal,
      timestamp: new Date(),
      reason: 'All retry attempts exhausted for portal scraping',
      retryAttempt: config.maxRetries,
    });
    return result;
  }

  result.adsScraped = scrapedAds.length;

  if (scrapedAds.length === 0) {
    return result;
  }

  // Step 2: Generate deduplication keys
  const adKeyPairs = scrapedAds.map((ad) => ({
    ad,
    key: generateDeduplicationKey(ad),
  }));

  // Step 3: Batch check existence in Firestore
  const keys = adKeyPairs.map((pair) => pair.key);
  const existenceMap = await batchCheckExists(firestore, keys);

  // Filter to only new (non-existing) ads
  const newAdPairs = adKeyPairs.filter(
    (pair) => !existenceMap.get(pair.key)
  );

  result.adsDeduplicated = scrapedAds.length - newAdPairs.length;

  if (newAdPairs.length === 0) {
    return result;
  }

  // Step 4: Geocode new ads
  const announcementsToWrite: Array<{
    key: string;
    data: Record<string, unknown>;
  }> = [];

  for (const { ad, key } of newAdPairs) {
    const geo = await resolveLocation(ad.locationText, firestore);

    announcementsToWrite.push({
      key,
      data: {
        deduplication_key: key,
        title: ad.title,
        description: ad.description,
        source_url: ad.sourceUrl,
        source_portal: ad.sourcePortal,
        category: ad.category,
        location_text: ad.locationText,
        latitude: geo.latitude,
        longitude: geo.longitude,
        price: ad.price,
        contact_info: ad.contactInfo,
        scraped_at: new Date(),
        published_at: ad.publishedAt,
      },
    });
  }

  // Step 5: Batch write to Firestore (max 500 per batch commit)
  const batches = splitIntoBatches(announcementsToWrite, 500);

  for (const batch of batches) {
    const writeBatch = firestore.batch();

    for (const item of batch) {
      const docRef = firestore.collection('announcements').doc(item.key);
      writeBatch.set(docRef, item.data);
    }

    await writeBatch.commit();
  }

  result.adsStored = announcementsToWrite.length;

  // Step 6: Trigger notifications for newly stored announcements
  const storedAnnouncements: Announcement[] = announcementsToWrite.map((item) => ({
    deduplication_key: item.data.deduplication_key as string,
    title: item.data.title as string,
    description: item.data.description as string,
    source_url: item.data.source_url as string,
    source_portal: item.data.source_portal as Announcement['source_portal'],
    category: item.data.category as string,
    location_text: item.data.location_text as string,
    latitude: item.data.latitude as number | null,
    longitude: item.data.longitude as number | null,
    price: item.data.price as number | null,
    contact_info: item.data.contact_info as string | null,
    scraped_at: item.data.scraped_at as Date,
    published_at: item.data.published_at as Date | null,
  }));

  try {
    await processNotifications(storedAnnouncements, firestore);
  } catch (error) {
    // Notification failures should not break the scraping pipeline
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('Notification processing failed', {
      portal: scraper.portal,
      announcementCount: storedAnnouncements.length,
      reason,
    });
  }

  return result;
}

/**
 * Scheduled scraper Cloud Function.
 *
 * Runs every 6 hours (0 *​/6 * * *), with 540s timeout and 1GiB memory.
 * Orchestrates scraping across all portals, handles failures gracefully,
 * and logs a summary on completion.
 */
export const scheduledScraper = onSchedule(
  {
    schedule: '0 */6 * * *',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (_event: ScheduledEvent): Promise<void> => {
    logger.info('Scheduled scraper run started');

    let browser: Browser | null = null;
    const results: ScrapingResult[] = [];
    let failedPortals = 0;

    try {
      // Launch Playwright browser with stealth
      browser = await launchBrowser();

      // Process each portal independently
      for (const scraper of PORTAL_SCRAPERS) {
        try {
          const result = await processPortal(scraper, browser);
          results.push(result);

          if (result.errors.length > 0) {
            failedPortals++;
          }
        } catch (error) {
          // If a portal fails unexpectedly (beyond retry logic), log and continue
          failedPortals++;
          const reason = error instanceof Error ? error.message : String(error);

          logger.error(`Portal ${scraper.portal} failed unexpectedly`, {
            portal: scraper.portal,
            timestamp: new Date().toISOString(),
            reason,
          });

          results.push({
            portal: scraper.portal,
            adsScraped: 0,
            adsDeduplicated: 0,
            adsStored: 0,
            errors: [
              {
                portal: scraper.portal,
                timestamp: new Date(),
                reason,
                retryAttempt: DEFAULT_SCRAPER_CONFIG.maxRetries,
              },
            ],
          });
        }
      }
    } finally {
      // Always close the browser
      if (browser) {
        await browser.close();
      }
    }

    // Log summary on completion
    const summary = results.map((r) => ({
      portal: r.portal,
      scraped: r.adsScraped,
      deduplicated: r.adsDeduplicated,
      stored: r.adsStored,
    }));

    logger.info('Scheduled scraper run completed', {
      summary,
      failedPortals,
      totalAdsScraped: results.reduce((sum, r) => sum + r.adsScraped, 0),
      totalAdsStored: results.reduce((sum, r) => sum + r.adsStored, 0),
    });
  }
);
