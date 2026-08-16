/**
 * Jooble Poland Job Posting Scraper Service.
 * Extracts construction job postings from Jooble.org for the Szczecin area.
 * Uses Jooble's public search page with JSON-LD extraction.
 */

import { ScrapedAd, PortalScraperOptions, SEARCH_TRADES, SalaryRange } from './types';
import { getRandomUserAgent, hashId, cleanText, inferCategory, fetchWithStealthRetry } from './network';
import { extractJsonLd } from '@/functions/src/scraper/extractor';
import { extractPhoneNumber } from '@/lib/ai/freeJobExtractor';

const JOOBLE_BASE = 'https://pl.jooble.org';

/**
 * Fetch and extract Jooble job postings for a specific trade keyword in Szczecin.
 */
async function fetchJoobleKeyword(query: string): Promise<ScrapedAd[]> {
  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `${JOOBLE_BASE}/SearchResult?ukw=${encodedQuery}&rgns=Szczecin`;

  try {
    const res = await fetchWithStealthRetry(searchUrl, {
      referer: JOOBLE_BASE,
      timeoutMs: 8000,
      retries: 2,
    });

    if (!res.ok) return [];

    const html = await res.text();

    // 1. Try JSON-LD extraction (JobPosting schema)
    const jsonLdItems = extractJsonLd(html);
    const ads: ScrapedAd[] = [];

    for (const item of jsonLdItems) {
      if (item.title) {
        const title = item.title.trim();
        const sourceUrl = item.url
          ? (item.url.startsWith('http') ? item.url : `${JOOBLE_BASE}${item.url}`)
          : searchUrl;
        const locationText = item.location ? `Szczecin, ${item.location}` : 'Szczecin';
        const description = cleanText(item.description || title).slice(0, 400);
        const phone = extractPhoneNumber(`${title} ${description}`);

        let priceStr: string | null = null;
        let salaryRange: SalaryRange | null = null;
        if (item.price != null) {
          priceStr = `${item.price} zł`;
          salaryRange = {
            min: item.price,
            max: item.price,
            currency: 'PLN',
            type: 'monthly',
            isGross: true,
            raw: priceStr,
          };
        }

        ads.push({
          id: hashId(sourceUrl || title, 'jooble'),
          title,
          description,
          source_url: sourceUrl,
          source_portal: 'jooble',
          category: inferCategory(title, description),
          location_text: locationText,
          latitude: null,
          longitude: null,
          price: priceStr,
          salary_range: salaryRange,
          phone,
          scraped_at: new Date().toISOString(),
          published_at: item.datePublished || null,
          company: null,
          employment_type: 'Umowa o pracę',
        });
      }
    }

    if (ads.length > 0) return ads;

    // 2. Fallback: Parse HTML links to job listings
    const linkRegex = /href=["'](\/desc\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    const seenUrls = new Set<string>();

    while ((match = linkRegex.exec(html)) !== null) {
      const path = match[1];
      const linkText = cleanText(match[2]);

      if (linkText.length >= 5 && !seenUrls.has(path)) {
        seenUrls.add(path);
        const fullUrl = `${JOOBLE_BASE}${path}`;
        const phone = extractPhoneNumber(linkText);

        ads.push({
          id: hashId(fullUrl, 'jooble'),
          title: linkText,
          description: `Oferta pracy: ${linkText} w Szczecinie. Szczegóły na Jooble.`,
          source_url: fullUrl,
          source_portal: 'jooble',
          category: inferCategory(linkText, ''),
          location_text: 'Szczecin',
          latitude: null,
          longitude: null,
          price: null,
          phone,
          scraped_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          company: null,
          employment_type: 'Umowa o pracę',
        });
      }
    }

    return ads;
  } catch (err) {
    console.warn(`Jooble fetch failed for query "${query}":`, (err as Error).message);
    return [];
  }
}

export async function scrapeJooble(options: PortalScraperOptions = {}): Promise<ScrapedAd[]> {
  const { query, limit = 20 } = options;

  if (query) {
    const results = await fetchJoobleKeyword(query);
    return results.slice(0, limit);
  }

  // Multi-query trade sweep
  const tradesToSearch = SEARCH_TRADES.slice(0, 6);
  const tasks = tradesToSearch.map((t) => fetchJoobleKeyword(t));

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
