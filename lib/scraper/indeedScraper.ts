/**
 * Indeed Poland Job Posting Scraper Service.
 * Extracts construction job postings from Indeed Poland for the Szczecin area.
 */

import { ScrapedAd, PortalScraperOptions, SEARCH_TRADES, SalaryRange } from './types';
import { ensureAbsoluteUrl } from '@/lib/utils';
import { extractPhoneNumber } from '@/lib/ai/freeJobExtractor';
import { getRandomUserAgent, hashId, cleanText, inferCategory } from './network';

const INDEED_BASE = 'https://pl.indeed.com';

/**
 * Extracts salary information from Indeed RSS description text.
 * Handles formats like: "od 5 000 do 7 000 PLN", "5000-7000 zł", "30 zł/h"
 */
function extractSalaryFromText(text: string): { price: string; salaryRange: SalaryRange } | null {
  // Range format: "5 000 – 7 000 zł" or "5000-7000 PLN" or "od 5000 do 7000"
  const rangeMatch = text.match(/(\d[\d\s]*(?:,\d+)?)\s*(?:–|-|do)\s*(\d[\d\s]*(?:,\d+)?)\s*(?:zł|PLN|brutto|netto)/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1].replace(/\s/g, '').replace(',', '.'));
    const max = parseFloat(rangeMatch[2].replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(min) && Number.isFinite(max)) {
      const isHourly = /\/\s*h|za godzin|hourly/i.test(text);
      const raw = rangeMatch[0].trim();
      return {
        price: raw,
        salaryRange: {
          min, max,
          currency: 'PLN',
          type: isHourly ? 'hourly' : 'monthly',
          isGross: !/netto/i.test(text),
          raw,
        },
      };
    }
  }

  // Single value format: "5000 zł"
  const singleMatch = text.match(/(\d[\d\s]*(?:,\d+)?)\s*(?:zł|PLN)/i);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1].replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(val) && val > 0) {
      const isHourly = /\/\s*h|za godzin|hourly/i.test(text);
      const raw = singleMatch[0].trim();
      return {
        price: raw,
        salaryRange: {
          min: val, max: val,
          currency: 'PLN',
          type: isHourly ? 'hourly' : 'monthly',
          isGross: true,
          raw,
        },
      };
    }
  }

  return null;
}

function parseIndeedRssItem(itemXml: string): ScrapedAd | null {
  const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
  const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
  const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
  const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
  const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

  if (!titleMatch || !linkMatch) return null;

  const title = cleanText(titleMatch[1]);
  const rawUrl = cleanText(linkMatch[1]);
  const description = descMatch ? cleanText(descMatch[1]).slice(0, 350) : title;
  const company = sourceMatch ? cleanText(sourceMatch[1]) : null;
  const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

  let sourceUrl = rawUrl;
  const jkMatch = rawUrl.match(/(?:jk|vjk)=([a-zA-Z0-9_-]+)/i) || itemXml.match(/<guid[^>]*>([a-zA-Z0-9_-]+)<\/guid>/i);
  if (jkMatch && jkMatch[1].length >= 8) {
    sourceUrl = `https://pl.indeed.com/viewjob?jk=${jkMatch[1]}`;
  } else {
    sourceUrl = ensureAbsoluteUrl(rawUrl, 'indeed') || rawUrl;
  }

  const phone = extractPhoneNumber(`${title} ${description}`);

  const salaryInfo = extractSalaryFromText(`${title} ${description}`);

  return {
    id: hashId(sourceUrl || title, 'indeed'),
    title,
    description,
    source_url: sourceUrl,
    source_portal: 'indeed',
    category: inferCategory(title, description),
    location_text: 'Szczecin',
    latitude: null,
    longitude: null,
    price: salaryInfo?.price ?? null,
    salary_range: salaryInfo?.salaryRange ?? null,
    phone,
    scraped_at: new Date().toISOString(),
    published_at: pubDate,
    company,
    employment_type: 'Umowa o pracę',
  };
}

async function fetchIndeedKeyword(query: string): Promise<ScrapedAd[]> {
  const encodedQuery = encodeURIComponent(query);
  const rssUrl = `${INDEED_BASE}/rss?q=${encodedQuery}&l=Szczecin`;

  try {
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;
    const ads: ScrapedAd[] = [];

    while ((match = itemRegex.exec(xml)) !== null) {
      const parsed = parseIndeedRssItem(match[1]);
      if (parsed) ads.push(parsed);
    }

    return ads;
  } catch (err) {
    console.warn(`Indeed RSS fetch failed for query "${query}":`, (err as Error).message);
    return [];
  }
}

export async function scrapeIndeed(options: PortalScraperOptions = {}): Promise<ScrapedAd[]> {
  const { query, limit = 20 } = options;

  if (query) {
    const results = await fetchIndeedKeyword(query);
    return results.slice(0, limit);
  }

  const tradesToSearch = SEARCH_TRADES.slice(0, 5);
  const tasks = tradesToSearch.map((t) => fetchIndeedKeyword(t));

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
