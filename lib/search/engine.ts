/**
 * Enhanced full-text search engine with Szczecin district mapping,
 * diacritic tolerance, field weights & intelligent relevance scoring.
 */

import type { DisplayAnnouncement } from '@/lib/types/display';

/** Bounding box bounds for Szczecin and immediate metropolitan area */
export const SZCZECIN_BOUNDS = {
  minLat: 53.25,
  maxLat: 53.68,
  minLng: 14.25,
  maxLng: 14.85,
};

/** List of recognized Szczecin districts */
export const SZCZECIN_DISTRICTS = [
  'szczecin', 'centrum', 'pogodno', 'prawobrzeze', 'niebuszewo', 'dabie',
  'gumience', 'warszewo', 'bukowe', 'kijewo', 'zelechowa', 'stolczyn',
  'skolwin', 'golocin', 'pomorzany', 'turzyn', 'sloneczne', 'majowe',
  'podjuchy', 'zydowce', 'miedzyodrze', 'osowow', 'golecino', 'laskowo'
];

/** Check if an announcement belongs strictly to Szczecin metropolitan region */
export function isSzczecinAnnouncement(ad: DisplayAnnouncement): boolean {
  // Check lat/lng coordinates if present
  if (ad.latitude && ad.longitude) {
    const inBounds =
      ad.latitude >= SZCZECIN_BOUNDS.minLat &&
      ad.latitude <= SZCZECIN_BOUNDS.maxLat &&
      ad.longitude >= SZCZECIN_BOUNDS.minLng &&
      ad.longitude <= SZCZECIN_BOUNDS.maxLng;

    if (inBounds) return true;
  }

  // Check text location fallback
  const loc = normalizeText(ad.location_text || '');
  return SZCZECIN_DISTRICTS.some((district) => loc.includes(district));
}

/** Normalize text: lowercase + strip Polish diacritics for lenient matching. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining marks
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a raw query into normalized non-empty terms. */
export function tokenize(query: string): string[] {
  const norm = normalizeText(query);
  return norm ? norm.split(' ').filter(Boolean) : [];
}

/** Simple Levenshtein distance (for short words, perf is fine). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

/** Check if a term fuzzy-matches any word in the haystack (1 edit allowed for 5+ char words). */
function fuzzyMatch(term: string, haystack: string): boolean {
  if (haystack.includes(term)) return true;
  if (term.length < 4) return false;

  const words = haystack.split(' ');
  for (const w of words) {
    if (Math.abs(w.length - term.length) > 1) continue;
    if (levenshtein(term, w) <= 1) return true;
  }
  return false;
}

interface SearchableFields {
  title: string;
  company: string;
  location: string;
  description: string;
  employment: string;
}

function fieldsOf(ad: DisplayAnnouncement): SearchableFields {
  return {
    title: normalizeText(ad.title),
    company: normalizeText(ad.company ?? ''),
    location: normalizeText(ad.location_text),
    description: normalizeText(ad.description),
    employment: normalizeText(ad.employment_type ?? ''),
  };
}

const WEIGHTS = { title: 15, company: 6, location: 4, employment: 4, description: 1 };

/**
 * Returns a relevance score for one ad against the query terms.
 * 0 means "does not match" (at least one term missing entirely).
 */
export function searchScore(ad: DisplayAnnouncement, terms: string[]): number {
  if (terms.length === 0) return 1;

  const f = fieldsOf(ad);
  const haystack = `${f.title} ${f.company} ${f.location} ${f.employment} ${f.description}`;

  let score = 0;
  for (const term of terms) {
    if (!haystack.includes(term) && !fuzzyMatch(term, haystack)) return 0;

    if (f.title.includes(term)) score += WEIGHTS.title;
    if (f.company.includes(term)) score += WEIGHTS.company;
    if (f.location.includes(term)) score += WEIGHTS.location;
    if (f.employment.includes(term)) score += WEIGHTS.employment;
    if (f.description.includes(term)) score += WEIGHTS.description;

    if (new RegExp(`\\b${term}\\b`).test(f.title)) score += 8;
    if (f.title.startsWith(term)) score += 5;
  }

  // Salary bonus for clear job offers
  if (typeof ad.price === 'number' && ad.price > 0) score += 2;

  // Freshness boost
  const ageMs = Date.now() - ad.scraped_at.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  if (ageDays < 1) score += 5;
  else if (ageDays < 3) score += 3;
  else if (ageDays < 7) score += 1;

  return score;
}

/**
 * Filters + ranks ads by a free-text query.
 */
export function searchAnnouncements(
  ads: DisplayAnnouncement[],
  query: string
): DisplayAnnouncement[] {
  const terms = tokenize(query);
  if (terms.length === 0) return ads;

  const scored = ads
    .map((ad) => ({ ad, score: searchScore(ad, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.ad);
}
