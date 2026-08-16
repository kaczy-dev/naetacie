/**
 * Oferteo.pl B2B Subcontracting & Order Scraper Service.
 * Extracts construction orders and tenders from Oferteo.pl in Szczecin area.
 */

import { ScrapedAd, PortalScraperOptions, SEARCH_TRADES } from './types';
import { getRandomUserAgent, hashId, cleanText, inferCategory, fetchWithStealthRetry } from './network';
import { extractPhoneNumber } from '@/lib/ai/freeJobExtractor';

const OFERTEO_BASE = 'https://www.oferteo.pl';

async function fetchOferteoKeyword(query: string): Promise<ScrapedAd[]> {
  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `${OFERTEO_BASE}/zlecenia-budowlane/szczecin?q=${encodedQuery}`;

  try {
    const res = await fetchWithStealthRetry(searchUrl, {
      referer: OFERTEO_BASE,
      timeoutMs: 8000,
      retries: 2,
    });

    if (!res.ok) return [];

    const html = await res.text();
    const ads: ScrapedAd[] = [];

    // Parse HTML order links
    const linkRegex = /href=["'](\/zlecenia-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    const seenUrls = new Set<string>();

    while ((match = linkRegex.exec(html)) !== null) {
      const path = match[1];
      const rawTitle = cleanText(match[2]);

      if (rawTitle.length >= 6 && !seenUrls.has(path) && !path.includes('/szczecin?')) {
        seenUrls.add(path);
        const fullUrl = `${OFERTEO_BASE}${path}`;
        const phone = extractPhoneNumber(rawTitle);

        ads.push({
          id: hashId(fullUrl, 'oferteo'),
          title: `[Zlecenie] ${rawTitle}`,
          description: `Zlecenie budowlane z Oferteo: ${rawTitle} w Szczecinie. Skontaktuj się ze zleceniodawcą.`,
          source_url: fullUrl,
          source_portal: 'oferteo',
          category: inferCategory(rawTitle, ''),
          location_text: 'Szczecin',
          latitude: null,
          longitude: null,
          price: null,
          phone,
          scraped_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          company: 'Zleceniodawca Oferteo',
          employment_type: 'B2B / Zlecenie',
          contract_type: 'B2B / Podwykonawstwo',
        });
      }
    }

    return ads;
  } catch (err) {
    console.warn(`Oferteo fetch failed for query "${query}":`, (err as Error).message);
    return [];
  }
}

export async function scrapeOferteo(options: PortalScraperOptions = {}): Promise<ScrapedAd[]> {
  const { query, limit = 20 } = options;

  if (query) {
    const results = await fetchOferteoKeyword(query);
    return results.slice(0, limit);
  }

  const tradesToSearch = SEARCH_TRADES.slice(0, 5);
  const tasks = tradesToSearch.map((t) => fetchOferteoKeyword(t));

  const results = await Promise.allSettled(tasks);
  const seen = new Set<string>();
  const ads: ScrapedAd[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const ad of r.value) {
        if (!seen.has(ad.id)) {
          seen.add(ad.id);
          ads.push(ad);
        }
      }
    }
  }

  return ads.slice(0, limit);
}
