/**
 * OLX Job Posting Scraper Service.
 * Uses OLX Public v1 API with resilient fetching and TLS fallback.
 */

import { Agent } from 'undici';
import { ScrapedAd, PortalScraperOptions, SEARCH_TRADES, SalaryRange } from './types';
import { ensureAbsoluteUrl, removePolishDiacritics } from '@/lib/utils';
import { extractOlxNativeId } from '@/lib/olx/olxLinkResolver';
import { extractPhoneNumber } from '@/lib/ai/freeJobExtractor';
import { getRandomUserAgent, hashId, cleanHtml, inferCategory, stealthDispatcher } from './network';

const OLX_API = 'https://www.olx.pl/api/v1/offers/';
const REGION_ZACHODNIOPOMORSKIE = 11;
const CATEGORY_JOBS_ROOT = 4;
const ALLOWED_REGION = 'zachodniopomorskie';

const CONSTRUCTION_RX =
  /murar|tynkar|glazur|płytk|malarz|dekar|brukar|zbrojarz|ciesl|cieśl|beton|elektry|hydraulik|instalac|monter|spawacz|budowl|budow|remont|dociepl|posadzk|regips|wykończ|sanitarn|fotowolta|klimatyz|koparki|operator koparki|rusztowa|okien|glazurnik|kafelk|szpachl|stolarz|elewac|gładz|kamieniarz|szklarz|złota rączka|parkiet|blacharz|płytkarz|izolator|izolacj|operator dźwig|geodet|kierownik budow|ogrodnik|brukarstw/i;

function isConstruction(title: string, desc: string): boolean {
  return CONSTRUCTION_RX.test(`${title} ${desc}`);
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
  status?: 'active' | 'disabled' | 'removed' | 'outdated';
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

function toSalaryRange(value: OlxSalaryValue): SalaryRange | null {
  const { from, to, type, currency, gross } = value;
  if (from == null && to == null) return null;
  return {
    min: from ?? null,
    max: to ?? null,
    currency: (currency === 'EUR' ? 'EUR' : 'PLN') as 'PLN' | 'EUR',
    type: type === 'hourly' ? 'hourly' : type === 'monthly' ? 'monthly' : 'monthly',
    isGross: gross ?? true,
    raw: formatSalary(value) || '',
  };
}

async function fetchOlxPhone(offerId: number | string, sourceUrl: string): Promise<string | null> {
  try {
    const url = `https://www.olx.pl/api/v1/offers/${offerId}/phones/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept: 'application/json',
        Referer: sourceUrl,
      },
      signal: AbortSignal.timeout(3000),
      dispatcher: stealthDispatcher,
    } as RequestInit & { dispatcher: Agent });

    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { phones?: string[] } };
    if (json.data?.phones && json.data.phones.length > 0) {
      return json.data.phones.join(', ');
    }
  } catch {
    /* non-fatal fallback */
  }
  return null;
}

function parseOlxOffer(offer: OlxOffer): ScrapedAd | null {
  const title = offer.title?.trim();
  if (!title) return null;

  if (offer.status && offer.status !== 'active') return null;

  if (offer.category?.type !== 'job') return null;

  const region = offer.location?.region?.normalized_name?.toLowerCase();
  if (region && region !== ALLOWED_REGION) return null;

  const rawUrl = (offer.url || '').trim();
  let sourceUrl = '';

  if (rawUrl) {
    const abs = ensureAbsoluteUrl(rawUrl, 'olx');
    if (abs) {
      sourceUrl = abs.includes('olx.pl/oferta/') && !abs.includes('olx.pl/d/oferta/') 
        ? abs.replace('olx.pl/oferta/', 'olx.pl/d/oferta/') 
        : abs;
    }
  }

  if (!sourceUrl && offer.id) {
    const cleanId = String(offer.id).replace(/^ID/i, '');
    sourceUrl = `https://www.olx.pl/d/oferta/ogloszenie-ID${cleanId}.html`;
  }

  if (!sourceUrl) {
    const cleanTitle = removePolishDiacritics(title).replace(/[^\w\s]/gi, ' ').trim();
    sourceUrl = `https://www.olx.pl/praca/szczecin/q-${encodeURIComponent(cleanTitle)}/`;
  }

  // Extract detailed city and district (e.g. Szczecin, Gumieńce / Szczecin, Pogodno / Police / Przecław)
  const city = offer.location?.city?.name || 'Szczecin';
  const district = offer.location?.district?.name;
  const locationText = district ? `${city}, ${district}` : city;

  let salary: string | null = null;
  let salaryRange: SalaryRange | null = null;
  let employmentType: string | null = null;
  let experience: string | null = null;
  let schedule: string | null = null;
  let contractType: string | null = null;
  let operatingMode: string | null = null;

  for (const p of offer.params ?? []) {
    if (p.key === 'salary' && p.value) {
      salary = formatSalary(p.value);
      salaryRange = toSalaryRange(p.value);
    }
    if (p.key === 'agreement' && p.value?.label) employmentType = p.value.label;
    else if (p.key === 'type' && !employmentType && p.value?.label) employmentType = p.value.label;
    if (p.key === 'experience' && p.value?.label) experience = p.value.label;
    if (p.key === 'work_schedule' && p.value?.label) schedule = p.value.label;
    if (p.key === 'contract_type' && p.value?.label) contractType = p.value.label;
    if ((p.key === 'operating_mode' || p.key === 'work_mode' || p.key === 'mode') && p.value?.label) {
      operatingMode = p.value.label;
    }
  }

  const description = cleanHtml(offer.description || '').slice(0, 400);
  if (!isConstruction(title, description)) return null;

  const company = offer.business ? offer.user?.company_name || offer.user?.name || null : null;
  let phone = extractPhoneNumber(`${title} ${description}`);

  const nativeOlxId = offer.id ? String(offer.id) : extractOlxNativeId(sourceUrl);
  const adId = nativeOlxId ? `olx-${nativeOlxId}` : hashId(sourceUrl || String(title), 'olx');

  return {
    id: adId,
    title,
    description,
    source_url: sourceUrl,
    source_portal: 'olx',
    category: inferCategory(title, description),
    location_text: locationText,
    latitude: offer.map?.lat ?? null,
    longitude: offer.map?.lon ?? null,
    price: salary,
    phone,
    scraped_at: new Date().toISOString(),
    published_at: offer.created_time || offer.last_refresh_time || null,
    company,
    employment_type: employmentType,
    experience_level: experience ? (operatingMode ? `${experience} (${operatingMode})` : experience) : operatingMode,
    work_schedule: schedule,
    contract_type: contractType,
    salary_range: salaryRange,
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
        dispatcher: stealthDispatcher,
      } as RequestInit & { dispatcher: Agent });

      if (res.status >= 500) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      if (!res.ok) return [];

      const json = (await res.json()) as { data?: OlxOffer[] };
      const raw = json.data ?? [];
      const parsedAds = raw.map(parseOlxOffer).filter((a): a is ScrapedAd => a !== null);

      // Asynchronous phone decoding for top offers using OLX Phone API
      const phoneTasks = parsedAds.slice(0, 8).map(async (ad) => {
        if (!ad.phone) {
          const rawId = ad.id.replace(/^olx-/, '');
          const fetchedPhone = await fetchOlxPhone(rawId, ad.source_url);
          if (fetchedPhone) ad.phone = fetchedPhone;
        }
        return ad;
      });

      return await Promise.all(phoneTasks);
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 200));
    }
  }
  return [];
}

export async function scrapeOlx(options: PortalScraperOptions = {}): Promise<ScrapedAd[]> {
  const { query, limit = 40 } = options;

  if (query) {
    const allAds: ScrapedAd[] = [];
    const seen = new Set<string>();
    for (let offset = 0; offset < limit; offset += 40) {
      const page = await fetchOlxPage(query, offset, 40);
      for (const ad of page) {
        if (!seen.has(ad.id)) {
          seen.add(ad.id);
          allAds.push(ad);
        }
      }
      if (page.length < 40) break; // no more results
      if (allAds.length >= limit) break;
      await new Promise(r => setTimeout(r, 300)); // rate limiting between pages
    }
    return allAds.slice(0, limit);
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
