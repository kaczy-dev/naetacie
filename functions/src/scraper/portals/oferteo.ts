import type { PortalScraper, ScraperConfig, Browser } from '../types';
import type { ScrapedAd } from '@lib/types/announcement';
import { getNextUserAgent } from '../user-agents';
import { getRandomDelay } from '../config';

/**
 * Base URL for Oferteo construction services in the Szczecin area.
 */
const BASE_URL =
  'https://www.oferteo.pl/remont-i-wykonczenie-mieszkan/szczecin';

/**
 * Extracts a native identifier from an Oferteo listing URL or data attribute.
 * Falls back to null if no ID can be determined.
 */
function extractNativeId(url: string): string | null {
  // Oferteo URLs often contain a slug with a numeric suffix, e.g. /firma/nazwa-12345
  const match = url.match(/\/(\d+)(?:[/?#]|$)/);
  if (match) {
    return match[1];
  }
  // Try slug as fallback identifier
  const slugMatch = url.match(/\/([^/]+)\/?$/);
  return slugMatch ? slugMatch[1] : null;
}

/**
 * Parses a price string from Oferteo into a numeric value in PLN or null.
 */
function parsePrice(priceText: string | null): number | null {
  if (!priceText) return null;
  const cleaned = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * Delays execution for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Oferteo portal scraper.
 *
 * Navigates through Oferteo.pl construction/renovation service listings
 * for the Szczecin area, extracting provider and service data from
 * listing pages.
 */
export const oferteoScraper: PortalScraper = {
  portal: 'oferteo',

  async scrape(browser: Browser, config: ScraperConfig): Promise<ScrapedAd[]> {
    const ads: ScrapedAd[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    const page = (await browser.newPage()) as {
      setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
      goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
      $$eval<T>(selector: string, fn: (elements: Element[]) => T): Promise<T>;
      $(selector: string): Promise<unknown | null>;
      close(): Promise<void>;
    };

    try {
      while (hasNextPage && ads.length < config.maxAdsPerPortal) {
        const userAgent = getNextUserAgent(config.userAgents);
        await page.setExtraHTTPHeaders({ 'User-Agent': userAgent });

        const url =
          currentPage === 1
            ? BASE_URL
            : `${BASE_URL}/${currentPage}`;

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Extract listings from the current page
        const listings = await page.$$eval(
          '.service-item, .offer-item, .company-item',
          (elements: Element[]) => {
            return elements.map((el) => {
              const titleEl = el.querySelector(
                '.title a, .company-name a, h2 a, h3 a'
              );
              const descEl = el.querySelector(
                '.description, .offer-description, .service-desc, p'
              );
              const priceEl = el.querySelector(
                '.price, .offer-price, .cost'
              );
              const locationEl = el.querySelector(
                '.location, .address, .city'
              );
              const contactEl = el.querySelector(
                '.phone, .contact-info, .tel'
              );

              const link = titleEl?.getAttribute('href') ?? '';
              const title = titleEl?.textContent?.trim() ?? '';
              const description = descEl?.textContent?.trim() ?? '';
              const priceText = priceEl?.textContent?.trim() ?? null;
              const locationText =
                locationEl?.textContent?.trim() ?? 'Szczecin';
              const contactInfo =
                contactEl?.textContent?.trim() ?? null;

              return {
                link,
                title,
                description,
                priceText,
                locationText,
                contactInfo,
              };
            });
          }
        );

        // If no listings found, we've reached the end
        if (listings.length === 0) {
          hasNextPage = false;
          break;
        }

        // Process extracted listings
        for (const listing of listings) {
          if (ads.length >= config.maxAdsPerPortal) break;
          if (!listing.title) continue;

          const sourceUrl = listing.link.startsWith('http')
            ? listing.link
            : listing.link
              ? `https://www.oferteo.pl${listing.link}`
              : url;

          const nativeId = extractNativeId(sourceUrl);

          ads.push({
            nativeId,
            title: listing.title,
            description: listing.description,
            sourceUrl,
            sourcePortal: 'oferteo',
            category: 'construction',
            locationText: listing.locationText,
            price: parsePrice(listing.priceText),
            contactInfo: listing.contactInfo || null,
            publishedAt: null,
          });
        }

        // Check if there are no results or no next page
        const nextPageExists = await page.$(
          'a.next, .pagination a[rel="next"], .pagination .next, a[aria-label="Next"]'
        );
        hasNextPage = nextPageExists !== null;

        currentPage++;

        // Introduce random delay between page requests
        if (hasNextPage && ads.length < config.maxAdsPerPortal) {
          const delayMs = getRandomDelay(config);
          await sleep(delayMs);
        }
      }
    } finally {
      await page.close();
    }

    return ads;
  },
};
