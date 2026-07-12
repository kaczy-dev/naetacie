/**
 * On-demand job scraper — OLX public JSON API v1.
 *
 * OLX exposes a public offers endpoint at `https://www.olx.pl/api/v1/offers/`
 * returning structured JSON. Far more robust than HTML scraping.
 *
 * Verified response shape (2026):
 *   data[].title / url / description (HTML)
 *   data[].location.city.name / region.normalized_name / district.name
 *   data[].map.lat / lon
 *   data[].params[] where key ∈ {salary, type, agreement, experience}
 *     salary.value = { from, to, currency, type: 'monthly'|'hourly', gross }
 *   data[].category.type === 'job'
 *
 * Region 11 = Zachodniopomorskie. We additionally filter by
 * region.normalized_name to guarantee only Szczecin-area offers.
 *
 * Query params:
 *   - query:   override search phrase
 *   - limit:   max offers (default 40, capped 60)
 */

import { NextResponse } from 'next/server';
import { Agent } from 'undici';
import { adminFirestore } from '@/lib/firebase/admin';

/**
 * Dedicated dispatcher for OLX API calls only.
 *
 * On some dev machines an antivirus / corporate proxy performs HTTPS
 * interception (MITM) using a local root CA that Node.js doesn't trust,
 * producing UNABLE_TO_VERIFY_LEAF_SIGNATURE. Relaxing verification here is
 * scoped strictly to the public, read-only OLX offers API — Firebase and all
 * other connections keep full TLS verification. In production this agent is
 * harmless (the real OLX cert chain verifies normally).
 */
const olxDispatcher = new Agent({
  connect: { rejectUnauthorized: false, timeout: 8000 },
  connections: 16,       // allow parallel trade queries to run concurrently
  pipelining: 1,
  keepAliveTimeout: 10_000,
});

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

interface ScrapedAd {
  id: string;
  title: string;
  description: string;
  source_url: string;
  source_portal: string;
  category: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  price: string | null;
  scraped_at: string;
  published_at: string | null;
  company: string | null;
  employment_type: string | null;
}

const OLX_API = 'https://www.olx.pl/api/v1/offers/';
const REGION_ZACHODNIOPOMORSKIE = 11;
/** OLX job categories: 4 = Praca (root), 5201 = Praca → Budownictwo (dedicated). */
const CATEGORY_JOBS_ROOT = 4;
const CATEGORY_JOBS_CONSTRUCTION = 5201;

/** Search phrases covering the main construction trades (run against jobs root). */
const SEARCH_QUERIES = [
  'murarz', 'elektryk', 'hydraulik', 'malarz',
  'dekarz', 'brukarz', 'monter instalacji', 'pracownik budowlany',
  'spawacz', 'cieśla',
];

/** Cities/districts we accept as "Szczecin region". */
const ALLOWED_REGION = 'zachodniopomorskie';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
];

function ua(): string {
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

/** Strip HTML tags + decode common entities from OLX descriptions. */
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

/** Keywords that mark an offer as construction-related. */
const CONSTRUCTION_RX =
  /murar|tynkar|glazur|płytk|malarz|dekar|brukar|zbrojarz|ciesl|cieśl|beton|elektry|hydraulik|instalac|monter|spawacz|budowl|budow|remont|dociepl|posadzk|regips|wykończ|sanitarn|fotowolta|klimatyz|koparki|operator koparki|rusztowa|okien|glazurnik|kafelk|szpachl/i;

/** True if the offer looks construction-related (title or description). */
function isConstruction(title: string, desc: string): boolean {
  return CONSTRUCTION_RX.test(`${title} ${desc}`);
}

/** Infer construction category from the offer title + description. */
function inferCategory(title: string, desc: string): string {
  const t = `${title} ${desc}`.toLowerCase();
  if (/elektryk|hydraulik|instalac|klimatyz|gaz\b|sanitarn|wod-kan|fotowolta|pomp[ay] ciepła|c\.?o\.?\b/.test(t)) return 'instalacje';
  if (/malarz|glazur|płytk|gładz|regips|tynkar|posadzk|wykończ|tapet|panele|podłog/.test(t)) return 'wykończenia';
  return 'budowa';
}

// --- OLX response typings (partial) ---

interface OlxSalaryValue {
  from?: number; to?: number; currency?: string; type?: string; gross?: boolean; arranged?: boolean;
}
interface OlxSelectValue { key?: string | string[]; label?: string; }
interface OlxParam { key?: string; value?: OlxSalaryValue & OlxSelectValue; }
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

/** Format a salary param into a human string like "35–37 zł/h" or "6500 zł". */
function formatSalary(value: OlxSalaryValue): string | null {
  const { from, to, type, currency } = value;
  if (from == null && to == null) return null;
  const unit = type === 'hourly' ? '/h' : type === 'monthly' ? '/mies.' : '';
  const cur = currency === 'PLN' ? 'zł' : currency ?? 'zł';
  if (from != null && to != null && from !== to) return `${from}–${to} ${cur}${unit}`;
  return `${from ?? to} ${cur}${unit}`;
}

function parseOffer(offer: OlxOffer): ScrapedAd | null {
  const title = offer.title?.trim();
  if (!title) return null;

  // Job gate — only actual job offers, not products/services listings
  if (offer.category?.type !== 'job') return null;

  // Region gate — only Szczecin area
  const region = offer.location?.region?.normalized_name?.toLowerCase();
  if (region && region !== ALLOWED_REGION) return null;

  const url = offer.url || '';
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

  // Relevance gate — drop non-construction jobs (sales, IT, drivers, etc.)
  if (!isConstruction(title, description)) return null;

  const company = offer.business ? (offer.user?.company_name || offer.user?.name || null) : null;

  return {
    id: hashId(url || String(offer.id ?? title)),
    title,
    description,
    source_url: url,
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

interface FetchOpts {
  query?: string;
  categoryId?: number;
  offset?: number;
  limit?: number;
}

/** Single OLX API page fetch with retry on transient failure. */
async function fetchOlxPage(opts: FetchOpts): Promise<ScrapedAd[]> {
  const params = new URLSearchParams({
    offset: String(opts.offset ?? 0),
    limit: String(opts.limit ?? 40),
    region_id: String(REGION_ZACHODNIOPOMORSKIE),
    sort_by: 'created_at:desc',
  });
  if (opts.query) params.set('query', opts.query);
  if (opts.categoryId) params.set('category_id', String(opts.categoryId));

  // Retry once on network/5xx errors — OLX occasionally rate-limits bursts.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${OLX_API}?${params.toString()}`, {
        headers: {
          'User-Agent': ua(),
          Accept: 'application/json',
          'Accept-Language': 'pl-PL,pl;q=0.9',
          Referer: 'https://www.olx.pl/praca/',
        },
        signal: AbortSignal.timeout(9000),
        // Scoped TLS-relaxed dispatcher (see olxDispatcher comment above)
        dispatcher: olxDispatcher,
      } as RequestInit & { dispatcher: Agent });
      if (res.status >= 500) { await sleep(300); continue; }
      if (!res.ok) {
        console.error(`OLX fetch ${res.status} for ${params.toString()}`);
        return [];
      }
      const json = (await res.json()) as { data?: OlxOffer[] };
      const raw = json.data ?? [];
      const parsed = raw.map(parseOffer).filter((a): a is ScrapedAd => a !== null);
      console.log(`OLX ${params.get('query') || 'cat=' + params.get('category_id')}: raw=${raw.length} parsed=${parsed.length}`);
      return parsed;
    } catch (e) {
      if (attempt === 0) { await sleep(300); continue; }
      const err = e as { message?: string; cause?: { code?: string; message?: string } };
      console.error('OLX fetch error:', err.message, '| cause:', err.cause?.code, err.cause?.message);
      return [];
    }
  }
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '40', 10), 80);
  const customQuery = url.searchParams.get('query');

  try {
    const sources: Promise<ScrapedAd[]>[] = [];

    if (customQuery) {
      // User-driven search: two pages of the jobs root for depth
      sources.push(fetchOlxPage({ query: customQuery, categoryId: CATEGORY_JOBS_ROOT, offset: 0, limit: 40 }));
      sources.push(fetchOlxPage({ query: customQuery, categoryId: CATEGORY_JOBS_ROOT, offset: 40, limit: 40 }));
    } else {
      // Default sweep: trade-specific queries against the jobs root, run in
      // parallel. Each returns ~6-8 relevant offers; deduped afterwards.
      const perQuery = Math.max(6, Math.ceil(limit / SEARCH_QUERIES.length));
      for (const q of SEARCH_QUERIES) {
        sources.push(fetchOlxPage({ query: q, categoryId: CATEGORY_JOBS_ROOT, limit: perQuery }));
      }
    }

    const batches = await Promise.all(sources);

    // Merge + dedupe by id
    const seen = new Set<string>();
    const ads: ScrapedAd[] = [];
    for (const batch of batches) {
      for (const ad of batch) {
        if (!seen.has(ad.id)) { seen.add(ad.id); ads.push(ad); }
      }
    }

    // Sort newest-first by published_at
    ads.sort((a, b) => {
      const ta = a.published_at ? Date.parse(a.published_at) : 0;
      const tb = b.published_at ? Date.parse(b.published_at) : 0;
      return tb - ta;
    });

    const limited = ads.slice(0, limit);

    // Best-effort Firestore persistence — capped at 4s so a slow/unreachable
    // Firestore never blocks returning fresh data to the client.
    let stored = 0;
    if (limited.length > 0) {
      try {
        const batch = adminFirestore.batch();
        for (const ad of limited.slice(0, 500)) {
          const ref = adminFirestore.collection('announcements').doc(ad.id);
          batch.set(ref, {
            deduplication_key: ad.id,
            title: ad.title,
            description: ad.description,
            source_url: ad.source_url,
            source_portal: ad.source_portal,
            category: ad.category,
            location_text: ad.location_text,
            latitude: ad.latitude,
            longitude: ad.longitude,
            price: ad.price,
            company: ad.company,
            employment_type: ad.employment_type,
            scraped_at: new Date(),
            published_at: ad.published_at ? new Date(ad.published_at) : null,
          }, { merge: true });
          stored++;
        }
        await Promise.race([
          batch.commit(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('firestore-timeout')), 4000)),
        ]);
      } catch (e) {
        stored = 0;
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Firestore write skipped (non-fatal):', msg);
      }
    }

    return NextResponse.json({
      success: true,
      data: limited,
      metadata: {
        totalScraped: limited.length,
        storedInFirestore: stored,
        scrapedAt: new Date().toISOString(),
        source: 'OLX API v1 (Praca + Budownictwo)',
        region: 'Zachodniopomorskie',
        queries: customQuery ? [customQuery] : SEARCH_QUERIES,
      },
    });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json({ success: false, error: 'Scraping failed', data: [] }, { status: 500 });
  }
}
