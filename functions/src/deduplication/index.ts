import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { ScrapedAd } from '@lib/types/announcement';

/**
 * Generates a deduplication key for a scraped ad.
 *
 * - If nativeId is non-empty: returns `${sourcePortal}-${nativeId}`
 * - If nativeId is null/empty: returns SHA-256 hex of `${title}|${publishedAt}|${description}`
 */
export function generateDeduplicationKey(ad: ScrapedAd): string {
  if (ad.nativeId != null && ad.nativeId.length > 0) {
    return `${ad.sourcePortal}-${ad.nativeId}`;
  }

  const publishedAtStr = ad.publishedAt != null ? ad.publishedAt.toISOString() : '';
  const content = `${ad.title}|${publishedAtStr}|${ad.description}`;
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Checks if an announcement with the given deduplication key already exists in Firestore.
 */
export async function checkExists(
  firestore: Firestore,
  key: string
): Promise<boolean> {
  const doc = await firestore.collection('announcements').doc(key).get();
  return doc.exists;
}

/**
 * Batch checks existence for multiple deduplication keys in Firestore.
 * Uses getAll for efficient batch reads.
 *
 * Returns a Map of key → boolean indicating existence.
 */
export async function batchCheckExists(
  firestore: Firestore,
  keys: string[]
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();

  if (keys.length === 0) {
    return result;
  }

  const refs = keys.map((key) => firestore.collection('announcements').doc(key));
  const snapshots = await firestore.getAll(...refs);

  for (let i = 0; i < keys.length; i++) {
    result.set(keys[i], snapshots[i].exists);
  }

  return result;
}
