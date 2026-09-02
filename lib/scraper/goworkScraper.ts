/**
 * GoWork.pl Job Posting Scraper Service.
 * Extracts construction job postings from GoWork.pl for the Szczecin area.
 * GoWork specializes in employer reviews and job listings.
 */

import { ScrapedAd, PortalScraperOptions, SEARCH_TRADES, SalaryRange } from './types';
import { getRandomUserAgent, hashId, cleanText, inferCategory, fetchWithStealthRetry } from './network';
import { extractJsonLdJobs } from './universalExtractor';
import { extractPhoneNumber } from '@/lib/ai/freeJobExtractor';
import { resolveSzczecinMicroDistrict } from '@/lib/geo/szczecinMicroDistricts';

const GOWORK_BASE = 'https://www.gowork.pl';

/**
 * Fetch and extract GoWork job postings for a specific trade keyword in Szczecin.
 */
async function fetchGoWorkKeyword(query: string): Promise<ScrapedAd[]> {
  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `${GOWORK_BASE}/praca/szczecin;l/${encodedQuery};kw`;

  try {
    const res = await fetchWithStealthRetry(searchUrl, {
      referer: GOWORK_BASE,
      timeoutMs: 8000,
      retries: 2,
    });

    if (!res.ok) return [];

    const html = await res.text();

    // 1. Try Universal JSON-LD extraction
    const jsonLdJobs = extractJsonLdJobs(html);
    const ads: ScrapedAd[] = [];

    for (const item of jsonLdJobs) {
      if (item.title) {
        const title = item.title.trim();
        const sourceUrl = item.url
          ? (item.url.startsWith('http') ? item.url : `${GOWORK_BASE}${item.url}`)
          : searchUrl;
        const locationText = item.location ? `Szczecin, ${item.location}` : 'Szczecin';
        const description = cleanText(item.description || title).slice(0, 400);
        const phone = extractPhoneNumber(`${title} ${description}`);

        const micro = resolveSzczecinMicroDistrict(`${locationText} ${title}`);
        const lat = micro ? micro.lat : 53.4285;
        const lng = micro ? micro.lng : 14.5528;

        ads.push({
          id: hashId(sourceUrl || title, 'gowork'),
          title,
          description,
          source_url: sourceUrl,
          source_portal: 'gowork',
          category: inferCategory(title, description),
          location_text: locationText,
          district: micro ? micro.name : null,
          latitude: lat,
          longitude: lng,
          price: item.price,
          salary_range: item.salaryRange,
          phone,
          scraped_at: new Date().toISOString(),
          published_at: item.datePublished || null,
          company: item.company,
          employment_type: item.employmentType || 'Umowa o pracę',
        });
      }
    }

    if (ads.length > 0) return ads;

    // 2. Fallback: Parse HTML job listing links
    const linkRegex = /href=["'](\/oferta-pracy\/[^"']+)["'][^>]*title=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    const seenUrls = new Set<string>();

    while ((match = linkRegex.exec(html)) !== null) {
      const path = match[1];
      const linkText = cleanText(match[2]);

      if (linkText.length >= 5 && !seenUrls.has(path)) {
        seenUrls.add(path);
        const fullUrl = `${GOWORK_BASE}${path}`;
        const phone = extractPhoneNumber(linkText);
        const micro = resolveSzczecinMicroDistrict(`Szczecin ${linkText}`);
        const lat = micro ? micro.lat : 53.4285;
        const lng = micro ? micro.lng : 14.5528;

        ads.push({
          id: hashId(fullUrl, 'gowork'),
          title: linkText,
          description: `Oferta pracy: ${linkText} w Szczecinie. Szczegóły i opinie o pracodawcy na GoWork.pl.`,
          source_url: fullUrl,
          source_portal: 'gowork',
          category: inferCategory(linkText, ''),
          location_text: micro ? `Szczecin, ${micro.name}` : 'Szczecin',
          district: micro ? micro.name : null,
          latitude: lat,
          longitude: lng,
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
    console.warn(`GoWork fetch failed for query "${query}":`, (err as Error).message);
    return [];
  }
}

export async function scrapeGoWork(options: PortalScraperOptions = {}): Promise<ScrapedAd[]> {
  const { query, limit = 20 } = options;

  if (query) {
    const results = await fetchGoWorkKeyword(query);
    return results.slice(0, limit);
  }

  // Multi-query trade sweep
  const tradesToSearch = SEARCH_TRADES.slice(0, 6);
  const tasks = tradesToSearch.map((t) => fetchGoWorkKeyword(t));

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
