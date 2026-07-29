/**
 * Algorithm for Verifying Job Offer Availability & Automatic Ingestion.
 * Senior Mobile/Web Developer Architecture for "Na Etacie".
 *
 * Checks if a job offer is active and available based on:
 * 1. Structural & metadata completeness.
 * 2. Expiration age / retention thresholds.
 * 3. Polish & English closed/expired keyword patterns in title and description.
 * 4. Real-time HTTP portal reachability and dead-offer page signatures.
 */

import { ScrapedAd } from '@/lib/scraper/types';
import { Announcement } from '@/lib/types/announcement';
import { adminFirestore } from '@/lib/firebase/admin';

export type OfferUnavailabilityReason =
  | 'INVALID_METADATA'
  | 'EXPIRED_AGE'
  | 'CLOSED_KEYWORD_MATCH'
  | 'HTTP_NOT_FOUND'
  | 'LIVE_PORTAL_INACTIVE'
  | 'UNKNOWN_ERROR';

export interface OfferAvailabilityResult {
  isAvailable: boolean;
  reason?: OfferUnavailabilityReason;
  details?: string;
  verifiedAt: string;
  confidence: number; // 0.0 to 1.0
}

export interface AvailabilityCheckOptions {
  maxAgeDays?: number;
  checkLiveHttp?: boolean;
  httpTimeoutMs?: number;
}

export interface IngestionResult<T> {
  availableOffers: T[];
  rejectedOffers: Array<{ offer: T; reason: OfferUnavailabilityReason; details?: string }>;
  summary: {
    totalChecked: number;
    availableCount: number;
    rejectedCount: number;
    storedInFirestoreCount: number;
  };
}

/** Polish and English patterns indicating an offer is closed, expired, or unavailable */
const EXPIRED_KEYWORD_PATTERNS = [
  /ogłoszenie\s+(jest\s+)?(nieaktualne|zakończone|wygasło|archiwalne|usunięte)/i,
  /rekrutacja\s+(jest\s+)?(zakończona|wstrzymana|zamknięta)/i,
  /oferta\s+(jest\s+)?(nieaktualna|niebyła|archiwalna|wygasła)/i,
  /nie\s+aktualn[ae]/i,
  /brak\s+wolnych\s+miejsc/i,
  /stanowisko\s+obsadzone/i,
  /ogłoszenie\s+archiwalne/i,
  /no\s+longer\s+available/i,
  /job\s+(is\s+)?(closed|expired|archived|removed)/i,
  /position\s+filled/i,
];

/** Dead offer HTML signatures on major job portals */
const PORTAL_DEAD_OFFER_SIGNATURES: Record<string, RegExp[]> = {
  olx: [
    /To\s+ogłoszenie\s+nie\s+jest\s+już\s+dostępne/i,
    /Ogłoszenie\s+jest\s+nieaktualne/i,
    /Ogłoszenie\s+zostało\s+przeniesione\s+do\s+archiwum/i,
    /Nie\s+znaleźliśmy\s+ogłoszenia/i,
  ],
  pracuj: [
    /Oferta\s+wygasła/i,
    /Ogłoszenie\s+archiwalne/i,
    /Ta\s+oferta\s+pracy\s+jest\s+już\s+nieaktualna/i,
    /Nie\s+znaleźliśmy\s+strony/i,
  ],
  indeed: [
    /This\s+job\s+has\s+expired/i,
    /Ta\s+oferta\s+pracy\s+wygasła/i,
    /Job\s+no\s+longer\s+available/i,
  ],
};

/**
 * Checks if an offer passes basic metadata completeness checks.
 */
export function checkMetadataCompleteness(
  ad: Partial<ScrapedAd | Announcement>
): { valid: boolean; details?: string } {
  if (!ad) return { valid: false, details: 'Offer object is null or undefined' };

  const title = (ad.title || '').trim();
  const sourceUrl = ('source_url' in ad ? ad.source_url : 'sourceUrl' in ad ? (ad as { sourceUrl?: string }).sourceUrl : '') || '';

  if (!title) return { valid: false, details: 'Missing title' };
  if (!sourceUrl || sourceUrl.trim() === '') return { valid: false, details: 'Missing source_url' };

  return { valid: true };
}

/**
 * Checks if an offer date exceeds maximum retention age (default 30 days).
 */
export function checkOfferAge(
  ad: Partial<ScrapedAd | Announcement>,
  maxAgeDays = 30
): { valid: boolean; ageDays?: number; details?: string } {
  const dateStr = ad.published_at || ad.scraped_at;
  if (!dateStr) return { valid: true }; // Allow if no timestamp present

  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  if (isNaN(date.getTime())) return { valid: true };

  const now = Date.now();
  const diffMs = now - date.getTime();
  const ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (ageDays > maxAgeDays) {
    return {
      valid: false,
      ageDays,
      details: `Offer is ${ageDays} days old, exceeding maximum threshold of ${maxAgeDays} days`,
    };
  }

  return { valid: true, ageDays };
}

/**
 * Checks title and description for keywords indicating the offer was closed.
 */
export function checkKeywordAvailability(
  title: string,
  description: string
): { valid: boolean; matchedKeyword?: string } {
  const content = `${title} ${description}`;

  for (const pattern of EXPIRED_KEYWORD_PATTERNS) {
    const match = pattern.exec(content);
    if (match) {
      return { valid: false, matchedKeyword: match[0] };
    }
  }

  return { valid: true };
}

/**
 * Performs a live HTTP GET/HEAD verification on the offer URL to verify if page is active.
 */
export async function checkLiveHttpAvailability(
  url: string,
  portal?: string,
  timeoutMs = 4000
): Promise<{ isAvailable: boolean; reason?: OfferUnavailabilityReason; details?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9',
      },
      signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(timeoutMs) : controller.signal,
    });

    clearTimeout(timer);

    if (res.status === 404 || res.status === 410) {
      return { isAvailable: false, reason: 'HTTP_NOT_FOUND', details: `HTTP Status ${res.status}` };
    }

    // If redirected to home/search page rather than direct offer page
    const finalUrl = res.url;
    if (url.includes('/d/oferta/') && !finalUrl.includes('/d/oferta/') && !finalUrl.includes('ID')) {
      return {
        isAvailable: false,
        reason: 'LIVE_PORTAL_INACTIVE',
        details: `Redirected to non-offer page: ${finalUrl}`,
      };
    }

    if (res.ok) {
      const html = await res.text();
      const portalKey = portal?.toLowerCase() || '';

      // Check generic or portal-specific dead offer signatures in HTML body
      const signatures = PORTAL_DEAD_OFFER_SIGNATURES[portalKey] || [
        ...PORTAL_DEAD_OFFER_SIGNATURES.olx,
        ...PORTAL_DEAD_OFFER_SIGNATURES.pracuj,
        ...PORTAL_DEAD_OFFER_SIGNATURES.indeed,
      ];

      for (const rx of signatures) {
        if (rx.test(html)) {
          return {
            isAvailable: false,
            reason: 'LIVE_PORTAL_INACTIVE',
            details: `Page HTML matched dead-offer pattern: ${rx.source}`,
          };
        }
      }
    }

    return { isAvailable: true };
  } catch (error) {
    const err = error as Error;
    // Timeout or network error - fail open for transient network errors to avoid dropping valid offers
    return { isAvailable: true, details: `Network check skipped (${err.message})` };
  }
}

/**
 * Main availability verification function for a single offer.
 */
export async function verifyOfferAvailability(
  ad: Partial<ScrapedAd | Announcement>,
  options: AvailabilityCheckOptions = {}
): Promise<OfferAvailabilityResult> {
  const verifiedAt = new Date().toISOString();
  const { maxAgeDays = 30, checkLiveHttp = false, httpTimeoutMs = 4000 } = options;

  // 1. Metadata completeness
  const metaCheck = checkMetadataCompleteness(ad);
  if (!metaCheck.valid) {
    return {
      isAvailable: false,
      reason: 'INVALID_METADATA',
      details: metaCheck.details,
      verifiedAt,
      confidence: 1.0,
    };
  }

  // 2. Age / Expiration threshold
  const ageCheck = checkOfferAge(ad, maxAgeDays);
  if (!ageCheck.valid) {
    return {
      isAvailable: false,
      reason: 'EXPIRED_AGE',
      details: ageCheck.details,
      verifiedAt,
      confidence: 0.95,
    };
  }

  // 3. Keyword / Closed status heuristics
  const title = ad.title || '';
  const description = ad.description || '';
  const keywordCheck = checkKeywordAvailability(title, description);
  if (!keywordCheck.valid) {
    return {
      isAvailable: false,
      reason: 'CLOSED_KEYWORD_MATCH',
      details: `Matched closed phrase: "${keywordCheck.matchedKeyword}"`,
      verifiedAt,
      confidence: 0.9,
    };
  }

  // 4. Optional Live HTTP Portal Reachability
  const sourceUrl = ('source_url' in ad ? ad.source_url : (ad as { sourceUrl?: string }).sourceUrl) || '';
  const sourcePortal = ('source_portal' in ad ? ad.source_portal : (ad as { sourcePortal?: string }).sourcePortal) || undefined;

  if (checkLiveHttp && sourceUrl) {
    const httpCheck = await checkLiveHttpAvailability(sourceUrl, sourcePortal, httpTimeoutMs);
    if (!httpCheck.isAvailable) {
      return {
        isAvailable: false,
        reason: httpCheck.reason || 'LIVE_PORTAL_INACTIVE',
        details: httpCheck.details,
        verifiedAt,
        confidence: 0.98,
      };
    }
  }

  return {
    isAvailable: true,
    verifiedAt,
    confidence: 1.0,
  };
}

/**
 * Filter algorithm: Evaluates an array of offers and automatically keeps ONLY active & available offers.
 * Optionally stores available offers in Firestore.
 */
export async function filterAndAddAvailableOffers<T extends Partial<ScrapedAd | Announcement>>(
  offers: T[],
  options: AvailabilityCheckOptions & { storeInFirestore?: boolean } = {}
): Promise<IngestionResult<T>> {
  const availableOffers: T[] = [];
  const rejectedOffers: Array<{ offer: T; reason: OfferUnavailabilityReason; details?: string }> = [];

  for (const offer of offers) {
    const result = await verifyOfferAvailability(offer, options);

    if (result.isAvailable) {
      const enrichedOffer = {
        ...offer,
        is_active: true,
        availability_status: 'active',
        verified_at: result.verifiedAt,
      };
      availableOffers.push(enrichedOffer as T);
    } else {
      rejectedOffers.push({
        offer,
        reason: result.reason || 'UNKNOWN_ERROR',
        details: result.details,
      });
    }
  }

  let storedInFirestoreCount = 0;

  if (options.storeInFirestore && availableOffers.length > 0) {
    try {
      const batch = adminFirestore.batch();
      for (const offer of availableOffers) {
        const id = ('id' in offer && offer.id) ? (offer.id as string) : ('deduplication_key' in offer && offer.deduplication_key) ? (offer.deduplication_key as string) : null;
        if (!id) continue;

        const ref = adminFirestore.collection('announcements').doc(id);
        batch.set(
          ref,
          {
            ...offer,
            is_active: true,
            availability_status: 'active',
            verified_at: new Date(),
          },
          { merge: true }
        );
        storedInFirestoreCount++;
      }

      await Promise.race([
        batch.commit(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('firestore-timeout')), 4000)),
      ]);
    } catch (e) {
      console.warn('Firestore auto-ingest timeout or error:', (e as Error).message);
    }
  }

  return {
    availableOffers,
    rejectedOffers,
    summary: {
      totalChecked: offers.length,
      availableCount: availableOffers.length,
      rejectedCount: rejectedOffers.length,
      storedInFirestoreCount,
    },
  };
}
