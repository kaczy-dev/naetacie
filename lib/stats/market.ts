/**
 * Market statistics engine — pure, deterministic aggregations over offers.
 *
 * Powers the "Rynek pracy" insights: average/median salary per category,
 * offer counts, salary ranges. All functions are side-effect free and
 * unit-tested.
 */

import { normalizeCategory, type CategoryKey } from '@/lib/data/categories';
import type { DisplayAnnouncement } from '@/lib/types/display';

export interface CategoryStats {
  category: CategoryKey;
  count: number;
  /** Number of offers that had a parseable salary */
  withSalary: number;
  minSalary: number | null;
  maxSalary: number | null;
  avgSalary: number | null;
  medianSalary: number | null;
}

export interface MarketOverview {
  totalOffers: number;
  offersWithSalary: number;
  overallAvgSalary: number | null;
  overallMedianSalary: number | null;
  topLocation: string | null;
  byCategory: CategoryStats[];
  /** Newest offer age in hours (freshness signal) */
  freshestHours: number | null;
}

/**
 * Parse a salary field into a single representative monthly-ish number.
 * Handles: numbers, "35–37 zł/h", "6500 zł/mies.", "6000-8500 zł".
 * Hourly rates are converted to monthly (× 168h) for comparability.
 */
export function parseSalary(price: string | number | null): number | null {
  if (price === null) return null;
  if (typeof price === 'number') return price;

  const text = price.toLowerCase().replace(/\s/g, '');
  // Extract all numbers (handles ranges like "35-37" or "6000–8500")
  const nums = text.match(/\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length === 0) return null;

  const values = nums.map((n) => parseFloat(n.replace(',', '.'))).filter((n) => !isNaN(n));
  if (values.length === 0) return null;

  // Use the midpoint of a range, or the single value
  const mid = values.reduce((s, v) => s + v, 0) / values.length;

  // Hourly → monthly (approx 168 working hours/month)
  const isHourly = /\/h|godz|zł\/h/.test(text);
  const monthly = isHourly ? mid * 168 : mid;

  // Sanity clamp — drop obviously broken EUR/typo values
  if (monthly < 1000 || monthly > 60000) return null;
  return Math.round(monthly);
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Compute stats for a single category slice. */
function statsFor(category: CategoryKey, ads: DisplayAnnouncement[]): CategoryStats {
  const salaries = ads
    .map((a) => parseSalary(a.price))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  return {
    category,
    count: ads.length,
    withSalary: salaries.length,
    minSalary: salaries.length ? salaries[0] : null,
    maxSalary: salaries.length ? salaries[salaries.length - 1] : null,
    avgSalary: salaries.length ? Math.round(salaries.reduce((s, v) => s + v, 0) / salaries.length) : null,
    medianSalary: salaries.length ? Math.round(median(salaries)) : null,
  };
}

/** Build a full market overview from a list of offers. */
export function computeMarketOverview(ads: DisplayAnnouncement[]): MarketOverview {
  // Group by category
  const groups = new Map<CategoryKey, DisplayAnnouncement[]>();
  for (const ad of ads) {
    const cat = normalizeCategory(ad.category);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(ad);
  }

  const byCategory = Array.from(groups.entries())
    .map(([cat, list]) => statsFor(cat, list))
    .sort((a, b) => b.count - a.count);

  // Overall salary stats
  const allSalaries = ads
    .map((a) => parseSalary(a.price))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  // Top location by offer count
  const locCounts = new Map<string, number>();
  for (const ad of ads) {
    const loc = ad.location_text.split(',')[0].trim();
    locCounts.set(loc, (locCounts.get(loc) ?? 0) + 1);
  }
  const topLocation = locCounts.size
    ? Array.from(locCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Freshness
  const now = Date.now();
  const ages = ads.map((a) => (now - a.scraped_at.getTime()) / 3_600_000).filter((h) => h >= 0);
  const freshestHours = ages.length ? Math.round(Math.min(...ages)) : null;

  return {
    totalOffers: ads.length,
    offersWithSalary: allSalaries.length,
    overallAvgSalary: allSalaries.length ? Math.round(allSalaries.reduce((s, v) => s + v, 0) / allSalaries.length) : null,
    overallMedianSalary: allSalaries.length ? Math.round(median(allSalaries)) : null,
    topLocation,
    byCategory,
    freshestHours,
  };
}
