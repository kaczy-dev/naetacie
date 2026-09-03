/**
 * Autonomous Tombstone Sweep Service.
 * Periodically probes active announcements in Firestore to detect 404s, deleted listings,
 * and expired vacancies across all job portals.
 */

import { adminFirestore } from '@/lib/firebase/admin';
import { checkLiveHttpAvailability, checkOfferAge } from '@/lib/verification/offerAvailability';

export interface TombstoneSweepOptions {
  limit?: number;
  httpTimeoutMs?: number;
  maxAgeDays?: number;
}

export interface TombstoneSweepResult {
  probedCount: number;
  expiredCount: number;
  activeCount: number;
  expiredItems: Array<{ id: string; portal: string; reason: string }>;
  durationMs: number;
}

export async function runTombstoneSweep(
  options: TombstoneSweepOptions = {}
): Promise<TombstoneSweepResult> {
  const startTime = Date.now();
  const { limit = 30, httpTimeoutMs = 3000, maxAgeDays = 30 } = options;

  const expiredItems: Array<{ id: string; portal: string; reason: string }> = [];
  let activeCount = 0;
  let expiredCount = 0;

  try {
    const snapshot = await adminFirestore
      .collection('announcements')
      .where('is_active', '==', true)
      .limit(limit)
      .get();

    if (snapshot.empty) {
      return {
        probedCount: 0,
        expiredCount: 0,
        activeCount: 0,
        expiredItems: [],
        durationMs: Date.now() - startTime,
      };
    }

    const batch = adminFirestore.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const sourceUrl = (data.source_url as string) || '';
      const sourcePortal = (data.source_portal as string) || '';
      const publishedAt = data.published_at || data.scraped_at;

      // 1. Check TTL age expiration
      const ageCheck = checkOfferAge({ published_at: publishedAt }, maxAgeDays);
      if (!ageCheck.valid) {
        batch.update(doc.ref, {
          is_active: false,
          availability_status: 'expired',
          unavailability_reason: 'EXPIRED_AGE',
          verified_at: new Date(),
        });
        expiredCount++;
        expiredItems.push({
          id: doc.id,
          portal: sourcePortal,
          reason: ageCheck.details || 'EXPIRED_AGE',
        });
        continue;
      }

      // 2. Check live HTTP reachability if URL present
      if (!sourceUrl) {
        activeCount++;
        continue;
      }

      try {
        const httpCheck = await checkLiveHttpAvailability(sourceUrl, sourcePortal, httpTimeoutMs);
        if (!httpCheck.isAvailable) {
          batch.update(doc.ref, {
            is_active: false,
            availability_status: 'expired',
            unavailability_reason: httpCheck.reason || 'LIVE_PORTAL_INACTIVE',
            verified_at: new Date(),
          });
          expiredCount++;
          expiredItems.push({
            id: doc.id,
            portal: sourcePortal,
            reason: httpCheck.details || httpCheck.reason || 'LIVE_PORTAL_INACTIVE',
          });
        } else {
          batch.update(doc.ref, {
            verified_at: new Date(),
          });
          activeCount++;
        }
      } catch {
        // Leave active on transient network errors
        activeCount++;
      }
    }

    if (expiredCount > 0 || activeCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.warn('Tombstone sweep non-fatal failure:', (error as Error).message);
  }

  return {
    probedCount: activeCount + expiredCount,
    expiredCount,
    activeCount,
    expiredItems,
    durationMs: Date.now() - startTime,
  };
}
