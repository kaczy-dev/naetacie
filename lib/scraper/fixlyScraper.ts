/**
 * Fixly.pl Renovation & Construction Order Scraper Service.
 * Extracts client orders for renovation and construction in Szczecin.
 */

import { ScrapedAd, PortalScraperOptions, SEARCH_TRADES } from './types';
import { getRandomUserAgent, hashId, cleanText, inferCategory, fetchWithStealthRetry } from './network';
import { extractPhoneNumber } from '@/lib/ai/freeJobExtractor';

const FIXLY_BASE = 'https://fixly.pl';

async function fetchFixlyKeyword(query: string): Promise<ScrapedAd[]> {
  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `${FIXLY_BASE}/szukaj?q=${encodedQuery}&location=Szczecin`;

  try {
    const res = await fetchWithStealthRetry(searchUrl, {
      referer: FIXLY_BASE,
      timeoutMs: 8000,
      retries: 2,
    });

    if (!res.ok) return [];

    const html = await res.text();
    const ads: ScrapedAd[] = [];

    // Parse Fixly order cards
    const linkRegex = /href=["'](\/zlecenie\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    const seenUrls = new Set<string>();

    while ((match = linkRegex.exec(html)) !== null) {
      const path = match[1];
      const rawTitle = cleanText(match[2]);

      if (rawTitle.length >= 6 && !seenUrls.has(path)) {
        seenUrls.add(path);
        const fullUrl = `${FIXLY_BASE}${path}`;
        const phone = extractPhoneNumber(rawTitle);

        ads.push({
          id: hashId(fullUrl, 'fixly'),
          title: `[Fixly] ${rawTitle}`,
          description: `Zlecenie remontowe z Fixly: ${rawTitle} w Szczecinie.`,
          source_url: fullUrl,
          source_portal: 'fixly',
          category: inferCategory(rawTitle, ''),
          location_text: 'Szczecin',
          latitude: null,
          longitude: null,
          price: null,
          phone,
          scraped_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          company: 'Klient prywatny (Fixly)',
          employment_type: 'Zlecenie',
          contract_type: 'B2B / Umowa o dzieło',
        });
      }
    }

    return ads;
  } catch (err) {
    console.warn(`Fixly fetch failed for query "${query}":`, (err as Error).message);
    return [];
  }
}

export async function scrapeFixly(options: PortalScraperOptions = {}): Promise<ScrapedAd[]> {
  const { query, limit = 20 } = options;

  if (query) {
    const results = await fetchFixlyKeyword(query);
    return results.slice(0, limit);
  }

  const tradesToSearch = SEARCH_TRADES.slice(0, 5);
  const tasks = tradesToSearch.map((t) => fetchFixlyKeyword(t));

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
