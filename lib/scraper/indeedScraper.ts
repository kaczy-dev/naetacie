/**
 * Indeed Poland Job Posting Scraper Service.
 * Extracts construction job postings from Indeed Poland for the Szczecin area.
 */

import { ScrapedAd, PortalScraperOptions, SEARCH_TRADES, JobCategory } from './types';
import { ensureAbsoluteUrl } from '@/lib/utils';

const INDEED_BASE = 'https://pl.indeed.com';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function hashId(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h &= h;
  }
  return `indeed_${Math.abs(h).toString(36)}`;
}

function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCategory(title: string, desc: string): JobCategory {
  const t = `${title} ${desc}`.toLowerCase();
  if (/elektryk|hydraulik|instalac|klimatyz|gaz\b|sanitarn|wod-kan|fotowolta|pomp[ay] ciepła|c\.?o\.?\b/.test(t)) {
    return 'instalacje';
  }
  if (/malarz|glazur|płytk|gładz|regips|tynkar|posadzk|wykończ|tapet|panele|podłog/.test(t)) {
    return 'wykończenia';
  }
  return 'budowa';
}

function parseIndeedRssItem(itemXml: string): ScrapedAd | null {
  const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
  const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
  const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
  const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
  const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

  if (!titleMatch || !linkMatch) return null;

  const title = cleanText(titleMatch[1]);
  let rawUrl = cleanText(linkMatch[1]);
  const description = descMatch ? cleanText(descMatch[1]).slice(0, 350) : title;
  const company = sourceMatch ? cleanText(sourceMatch[1]) : null;
  const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

  let sourceUrl = rawUrl;
  const jkMatch = rawUrl.match(/jk=([a-f0-9]+)/i);
  if (jkMatch) {
    sourceUrl = `https://pl.indeed.com/viewjob?jk=${jkMatch[1]}`;
  } else {
    sourceUrl = ensureAbsoluteUrl(rawUrl, 'indeed') || rawUrl;
  }

  return {
    id: hashId(sourceUrl || title),
    title,
    description,
    source_url: sourceUrl,
    source_portal: 'indeed',
    category: inferCategory(title, description),
    location_text: 'Szczecin',
    latitude: null,
    longitude: null,
    price: null,
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
