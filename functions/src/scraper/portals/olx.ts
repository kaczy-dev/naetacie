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
 * Base URL for OLX construction/renovation category in Szczecin area (50km radius).
 * OLX uses `search[dist]` param for radius and `search[city_id]` for Szczecin.
 */
const OLX_BASE_URL =
  'https://www.olx.pl/uslugi-firmy/budowa-remont/szczecin/?search%5Bdist%5D=50';

/**
 * CSS selectors for OLX listing page structure.
 * Extracted into constants for easy maintenance when OLX changes their HTML.
 */
const SELECTORS = {
  /** Each ad listing card on the results page */
  adCard: '[data-testid="l-card"], div[data-cy="l-card"], .css-1sw7q4x, .offer-wrapper',
  /** Ad title element */
  title: '[data-testid="ad-title"], h6, .css-16v5mdi, .title-cell h3',
  /** Ad description/snippet element */
  description: '[data-testid="ad-description"], .css-1m0lm5b, p',
  /** Price element */
  price: '[data-testid="ad-price"], .css-10b0gli, .price strong, p[data-testid="ad-price"]',
  /** Location and date element */
  location: '[data-testid="location-date"], .css-veheph, .breadcrumb, .space-info',
  /** Contact information element */
  contact: '[data-testid="contact-phone"], .contact-info, .phone-number',
  /** Link to the ad detail page */
  detailLink: 'a[href*="/d/oferta/"], a[href*="/oferta/"], a',
  /** Next page navigation control */
  nextPage: '[data-testid="pagination-forward"], a[data-cy="pagination-forward"], a[title="Następna strona"]',
} as const;

/**
 * Extracts a native ID from an OLX ad URL or data attribute.
 * OLX URLs typically follow: /d/oferta/{slug}-ID{nativeId}.html
 * or include an `id` query param.
 */
function extractNativeId(url: string, dataId: string | null): string | null {
  if (dataId) return dataId;

  // OLX pattern: -ID{id}.html at end of URL
  const idSuffixMatch = url.match(/-ID([a-zA-Z0-9]+)\.html/);
  if (idSuffixMatch) return idSuffixMatch[1];

  // Fallback: numeric segment at end of path
  const numericMatch = url.match(/\/(\d+)(?:\.html)?(?:\?|$)/);
  if (numericMatch) return numericMatch[1];

  return null;
}

/**
 * Parses a price string from OLX listing into a numeric value in PLN.
 */
function parsePrice(priceText: string | null): number | null {
  return parseCleanPrice(priceText);
}

/**
 * Extracts the location portion from OLX's combined location-date text.
 */
function extractLocation(locationDateText: string | null): string {
  return normalizeLocationText(locationDateText, 'Szczecin');
}

/**
 * Delays execution for a random duration within the configured range (2-5s).
 */
function delay(config: ScraperConfig): Promise<void> {
  const ms = getRandomDelay(config);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * OLX portal scraper implementation.
 * Scrapes construction/renovation ad listings from OLX.pl
 * for the Szczecin area within a 50km radius.
 */
export const olxScraper: PortalScraper = {
  portal: 'olx',

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
            ? OLX_BASE_URL
            : `${OLX_BASE_URL}&page=${currentPage}`;

        // Navigate to the listing page
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        // Wait for ad cards to appear (or timeout gracefully)
        await page
          .waitForSelector(SELECTORS.adCard, { timeout: 10_000 })
          .catch(() => null);

        // Extract all ad cards on the current page
        const cardElements = await page.$$(SELECTORS.adCard);

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
 * Extracts ad data from a single OLX listing card element.
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

  // Extract location (OLX combines location + date in one element)
  const locationElement = await card.$(SELECTORS.location);
  const locationDateText = locationElement
    ? await locationElement.textContent()
    : null;
  const locationText = extractLocation(locationDateText);

  // Extract contact info (usually not available on listing page)
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
      : `https://www.olx.pl${href}`
    : pageUrl;

  // Try to get native ID from data attribute or URL
  const dataId = await card.getAttribute('data-id');
  const dataCyId = await card.getAttribute('data-cy-id');
  const nativeId = extractNativeId(sourceUrl, dataId || dataCyId);

  return {
    nativeId,
    title,
    description,
    sourceUrl,
    sourcePortal: 'olx',
    category: 'construction',
    locationText: locationText || 'Szczecin',
    price,
    contactInfo: contactInfo || null,
    publishedAt: null,
  };
}

export default olxScraper;
