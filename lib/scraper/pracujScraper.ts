/**
 * Pracuj.pl Job Posting Scraper Service.
 * Extracts real-time construction job postings from Pracuj.pl in Szczecin.
 */

import { ScrapedAd, PortalScraperOptions, SEARCH_TRADES, JobCategory } from './types';
import { ensureAbsoluteUrl, removePolishDiacritics } from '@/lib/utils';
import { extractJsonLd } from '@/functions/src/scraper/extractor';
import { extractPhoneNumber } from '@/lib/ai/freeJobExtractor';

const PRACUJ_BASE = 'https://www.pracuj.pl';

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
  return `pracuj_${Math.abs(h).toString(36)}`;
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

function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Interface matching Pracuj.pl __NEXT_DATA__ or REST payload structure */
interface PracujApiOffer {
  jobTitle?: string;
  offerTitle?: string;
  companyName?: string;
  employer?: string;
  offerUrl?: string;
  offerAbsoluteUrl?: string;
  displayOfferUrl?: string;
  clsOfferUrl?: string;
  link?: string;
  workplaceName?: string;
  location?: string;
  salary?: string;
  salaryText?: string;
  employmentTypes?: string[] | string;
  lastPublicated?: string;
  datePublished?: string;
}

function parsePracujRawOffer(item: PracujApiOffer, queryFallback: string): ScrapedAd | null {
  const title = (item.jobTitle || item.offerTitle || '').trim();
  if (!title) return null;

  const rawUrl = item.offerAbsoluteUrl || item.offerUrl || item.displayOfferUrl || item.clsOfferUrl || item.link || '';
  let sourceUrl = '';
  if (rawUrl) {
    sourceUrl = ensureAbsoluteUrl(rawUrl, 'pracuj') || rawUrl;
  } else {
    const cleanKw = removePolishDiacritics(title).replace(/[^\w\s]/gi, ' ').trim();
    sourceUrl = `https://www.pracuj.pl/praca/${encodeURIComponent(cleanKw || queryFallback)};kw/szczecin;wp`;
  }

  const company = item.companyName || item.employer || null;
  const locationText = item.workplaceName || item.location || 'Szczecin';
  const salary = item.salary || item.salaryText || null;
  const empTypes = Array.isArray(item.employmentTypes)
    ? item.employmentTypes.join(', ')
    : item.employmentTypes || 'Umowa o pracę';
  const publishedAt = item.lastPublicated || item.datePublished || new Date().toISOString();

  const description = cleanText(`${title} - Praca w ${company ? company + ', ' : ''}${locationText}.`).slice(0, 300);
  const phone = extractPhoneNumber(`${title} ${description}`);

  return {
    id: hashId(sourceUrl || title + locationText),
    title,
    description,
    source_url: sourceUrl,
    source_portal: 'pracuj',
    category: inferCategory(title, description),
    location_text: locationText.includes('Szczecin') ? locationText : `Szczecin, ${locationText}`,
    latitude: null,
    longitude: null,
    price: salary,
    phone,
    scraped_at: new Date().toISOString(),
    published_at: publishedAt,
    company,
    employment_type: empTypes,
  };
}

/**
 * Fetch and extract Pracuj.pl job postings for a specific trade keyword.
 */
async function fetchPracujKeyword(query: string): Promise<ScrapedAd[]> {
  const cleanKw = encodeURIComponent(query);
  const searchUrl = `${PRACUJ_BASE}/praca/${cleanKw};kw/szczecin;wp`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];

    const html = await res.text();

    // 1. Try extracting structured JSON-LD JobPosting data
    const jsonLdItems = extractJsonLd(html);
    const adsFromJsonLd: ScrapedAd[] = [];

    for (const item of jsonLdItems) {
      if (item.title) {
        const title = item.title.trim();
        const rawUrl = item.url || searchUrl;
        const sourceUrl = ensureAbsoluteUrl(rawUrl, 'pracuj') || rawUrl;
        const locationText = item.location ? `Szczecin, ${item.location}` : 'Szczecin';
        const priceStr = item.price ? `${item.price} zł` : null;

        adsFromJsonLd.push({
          id: hashId(sourceUrl || title),
          title,
          description: cleanText(item.description || title).slice(0, 300),
          source_url: sourceUrl,
          source_portal: 'pracuj',
          category: inferCategory(title, item.description || ''),
          location_text: locationText,
          latitude: null,
          longitude: null,
          price: priceStr,
          scraped_at: new Date().toISOString(),
          published_at: item.datePublished || null,
          company: null,
          employment_type: 'Umowa o pracę',
        });
      }
    }

    if (adsFromJsonLd.length > 0) {
      return adsFromJsonLd;
    }

    // 2. Try parsing __NEXT_DATA__ embedded JSON state
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const json = JSON.parse(nextDataMatch[1]);
        const offers: PracujApiOffer[] =
          json.props?.pageProps?.data?.offers ||
          json.props?.pageProps?.offers ||
          json.props?.pageProps?.initialState?.offers?.list ||
          [];

        const adsFromNext: ScrapedAd[] = [];
        for (const item of offers) {
          const parsed = parsePracujRawOffer(item, query);
          if (parsed) adsFromNext.push(parsed);
        }
        if (adsFromNext.length > 0) return adsFromNext;
      } catch {
        // Fall back to regex link parsing
      }
    }

    // 3. Fallback: Parse HTML anchor links to job listings (/praca/...)
    const linkRegex = /href=["'](\/praca\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    const adsFromRegex: ScrapedAd[] = [];
    const seenUrls = new Set<string>();

    while ((match = linkRegex.exec(html)) !== null) {
      const path = match[1];
      const linkText = cleanText(match[2]);

      if (
        path.includes(',oferta,') ||
        path.includes(';kw/') ||
        /murar|elektry|hydraul|malarz|dekar|brukar|monter|budowl/i.test(linkText)
      ) {
        const fullUrl = `${PRACUJ_BASE}${path}`;
        if (!seenUrls.has(fullUrl) && linkText.length >= 5) {
          seenUrls.add(fullUrl);
          adsFromRegex.push({
            id: hashId(fullUrl),
            title: linkText,
            description: `Praca na stanowisku ${linkText} w Szczecinie. Zobacz szczegóły w serwisie Pracuj.pl.`,
            source_url: fullUrl,
            source_portal: 'pracuj',
            category: inferCategory(linkText, ''),
            location_text: 'Szczecin',
            latitude: null,
            longitude: null,
            price: null,
            scraped_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
            company: null,
            employment_type: 'Umowa o pracę',
          });
        }
      }
    }

    return adsFromRegex;
  } catch (err) {
    console.warn(`Pracuj fetch failed for query "${query}":`, (err as Error).message);
    return [];
  }
}

export async function scrapePracuj(options: PortalScraperOptions = {}): Promise<ScrapedAd[]> {
  const { query, limit = 20 } = options;

  if (query) {
    const results = await fetchPracujKeyword(query);
    return results.slice(0, limit);
  }

  // Multi-query trade sweep
  const tradesToSearch = SEARCH_TRADES.slice(0, 5);
  const tasks = tradesToSearch.map((t) => fetchPracujKeyword(t));

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
