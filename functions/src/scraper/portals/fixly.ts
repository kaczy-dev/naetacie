import type { PortalScraper, ScraperConfig, Browser, ScrapedAd } from '../types';
import { getNextUserAgent } from '../user-agents';
import { getRandomDelay } from '../config';
import { parseCleanPrice, normalizeLocationText } from '../extractor';

/**
 * Playwright Page-like interface for type safety without requiring
 * the full playwright type declarations at compile time.
 */
interface PlaywrightPage {
  setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<unknown>;
  $$(selector: string): Promise<PlaywrightElementHandle[]>;
  $(selector: string): Promise<PlaywrightElementHandle | null>;
  close(): Promise<void>;
}

interface PlaywrightElementHandle {
  $(selector: string): Promise<PlaywrightElementHandle | null>;
  textContent(): Promise<string | null>;
  getAttribute(name: string): Promise<string | null>;
}

/**
 * Base URL for Fixly construction/renovation services in the Szczecin area.
 */
const FIXLY_BASE_URL =
  'https://fixly.pl/szukaj/budowa-i-remont?location=szczecin';

/**
 * CSS selectors for Fixly listing page structure.
 * Extracted into constants for easy maintenance when Fixly changes their HTML.
 */
const SELECTORS = {
  /** Each service listing card on the results page */
  serviceCard: '[data-testid="service-card"], .service-card, .listing-item, article',
  /** Service title element */
  title: '[data-testid="service-title"], .service-title, h2, h3',
  /** Service description/snippet element */
  description: '[data-testid="service-description"], .service-description, .description, p',
  /** Price element */
  price: '[data-testid="service-price"], .service-price, .price',
  /** Location element */
  location: '[data-testid="service-location"], .service-location, .location',
  /** Contact information element */
  contact: '[data-testid="service-contact"], .service-contact, .contact, .phone',
  /** Link to the service detail page */
  detailLink: 'a[href*="/zlecenie/"], a[href*="/profil/"], a',
  /** Next page navigation control */
  nextPage: '[data-testid="pagination-next"], .pagination-next, a[rel="next"], button[aria-label="next"]',
} as const;

/**
 * Extracts a native ID from a Fixly service URL or data attribute.
 * Fixly URLs typically follow patterns like: /zlecenie/{id}/{slug} or /profil/{id}
 */
function extractNativeId(url: string, dataId: string | null): string | null {
  if (dataId) return dataId;

  const zlecenieMatch = url.match(/\/zlecenie\/(\d+)/);
  if (zlecenieMatch) return zlecenieMatch[1];

  const profilMatch = url.match(/\/profil\/(\d+)/);
  if (profilMatch) return profilMatch[1];

  // Try generic numeric ID at end of path
  const genericMatch = url.match(/\/(\d+)(?:\/|$)/);
  if (genericMatch) return genericMatch[1];

  return null;
}

/**
 * Parses a price string from Fixly listing into a numeric value in PLN.
 */
function parsePrice(priceText: string | null): number | null {
  return parseCleanPrice(priceText);
}

/**
 * Delays execution for a random duration within the configured range (2-5s).
 */
function delay(config: ScraperConfig): Promise<void> {
  const ms = getRandomDelay(config);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fixly portal scraper implementation.
 * Scrapes construction/renovation service listings from Fixly.pl
 * for the Szczecin area.
 */
export const fixlyScraper: PortalScraper = {
  portal: 'fixly',

  async scrape(browser: Browser, config: ScraperConfig): Promise<ScrapedAd[]> {
    const ads: ScrapedAd[] = [];
    const page = (await browser.newPage()) as unknown as PlaywrightPage;

    try {
      let currentPage = 1;
      let hasNextPage = true;

      while (hasNextPage && ads.length < config.maxAdsPerPortal) {
        // Rotate User-Agent for each page request
        const userAgent = getNextUserAgent(config.userAgents);
        await page.setExtraHTTPHeaders({ 'User-Agent': userAgent });

        // Build URL with pagination
        const url =
          currentPage === 1
            ? FIXLY_BASE_URL
            : `${FIXLY_BASE_URL}&page=${currentPage}`;

        // Navigate to the listing page
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        // Wait for service cards to appear (or timeout gracefully)
        await page
          .waitForSelector(SELECTORS.serviceCard, { timeout: 10_000 })
          .catch(() => null);

        // Extract all service cards on the current page
        const cardElements = await page.$$(SELECTORS.serviceCard);

        if (cardElements.length === 0) {
          hasNextPage = false;
          break;
        }

        for (const card of cardElements) {
          if (ads.length >= config.maxAdsPerPortal) break;

          try {
            const adData = await extractAdFromCard(card, url);
            if (adData) {
              ads.push(adData);
            }
          } catch {
            // Skip individual ad on parse error, continue with remaining
            continue;
          }
        }

        // Check for next page
        const nextPageLink = await page.$(SELECTORS.nextPage);
        hasNextPage = nextPageLink !== null;

        currentPage++;

        // Random delay between page requests (2-5s)
        if (hasNextPage && ads.length < config.maxAdsPerPortal) {
          await delay(config);
        }
      }
    } finally {
      await page.close();
    }

    return ads;
  },
};

/**
 * Extracts ad data from a single Fixly service card element.
 * Returns null if critical data (title) cannot be extracted.
 */
async function extractAdFromCard(
  card: PlaywrightElementHandle,
  pageUrl: string,
): Promise<ScrapedAd | null> {
  // Extract title
  const titleElement = await card.$(SELECTORS.title);
  const title = titleElement
    ? (await titleElement.textContent())?.trim() ?? ''
    : '';

  if (!title) return null;

  // Extract description snippet
  const descElement = await card.$(SELECTORS.description);
  const description = descElement
    ? (await descElement.textContent())?.trim() ?? ''
    : '';

  // Extract price
  const priceElement = await card.$(SELECTORS.price);
  const priceText = priceElement ? await priceElement.textContent() : null;
  const price = parsePrice(priceText);

  // Extract location
  const locationElement = await card.$(SELECTORS.location);
  const locationText = locationElement
    ? (await locationElement.textContent())?.trim() ?? ''
    : 'Szczecin';

  // Extract contact info
  const contactElement = await card.$(SELECTORS.contact);
  const contactInfo = contactElement
    ? (await contactElement.textContent())?.trim() ?? null
    : null;

  // Extract link/URL and native ID
  const linkElement = await card.$(SELECTORS.detailLink);
  const href = linkElement ? await linkElement.getAttribute('href') : null;

  const sourceUrl = href
    ? href.startsWith('http')
      ? href
      : `https://fixly.pl${href}`
    : pageUrl;

  // Try to get native ID from data attribute or URL
  const dataId = await card.getAttribute('data-id');
  const dataServiceId = await card.getAttribute('data-service-id');
  const nativeId = extractNativeId(sourceUrl, dataId || dataServiceId);

  return {
    nativeId,
    title,
    description,
    sourceUrl,
    sourcePortal: 'fixly',
    category: 'construction',
    locationText: locationText || 'Szczecin',
    price,
    contactInfo: contactInfo || null,
    publishedAt: null,
  };
}

export default fixlyScraper;
