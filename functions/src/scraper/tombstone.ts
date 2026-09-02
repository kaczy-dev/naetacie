/**
 * Tombstone & Dead Offer Cleanup Worker for Scraper Pipeline.
 * Probes existing database offers against portal APIs to vacuum expired / 404 listings.
 */

import { verifyOlxOfferLive } from '../../../lib/olx/olxLinkResolver';

export interface OfferToProbe {
  id: string;
  nativeId?: string | null;
  source_portal: string;
}

export interface TombstoneCleanResult {
  totalProbed: number;
  expiredCount: number;
  activeCount: number;
  expiredIds: string[];
  activeIds: string[];
}

/**
 * Sweeps a batch of existing announcements and flags dead/404 listings.
 */
export async function sweepDeadOffers(
  offers: OfferToProbe[],
  probeLiveFn = verifyOlxOfferLive
): Promise<TombstoneCleanResult> {
  const expiredIds: string[] = [];
  const activeIds: string[] = [];

  for (const offer of offers) {
    if (offer.source_portal === 'olx' && offer.nativeId) {
      try {
        const isLive = await probeLiveFn(offer.nativeId, 300);
        if (!isLive) {
          expiredIds.push(offer.id);
        } else {
          activeIds.push(offer.id);
        }
      } catch {
        // On probe timeout/network failure, assume still active
        activeIds.push(offer.id);
      }
    } else {
      activeIds.push(offer.id);
    }
  }

  return {
    totalProbed: offers.length,
    expiredCount: expiredIds.length,
    activeCount: activeIds.length,
    expiredIds,
    activeIds,
  };
}
