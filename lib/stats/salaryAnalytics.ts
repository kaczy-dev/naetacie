/**
 * Construction Market Salary & Analytics Engine.
 * Calculates median, mean, min, max salaries per trade category and district.
 */

import { ScrapedAd, JobCategory } from '@/lib/scraper/types';

export interface TradeSalaryStats {
  category: JobCategory;
  count: number;
  monthlyMedian: number | null;
  monthlyMean: number | null;
  monthlyMin: number | null;
  monthlyMax: number | null;
  hourlyMedian: number | null;
  hourlyMean: number | null;
  sampleSize: number;
}

export interface DistrictStats {
  district: string;
  count: number;
  latitude: number;
  longitude: number;
  topCategory: JobCategory;
  avgSalary: number | null;
}

export interface MarketAnalyticsReport {
  generatedAt: string;
  totalOffersAnalyzed: number;
  offersWithSalary: number;
  overallMonthlyMedian: number | null;
  overallHourlyMedian: number | null;
  tradeStats: Record<JobCategory, TradeSalaryStats>;
  districtHeatmap: DistrictStats[];
}

function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function calculateMean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
}

export function generateMarketAnalytics(ads: ScrapedAd[]): MarketAnalyticsReport {
  const offersWithSalary = ads.filter((ad) => ad.salary_range || ad.price);

  const categories: JobCategory[] = ['budowa', 'instalacje', 'wykończenia'];
  const tradeStats: Record<JobCategory, TradeSalaryStats> = {
    budowa: { category: 'budowa', count: 0, monthlyMedian: null, monthlyMean: null, monthlyMin: null, monthlyMax: null, hourlyMedian: null, hourlyMean: null, sampleSize: 0 },
    instalacje: { category: 'instalacje', count: 0, monthlyMedian: null, monthlyMean: null, monthlyMin: null, monthlyMax: null, hourlyMedian: null, hourlyMean: null, sampleSize: 0 },
    wykończenia: { category: 'wykończenia', count: 0, monthlyMedian: null, monthlyMean: null, monthlyMin: null, monthlyMax: null, hourlyMedian: null, hourlyMean: null, sampleSize: 0 },
  };

  for (const cat of categories) {
    const catAds = ads.filter((a) => a.category === cat);
    tradeStats[cat].count = catAds.length;

    const monthlyVals: number[] = [];
    const hourlyVals: number[] = [];

    for (const ad of catAds) {
      if (ad.salary_range) {
        const sr = ad.salary_range;
        const avg = sr.min && sr.max ? (sr.min + sr.max) / 2 : sr.min || sr.max;
        if (avg && avg > 0) {
          if (sr.type === 'hourly') hourlyVals.push(avg);
          else monthlyVals.push(avg);
        }
      }
    }

    if (monthlyVals.length > 0) {
      tradeStats[cat].monthlyMedian = calculateMedian(monthlyVals);
      tradeStats[cat].monthlyMean = calculateMean(monthlyVals);
      tradeStats[cat].monthlyMin = Math.min(...monthlyVals);
      tradeStats[cat].monthlyMax = Math.max(...monthlyVals);
      tradeStats[cat].sampleSize = monthlyVals.length;
    }

    if (hourlyVals.length > 0) {
      tradeStats[cat].hourlyMedian = calculateMedian(hourlyVals);
      tradeStats[cat].hourlyMean = calculateMean(hourlyVals);
    }
  }

  // District Heatmap breakdown
  const districtMap = new Map<string, { count: number; lat: number; lon: number; categories: Record<JobCategory, number>; salaries: number[] }>();

  for (const ad of ads) {
    const distName = ad.location_text.replace(/^szczecin,\s*/i, '').trim() || 'Szczecin Centrum';
    const lat = ad.latitude || 53.4285;
    const lon = ad.longitude || 14.5528;

    if (!districtMap.has(distName)) {
      districtMap.set(distName, {
        count: 0,
        lat,
        lon,
        categories: { budowa: 0, instalacje: 0, wykończenia: 0 },
        salaries: [],
      });
    }

    const item = districtMap.get(distName)!;
    item.count++;
    item.categories[ad.category] = (item.categories[ad.category] || 0) + 1;

    if (ad.salary_range?.min) item.salaries.push(ad.salary_range.min);
  }

  const districtHeatmap: DistrictStats[] = Array.from(districtMap.entries()).map(([district, data]) => {
    const topCat = (Object.keys(data.categories) as JobCategory[]).reduce((a, b) =>
      data.categories[a] > data.categories[b] ? a : b
    );
    return {
      district,
      count: data.count,
      latitude: data.lat,
      longitude: data.lon,
      topCategory: topCat,
      avgSalary: calculateMean(data.salaries),
    };
  });

  const allMonthly = Object.values(tradeStats)
    .flatMap((t) => (t.monthlyMedian ? [t.monthlyMedian] : []));
  const allHourly = Object.values(tradeStats)
    .flatMap((t) => (t.hourlyMedian ? [t.hourlyMedian] : []));

  return {
    generatedAt: new Date().toISOString(),
    totalOffersAnalyzed: ads.length,
    offersWithSalary: offersWithSalary.length,
    overallMonthlyMedian: calculateMedian(allMonthly),
    overallHourlyMedian: calculateMedian(allHourly),
    tradeStats,
    districtHeatmap,
  };
}
