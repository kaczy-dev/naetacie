/**
 * Master Multi-Portal Scraper Engine for Job Announcements (OLX, Pracuj.pl, Indeed).
 * Coordinates parallel extraction, cross-portal fuzzy deduplication, NLP trait extraction,
 * Szczecin market benchmark evaluation, district geocoding, and Firestore persistence.
 */

import { ScrapedAd, PortalScraperResult } from './types';
import { scrapeOlx } from './olxScraper';
import { scrapePracuj } from './pracujScraper';
import { scrapeIndeed } from './indeedScraper';
import { deduplicateCrossPortalAds, MergedScrapedAd } from '@/lib/deduplication/crossPortalDeduplicator';
import { extractJobTraits, ExtractedJobTraits } from '@/lib/ai/freeJobExtractor';
import { evaluateMarketSalary, MarketEvaluation } from '@/lib/stats/marketBenchmarks';
import { adminFirestore } from '@/lib/firebase/admin';
import { filterAndAddAvailableOffers } from '@/lib/verification/offerAvailability';

export interface EnrichedScrapedAd extends MergedScrapedAd {
  traits: ExtractedJobTraits;
  market_evaluation: MarketEvaluation;
}

/** Coordinates lookup table for Szczecin districts and surrounding towns. */
const LOCATION_COORDINATES: Record<string, { lat: number; lon: number }> = {
  gumieńce: { lat: 53.3973, lon: 14.5064 },
  prawobrzeże: { lat: 53.409, lon: 14.6133 },
  dąbie: { lat: 53.4539, lon: 14.5281 },
  pogodno: { lat: 53.437, lon: 14.521 },
  niebuszewo: { lat: 53.4468, lon: 14.5622 },
  centrum: { lat: 53.4285, lon: 14.5528 },
  bezrzecze: { lat: 53.3683, lon: 14.5789 },
  załom: { lat: 53.3932, lon: 14.6488 },
  police: { lat: 53.5513, lon: 14.5692 },
  goleniów: { lat: 53.564, lon: 14.8298 },
  stargard: { lat: 53.3362, lon: 15.05 },
  gryfino: { lat: 53.2538, lon: 14.4889 },
  szczecin: { lat: 53.4285, lon: 14.5528 },
};

function enrichCoordinates(ad: ScrapedAd): ScrapedAd {
  if (ad.latitude != null && ad.longitude != null) return ad;

  const locLower = ad.location_text.toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (locLower.includes(key)) {
      return {
        ...ad,
        latitude: coords.lat,
        longitude: coords.lon,
      };
    }
  }

  return {
    ...ad,
    latitude: 53.4285,
    longitude: 14.5528,
  };
}

export interface MultiPortalScrapeOptions {
  query?: string;
  limit?: number;
  portals?: ('olx' | 'pracuj' | 'indeed')[];
}

export interface MultiPortalScrapeResponse {
  success: boolean;
  data: EnrichedScrapedAd[];
  metadata: {
    totalScraped: number;
    storedInFirestore: number;
    rejectedUnavailableCount?: number;
    scrapedAt: string;
    breakdown: Record<string, number>;
    queries: string[];
  };
}

export async function runMultiPortalScrape(
  options: MultiPortalScrapeOptions = {}
): Promise<MultiPortalScrapeResponse> {
  const { query, limit = 60, portals = ['olx', 'pracuj', 'indeed'] } = options;

  const tasks: Promise<PortalScraperResult>[] = [];

  if (portals.includes('olx')) {
    tasks.push(
      (async () => {
        const start = Date.now();
        try {
          const ads = await scrapeOlx({ query, limit });
          return { portal: 'olx' as const, ads, durationMs: Date.now() - start };
        } catch (e) {
          return { portal: 'olx' as const, ads: [], error: (e as Error).message, durationMs: Date.now() - start };
        }
      })()
    );
  }

  if (portals.includes('pracuj')) {
    tasks.push(
      (async () => {
        const start = Date.now();
        try {
          const ads = await scrapePracuj({ query, limit: Math.ceil(limit / 2) });
          return { portal: 'pracuj' as const, ads, durationMs: Date.now() - start };
        } catch (e) {
          return { portal: 'pracuj' as const, ads: [], error: (e as Error).message, durationMs: Date.now() - start };
        }
      })()
    );
  }

  if (portals.includes('indeed')) {
    tasks.push(
      (async () => {
        const start = Date.now();
        try {
          const ads = await scrapeIndeed({ query, limit: Math.ceil(limit / 2) });
          return { portal: 'indeed' as const, ads, durationMs: Date.now() - start };
        } catch (e) {
          return { portal: 'indeed' as const, ads: [], error: (e as Error).message, durationMs: Date.now() - start };
        }
      })()
    );
  }

  const results = await Promise.allSettled(tasks);

  const rawAds: ScrapedAd[] = [];
  const breakdown: Record<string, number> = { olx: 0, pracuj: 0, indeed: 0 };

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const res = r.value;
      breakdown[res.portal] = res.ads.length;

      for (const rawAd of res.ads) {
        rawAds.push(enrichCoordinates(rawAd));
      }
    }
  }

  // 1. Cross-portal fuzzy deduplication
  const mergedAds = deduplicateCrossPortalAds(rawAds);

  // 2. Enrich with zero-cost AI NLP traits & Szczecin market benchmarks
  const enrichedAds: EnrichedScrapedAd[] = mergedAds.map((ad) => {
    const traits = extractJobTraits(ad.title, ad.description);
    const market_evaluation = evaluateMarketSalary(ad.title, ad.price);
    return {
      ...ad,
      traits,
      market_evaluation,
    };
  });

  // 3. Filter out unavailable/expired offers and auto-add only active ones
  const { availableOffers, summary } = await filterAndAddAvailableOffers(enrichedAds);

  // 4. Sort newest first by published_at / scraped_at
  availableOffers.sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : Date.parse(a.scraped_at);
    const tb = b.published_at ? Date.parse(b.published_at) : Date.parse(b.scraped_at);
    return tb - ta;
  });

  const limitedAds = availableOffers.slice(0, limit);

  // Best-effort Firestore write capped at 4s
  let storedCount = 0;
  if (limitedAds.length > 0) {
    try {
      const batch = adminFirestore.batch();
      for (const ad of limitedAds.slice(0, 500)) {
        const ref = adminFirestore.collection('announcements').doc(ad.id);
        batch.set(
          ref,
          {
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
            traits: ad.traits,
            market_evaluation: ad.market_evaluation,
            available_portals: ad.available_portals,
            is_cross_posted: ad.is_cross_posted,
            is_active: true,
            availability_status: 'active',
            verified_at: new Date(),
            scraped_at: new Date(),
            published_at: ad.published_at ? new Date(ad.published_at) : null,
          },
          { merge: true }
        );
        storedCount++;
      }

      await Promise.race([
        batch.commit(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('firestore-timeout')), 4000)),
      ]);
    } catch (e) {
      storedCount = 0;
      console.warn('Firestore write non-fatal timeout or error:', (e as Error).message);
    }
  }

  return {
    success: true,
    data: limitedAds,
    metadata: {
      totalScraped: limitedAds.length,
      storedInFirestore: storedCount,
      rejectedUnavailableCount: summary.rejectedCount,
      scrapedAt: new Date().toISOString(),
      breakdown,
      queries: query ? [query] : ['murarz', 'elektryk', 'hydraulik', 'malarz', 'dekarz', 'brukarz', 'monter', 'budowlany'],
    },
  };
}
