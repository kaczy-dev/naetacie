/**
 * Advanced Cross-Portal Fuzzy Matching & Entity Resolution Engine 2.0.
 *
 * Detects identical and near-duplicate job postings published across OLX, Pracuj.pl,
 * Indeed, GoWork, Jooble, Oferteo, and Fixly.
 *
 * Multi-layer Resolution Strategy:
 * 1. Exact Phone Handshake Match (Highest fidelity cross-portal link)
 * 2. Company Name Canonicalization + Trade & District Match
 * 3. N-gram Dice & Jaccard Token Cosine Similarity with Polish Stop-word Pruning
 * 4. Rich Attribute Synthesis (merges best photos, phone, salary, company info)
 */

import { ScrapedAd, SourcePortal } from '@/lib/scraper/types';
import { removePolishDiacritics } from '@/lib/utils';

export interface MergedScrapedAd extends ScrapedAd {
  available_portals: SourcePortal[];
  source_urls: Record<string, string>;
  is_cross_posted: boolean;
  match_confidence?: number;
}

const STOP_WORDS = new Set([
  'dla',
  'oraz',
  'szczecin',
  'praca',
  'szukam',
  'zatrudnie',
  'zatrudnimy',
  'od',
  'zaraz',
  'firmy',
  'budowlana',
  'budowlane',
  'prace',
  'oferta',
  'dam',
  'pilnie',
  'stanowisko',
  'dobra',
  'stawka',
  'szczecinie',
]);

/**
 * Normalizes company names by stripping Polish legal abbreviations and company suffixes.
 * e.g. "Bud-Max Sp. z o.o. Sp.k." -> "bud max"
 * e.g. "STRABAG Spółka z o.o." -> "strabag"
 */
export function canonicalizeCompanyName(company: string | null | undefined): string {
  if (!company) return '';
  const noDiacritics = removePolishDiacritics(company.toLowerCase());
  return noDiacritics
    .replace(/\b(spolka\s+(?:akcyjna|komandytowa|jawna|cywilna|z\s*o\.?\s*o\.?)|spolka)\b/gi, '')
    .replace(/\b(sp\.?\s*z\s*o\.?\s*o\.?|s\.?a\.?|s\.?k\.?|s\.?c\.?|f\.?h\.?u\.?|p\.?p\.?h\.?u\.?|z\.?p\.?u\.?)\b/gi, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes title / text for fuzzy token matching.
 */
function normalizeTokens(str: string): Set<string> {
  const clean = removePolishDiacritics(str.toLowerCase())
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return new Set(clean);
}

/**
 * Calculates Jaccard Token Similarity between two strings (0.0 to 1.0).
 */
export function calculateTokenSimilarity(t1: string, t2: string): number {
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
 * Calculates Character Bigram Dice Coefficient for fine-grained subword similarity.
 */
export function calculateDiceCoefficient(s1: string, s2: string): number {
  const clean1 = removePolishDiacritics(s1.toLowerCase()).replace(/[^\w]/g, '');
  const clean2 = removePolishDiacritics(s2.toLowerCase()).replace(/[^\w]/g, '');

  if (clean1 === clean2) return 1.0;
  if (clean1.length < 2 || clean2.length < 2) return 0.0;

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < clean1.length - 1; i++) {
    const bg = clean1.slice(i, i + 2);
    bigrams1.set(bg, (bigrams1.get(bg) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < clean2.length - 1; i++) {
    const bg = clean2.slice(i, i + 2);
    const count = bigrams1.get(bg) || 0;
    if (count > 0) {
      bigrams1.set(bg, count - 1);
      intersection++;
    }
  }

  const total = clean1.length - 1 + (clean2.length - 1);
  return total > 0 ? (2 * intersection) / total : 0;
}

/**
 * Determines whether two ads represent the same real-world job posting.
 */
export function areAdsEquivalent(ad1: ScrapedAd, ad2: ScrapedAd): { isMatch: boolean; confidence: number } {
  // 1. Phone number exact match (if both present and 9 digits)
  if (ad1.phone && ad2.phone) {
    const p1 = ad1.phone.replace(/\D/g, '').slice(-9);
    const p2 = ad2.phone.replace(/\D/g, '').slice(-9);
    if (p1.length === 9 && p1 === p2) {
      const tokenSim = calculateTokenSimilarity(ad1.title, ad2.title);
      // Even with slight title difference, same phone = identical employer offer
      if (tokenSim >= 0.25 || ad1.category === ad2.category) {
        return { isMatch: true, confidence: 0.98 };
      }
    }
  }

  // 2. Company name match + fuzzy title similarity
  const c1 = canonicalizeCompanyName(ad1.company);
  const c2 = canonicalizeCompanyName(ad2.company);
  const sameCompany = c1.length >= 3 && c2.length >= 3 && (c1 === c2 || calculateDiceCoefficient(c1, c2) >= 0.85);

  const tokenSim = calculateTokenSimilarity(ad1.title, ad2.title);
  const diceSim = calculateDiceCoefficient(ad1.title, ad2.title);
  const titleCompositeSim = Math.max(tokenSim, diceSim);

  // High title similarity (70%+)
  if (titleCompositeSim >= 0.7) {
    return { isMatch: true, confidence: titleCompositeSim };
  }

  // Medium title similarity (50%+) + identical company
  if (titleCompositeSim >= 0.5 && sameCompany) {
    return { isMatch: true, confidence: 0.88 };
  }

  // Same company + identical category + description snippet overlap
  if (sameCompany && ad1.category === ad2.category && ad1.description && ad2.description) {
    const descSim = calculateTokenSimilarity(ad1.description.slice(0, 150), ad2.description.slice(0, 150));
    if (descSim >= 0.45) {
      return { isMatch: true, confidence: 0.82 };
    }
  }

  return { isMatch: false, confidence: 0 };
}

/**
 * Deduplicates and merges raw scraped ads from multiple portals into unified rich models.
 */
export function deduplicateCrossPortalAds(ads: ScrapedAd[]): MergedScrapedAd[] {
  const mergedList: MergedScrapedAd[] = [];

  for (const ad of ads) {
    let bestMatchIndex = -1;
    let highestConfidence = 0;

    for (let i = 0; i < mergedList.length; i++) {
      const existing = mergedList[i];
      const { isMatch, confidence } = areAdsEquivalent(ad, existing);

      if (isMatch && confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatchIndex = i;
      }
    }

    if (bestMatchIndex >= 0) {
      const existing = mergedList[bestMatchIndex];

      // Merge portals
      if (!existing.available_portals.includes(ad.source_portal)) {
        existing.available_portals.push(ad.source_portal);
      }
      existing.source_urls[ad.source_portal] = ad.source_url;
      existing.is_cross_posted = existing.available_portals.length > 1;
      existing.match_confidence = Math.max(existing.match_confidence || 0, highestConfidence);

      // Synthesize best metadata
      if (!existing.price && ad.price) existing.price = ad.price;
      if (!existing.salary_range && ad.salary_range) existing.salary_range = ad.salary_range;
      if (!existing.phone && ad.phone) existing.phone = ad.phone;
      if (!existing.company && ad.company) existing.company = ad.company;
      if (!existing.employment_type && ad.employment_type) existing.employment_type = ad.employment_type;
      if (!existing.experience_level && ad.experience_level) existing.experience_level = ad.experience_level;
      if (!existing.work_schedule && ad.work_schedule) existing.work_schedule = ad.work_schedule;
      if (!existing.contract_type && ad.contract_type) existing.contract_type = ad.contract_type;

      // Prefer richer description
      if (ad.description && (!existing.description || ad.description.length > existing.description.length)) {
        existing.description = ad.description;
      }

      // Merge photos
      if (ad.photos && ad.photos.length > 0) {
        existing.photos = Array.from(new Set([...(existing.photos || []), ...ad.photos]));
      }

      // Precise coordinates if available
      if (existing.latitude == null && ad.latitude != null) {
        existing.latitude = ad.latitude;
        existing.longitude = ad.longitude;
      }
    } else {
      mergedList.push({
        ...ad,
        available_portals: [ad.source_portal],
        source_urls: { [ad.source_portal]: ad.source_url },
        is_cross_posted: false,
        match_confidence: 1.0,
      });
    }
  }

  return mergedList;
}
