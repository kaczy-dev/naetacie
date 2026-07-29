/**
 * OLX Job Posting Scraper Service.
 * Uses OLX Public v1 API with resilient fetching and TLS fallback.
 */

import { Agent } from 'undici';
import { ScrapedAd, PortalScraperOptions, SEARCH_TRADES, JobCategory } from './types';
import { ensureAbsoluteUrl, removePolishDiacritics } from '@/lib/utils';

const olxDispatcher = new Agent({
  connect: { rejectUnauthorized: false, timeout: 8000 },
  connections: 16,
  pipelining: 1,
  keepAliveTimeout: 10_000,
});

const OLX_API = 'https://www.olx.pl/api/v1/offers/';
const REGION_ZACHODNIOPOMORSKIE = 11;
const CATEGORY_JOBS_ROOT = 4;
const ALLOWED_REGION = 'zachodniopomorskie';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
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
  return `olx_${Math.abs(h).toString(36)}`;
}

function cleanHtml(raw: string): string {
  return raw
    .replace(/<\/p>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const CONSTRUCTION_RX =
  /murar|tynkar|glazur|płytk|malarz|dekar|brukar|zbrojarz|ciesl|cieśl|beton|elektry|hydraulik|instalac|monter|spawacz|budowl|budow|remont|dociepl|posadzk|regips|wykończ|sanitarn|fotowolta|klimatyz|koparki|operator koparki|rusztowa|okien|glazurnik|kafelk|szpachl/i;

function isConstruction(title: string, desc: string): boolean {
  return CONSTRUCTION_RX.test(`${title} ${desc}`);
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

interface OlxSalaryValue {
  from?: number;
  to?: number;
  currency?: string;
  type?: string;
  gross?: boolean;
}

interface OlxSelectValue {
  key?: string | string[];
  label?: string;
}

interface OlxParam {
  key?: string;
  value?: OlxSalaryValue & OlxSelectValue;
}

interface OlxOffer {
  id?: number | string;
  title?: string;
  description?: string;
  url?: string;
  created_time?: string;
  last_refresh_time?: string;
  location?: {
    city?: { name?: string };
    district?: { name?: string };
    region?: { normalized_name?: string; name?: string };
  };
  map?: { lat?: number; lon?: number };
  params?: OlxParam[];
  category?: { type?: string };
  business?: boolean;
  user?: { company_name?: string; name?: string };
}

function formatSalary(value: OlxSalaryValue): string | null {
  const { from, to, type, currency } = value;
  if (from == null && to == null) return null;
  const unit = type === 'hourly' ? '/h' : type === 'monthly' ? '/mies.' : '';
  const cur = currency === 'PLN' ? 'zł' : currency ?? 'zł';
  if (from != null && to != null && from !== to) return `${from}–${to} ${cur}${unit}`;
  return `${from ?? to} ${cur}${unit}`;
}

function parseOlxOffer(offer: OlxOffer): ScrapedAd | null {
  const title = offer.title?.trim();
  if (!title) return null;

  if (offer.category?.type !== 'job') return null;

  const region = offer.location?.region?.normalized_name?.toLowerCase();
  if (region && region !== ALLOWED_REGION) return null;

  let rawUrl = (offer.url || '').trim();
  let sourceUrl = '';
  if (rawUrl) {
    const abs = ensureAbsoluteUrl(rawUrl, 'olx');
    if (abs && (abs.endsWith('.html') || abs.includes('-ID'))) {
      sourceUrl = abs;
    } else if (offer.id) {
      sourceUrl = `https://www.olx.pl/d/oferta/-ID${offer.id}.html`;
    } else if (abs) {
      sourceUrl = abs;
    }
  } else if (offer.id) {
    sourceUrl = `https://www.olx.pl/d/oferta/-ID${offer.id}.html`;
  } else {
    const cleanTitle = removePolishDiacritics(title).replace(/[^\w\s]/gi, ' ').trim();
    sourceUrl = `https://www.olx.pl/praca/szczecin/?search%5Bq%5D=${encodeURIComponent(cleanTitle)}`;
  }

  const city = offer.location?.city?.name || 'Szczecin';
  const district = offer.location?.district?.name;
  const locationText = district ? `${city}, ${district}` : city;

  let salary: string | null = null;
  let employmentType: string | null = null;
  for (const p of offer.params ?? []) {
    if (p.key === 'salary' && p.value) salary = formatSalary(p.value);
    if (p.key === 'agreement' && p.value?.label) employmentType = p.value.label;
    else if (p.key === 'type' && !employmentType && p.value?.label) employmentType = p.value.label;
  }

  const description = cleanHtml(offer.description || '').slice(0, 400);
  if (!isConstruction(title, description)) return null;

  const company = offer.business ? offer.user?.company_name || offer.user?.name || null : null;

  return {
    id: hashId(sourceUrl || String(offer.id ?? title)),
    title,
    description,
    source_url: sourceUrl,
    source_portal: 'olx',
    category: inferCategory(title, description),
    location_text: locationText,
    latitude: offer.map?.lat ?? null,
    longitude: offer.map?.lon ?? null,
    price: salary,
    scraped_at: new Date().toISOString(),
    published_at: offer.created_time || offer.last_refresh_time || null,
    company,
    employment_type: employmentType,
  };
}

async function fetchOlxPage(query?: string, offset = 0, limit = 40): Promise<ScrapedAd[]> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    region_id: String(REGION_ZACHODNIOPOMORSKIE),
    category_id: String(CATEGORY_JOBS_ROOT),
    sort_by: 'created_at:desc',
  });
  if (query) params.set('query', query);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${OLX_API}?${params.toString()}`, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          Accept: 'application/json',
          'Accept-Language': 'pl-PL,pl;q=0.9',
          Referer: 'https://www.olx.pl/praca/',
        },
        signal: AbortSignal.timeout(8000),
        dispatcher: olxDispatcher,
      } as RequestInit & { dispatcher: Agent });

      if (res.status >= 500) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      if (!res.ok) return [];

      const json = (await res.json()) as { data?: OlxOffer[] };
      const raw = json.data ?? [];
      return raw.map(parseOlxOffer).filter((a): a is ScrapedAd => a !== null);
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 200));
    }
  }
  return [];
}

export async function scrapeOlx(options: PortalScraperOptions = {}): Promise<ScrapedAd[]> {
  const { query, limit = 40 } = options;

  if (query) {
    const page1 = await fetchOlxPage(query, 0, 40);
    return page1.slice(0, limit);
  }

  // Multi-query sweep across construction trade keywords
  const perQuery = Math.max(5, Math.ceil(limit / SEARCH_TRADES.length));
  const queries = SEARCH_TRADES.slice(0, 8);
  const tasks = queries.map((q) => fetchOlxPage(q, 0, perQuery));

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
