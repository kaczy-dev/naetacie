/**
 * Apify Webhook Ingestion Pipeline.
 * Processes webhook callbacks from Apify Actors, downloads dataset items if needed,
 * normalizes ads, applies geocoding + AI traits + cross-portal deduplication,
 * and atomically commits active listings to Firestore.
 */

import { ScrapedAd, SourcePortal } from '../types';
import { enrichCoordinates } from '../engine';
import { deduplicateCrossPortalAds } from '@/lib/deduplication/crossPortalDeduplicator';
import { extractJobTraits } from '@/lib/ai/freeJobExtractor';
import { evaluateMarketSalary } from '@/lib/stats/marketBenchmarks';
import { filterAndAddAvailableOffers } from '@/lib/verification/offerAvailability';
import { adminFirestore } from '@/lib/firebase/admin';
import { ApifyClient, defaultApifyClient } from './apifyClient';
import { ApifyRawJobItem, ApifyWebhookPayload } from './types';

export interface ApifyIngestResult {
  success: boolean;
  totalReceived: number;
  totalValid: number;
  storedInFirestore: number;
  rejectedUnavailable: number;
  portalCounts: Record<string, number>;
  error?: string;
}

export async function processApifyWebhook(
  payload: ApifyWebhookPayload,
  client: ApifyClient = defaultApifyClient
): Promise<ApifyIngestResult> {
  const result: ApifyIngestResult = {
    success: false,
    totalReceived: 0,
    totalValid: 0,
    storedInFirestore: 0,
    rejectedUnavailable: 0,
    portalCounts: {},
  };

  let rawItems: ApifyRawJobItem[] = [];

  // 1. If payload directly provided items
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    rawItems = payload.items as ApifyRawJobItem[];
  } else if (payload.resource?.defaultDatasetId) {
    // 2. Fetch dataset items from Apify
    try {
      rawItems = await client.getDatasetItems<ApifyRawJobItem>(
        payload.resource.defaultDatasetId,
        { limit: 200 }
      );
    } catch (err) {
      result.error = `Failed to fetch dataset from Apify: ${(err as Error).message}`;
      return result;
    }
  }

  result.totalReceived = rawItems.length;
  if (rawItems.length === 0) {
    result.success = true;
    return result;
  }

  // 3. Normalize items to ScrapedAd
  const validAds: ScrapedAd[] = [];
  for (const raw of rawItems) {
    const ad = client.normalizeItem(raw, 'olx');
    if (ad) {
      const enriched = enrichCoordinates(ad);
      validAds.push(enriched);
      result.portalCounts[enriched.source_portal] =
        (result.portalCounts[enriched.source_portal] || 0) + 1;
    }
  }

  result.totalValid = validAds.length;
  if (validAds.length === 0) {
    result.success = true;
    return result;
  }

  // 4. Cross-portal fuzzy deduplication & entity resolution
  const mergedAds = deduplicateCrossPortalAds(validAds);

  // 5. Enrich with zero-cost AI traits, tools, and market benchmarks
  const enrichedAds = mergedAds
    .map((ad) => {
      const traits = extractJobTraits(ad.title, ad.description, ad.price, ad.phone);
      const market_evaluation = evaluateMarketSalary(ad.title, ad.price);
      return {
        ...ad,
        traits,
        market_evaluation,
      };
    })
    .filter(
      (ad) =>
        !ad.traits.fraud_analysis?.isSuspicious ||
        (ad.traits.fraud_analysis?.score ?? 0) < 0.7
    );

  // 6. Filter out unavailable or expired offers
  const { availableOffers, summary } = await filterAndAddAvailableOffers(enrichedAds);
  result.rejectedUnavailable = summary.rejectedCount;

  // 7. Write to Firestore in batches
  if (availableOffers.length > 0) {
    try {
      const batch = adminFirestore.batch();
      for (const ad of availableOffers.slice(0, 500)) {
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
            salary_range: ad.salary_range || null,
            phone: ad.phone || null,
            photos: ad.photos || null,
            company: ad.company,
            employment_type: ad.employment_type,
            traits: ad.traits,
            market_evaluation: ad.market_evaluation,
            available_portals: ad.available_portals,
            source_urls: ad.source_urls || { [ad.source_portal]: ad.source_url },
            is_cross_posted: ad.is_cross_posted,
            is_active: true,
            availability_status: 'active',
            verified_at: new Date(),
            scraped_at: new Date(),
            published_at: ad.published_at ? new Date(ad.published_at) : new Date(),
          },
          { merge: true }
        );
        result.storedInFirestore++;
      }

      await Promise.race([
        batch.commit(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('firestore-timeout')), 5000)
        ),
      ]);
    } catch (e) {
      console.warn('Firestore webhook write error or timeout:', (e as Error).message);
    }
  }

  result.success = true;
  return result;
}
