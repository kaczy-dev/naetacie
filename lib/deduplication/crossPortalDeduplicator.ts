/**
 * Advanced Cross-Portal Fuzzy Matching & Deduplication Engine.
 * Detects identical job postings published across OLX, Pracuj.pl, and Indeed,
 * merging them into unified job entries with multi-portal badges.
 */

import { ScrapedAd, SourcePortal } from '@/lib/scraper/types';
import { removePolishDiacritics } from '@/lib/utils';

export interface MergedScrapedAd extends ScrapedAd {
  available_portals: SourcePortal[];
  source_urls: Record<string, string>;
  is_cross_posted: boolean;
}

/**
 * Normalizes title for fuzzy token matching.
 */
function normalizeTokens(str: string): Set<string> {
  const clean = removePolishDiacritics(str.toLowerCase())
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !['dla', 'oraz', 'szczecin', 'praca', 'szukam'].includes(w));
  return new Set(clean);
}

/**
 * Calculates Jaccard Token Similarity between two titles (0.0 to 1.0).
 */
function calculateTokenSimilarity(t1: string, t2: string): number {
  const set1 = normalizeTokens(t1);
  const set2 = normalizeTokens(t2);

  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) intersection++;
  }

  const union = new Set([...set1, ...set2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Deduplicates and merges raw scraped ads from multiple portals.
 */
export function deduplicateCrossPortalAds(ads: ScrapedAd[]): MergedScrapedAd[] {
  const mergedList: MergedScrapedAd[] = [];

  for (const ad of ads) {
    let matchFound = false;

    for (const existing of mergedList) {
      const similarity = calculateTokenSimilarity(ad.title, existing.title);
      const sameCompany =
        ad.company && existing.company
          ? removePolishDiacritics(ad.company.toLowerCase()) ===
            removePolishDiacritics(existing.company.toLowerCase())
          : false;

      // Threshold: 70%+ title similarity OR 50%+ similarity with identical company
      if (similarity >= 0.7 || (similarity >= 0.5 && sameCompany)) {
        matchFound = true;
        if (!existing.available_portals.includes(ad.source_portal)) {
          existing.available_portals.push(ad.source_portal);
        }
        existing.source_urls[ad.source_portal] = ad.source_url;
        existing.is_cross_posted = existing.available_portals.length > 1;

        // Prefer OLX or Pracuj full description/price if existing is missing
        if (!existing.price && ad.price) existing.price = ad.price;
        if (!existing.company && ad.company) existing.company = ad.company;
        if (!existing.employment_type && ad.employment_type) existing.employment_type = ad.employment_type;
        break;
      }
    }

    if (!matchFound) {
      mergedList.push({
        ...ad,
        available_portals: [ad.source_portal],
        source_urls: { [ad.source_portal]: ad.source_url },
        is_cross_posted: false,
      });
    }
  }

  return mergedList;
}
