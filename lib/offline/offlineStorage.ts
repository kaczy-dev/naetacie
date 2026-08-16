/**
 * Progressive Web App Offline Storage Engine.
 * Caches saved job offers and phone numbers for offline access on job sites.
 */

import { ScrapedAd } from '@/lib/scraper/types';

const OFFLINE_CACHE_KEY = 'naetacie_offline_saved_ads_v1';

export function saveAdsForOffline(ads: ScrapedAd[]): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getOfflineSavedAds();
    const map = new Map<string, ScrapedAd>();

    for (const item of existing) map.set(item.id, item);
    for (const item of ads) map.set(item.id, item);

    const merged = Array.from(map.values()).slice(0, 100); // keep last 100 saved ads
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(merged));
  } catch {
    /* localStorage full or quota exceeded */
  }
}

export function getOfflineSavedAds(): ScrapedAd[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(OFFLINE_CACHE_KEY);
    return data ? (JSON.parse(data) as ScrapedAd[]) : [];
  } catch {
    return [];
  }
}

export function removeOfflineAd(adId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getOfflineSavedAds();
    const filtered = existing.filter((a) => a.id !== adId);
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(filtered));
  } catch {
    /* ignore */
  }
}
