/**
 * Firecrawl-Powered High-Fidelity Portal Scraper.
 * Used for dynamic and complex order portals (Oferteo, Fixly, direct contractor portals)
 * where traditional HTML DOM scrapers fail due to heavy JavaScript rendering or changing CSS.
 */

import { ScrapedAd, PortalScraperOptions, SEARCH_TRADES } from '../types';
import { defaultFirecrawlClient, FirecrawlClient } from './firecrawlClient';
import { scrapeOferteo as fallbackOferteo } from '../oferteoScraper';
import { scrapeFixly as fallbackFixly } from '../fixlyScraper';
import { cleanText } from '../network';

const OFERTEO_SZCZECIN_ORDERS = 'https://www.oferteo.pl/zlecenia-budowlane/szczecin';
const FIXLY_SZCZECIN_ORDERS = 'https://fixly.pl/kategoria/budowa-remont/szczecin';

export async function scrapeOferteoWithFirecrawl(
  options: PortalScraperOptions = {},
  client: FirecrawlClient = defaultFirecrawlClient
): Promise<ScrapedAd[]> {
  if (!client.isConfigured()) {
    // Graceful fallback to existing stealth DOM/JSON-LD scraper
    return fallbackOferteo(options);
  }

  const { query, limit = 20 } = options;
  const targetUrl = query
    ? `${OFERTEO_SZCZECIN_ORDERS}?q=${encodeURIComponent(query)}`
    : OFERTEO_SZCZECIN_ORDERS;

  try {
    const res = await client.scrape(targetUrl, {
      formats: ['links', 'markdown'],
      onlyMainContent: true,
      waitFor: 2000,
    });

    if (!res.success || !res.data) {
      return fallbackOferteo(options);
    }

    // Extract order links from page
    const links = (res.data.links || []).filter(
      (link) => link.includes('/zlecenia-') && !link.includes('/szczecin?')
    );

    if (links.length === 0) {
      return fallbackOferteo(options);
    }

    const ads: ScrapedAd[] = [];
    const targetLinks = links.slice(0, Math.min(limit, 10));

    // Concurrently extract details for up to 5 links
    const detailPromises = targetLinks.map((link) =>
      client.extractJobListing(link, 'oferteo')
    );

    const settled = await Promise.allSettled(detailPromises);
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) {
        ads.push(r.value);
      }
    }

    if (ads.length > 0) return ads;
    return fallbackOferteo(options);
  } catch (err) {
    console.warn('Firecrawl Oferteo scrape failed, falling back:', (err as Error).message);
    return fallbackOferteo(options);
  }
}

export async function scrapeFixlyWithFirecrawl(
  options: PortalScraperOptions = {},
  client: FirecrawlClient = defaultFirecrawlClient
): Promise<ScrapedAd[]> {
  if (!client.isConfigured()) {
    return fallbackFixly(options);
  }

  const { query, limit = 20 } = options;
  const targetUrl = query
    ? `${FIXLY_SZCZECIN_ORDERS}?q=${encodeURIComponent(query)}`
    : FIXLY_SZCZECIN_ORDERS;

  try {
    const res = await client.scrape(targetUrl, {
      formats: ['links', 'markdown'],
      onlyMainContent: true,
      waitFor: 2000,
    });

    if (!res.success || !res.data) {
      return fallbackFixly(options);
    }

    const links = (res.data.links || []).filter(
      (link) =>
        (link.includes('/zlecenie/') || link.includes('/zapytanie/')) &&
        !link.includes('?')
    );

    if (links.length === 0) {
      return fallbackFixly(options);
    }

    const ads: ScrapedAd[] = [];
    const targetLinks = links.slice(0, Math.min(limit, 10));

    const detailPromises = targetLinks.map((link) =>
      client.extractJobListing(link, 'fixly')
    );

    const settled = await Promise.allSettled(detailPromises);
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) {
        ads.push(r.value);
      }
    }

    if (ads.length > 0) return ads;
    return fallbackFixly(options);
  } catch (err) {
    console.warn('Firecrawl Fixly scrape failed, falling back:', (err as Error).message);
    return fallbackFixly(options);
  }
}
