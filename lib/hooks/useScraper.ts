'use client';

/**
 * Hook for triggering on-demand scraping and managing scraped data.
 * Fetches fresh ads from /api/scrape and merges with existing data.
 * Falls back to static seed data if the scrape returns nothing.
 */

import { useState, useCallback, useEffect } from 'react';

export interface ScrapedAd {
  id: string;
  title: string;
  description: string;
  source_url: string;
  source_portal: string;
  category: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  price: string | null;
  scraped_at: string;
  published_at: string | null;
  company?: string | null;
  employment_type?: string | null;
  posted_days_ago?: number | null;
}

interface UseScraperResult {
  ads: ScrapedAd[];
  loading: boolean;
  error: string | null;
  lastScrapedAt: Date | null;
  scrapeNow: (query?: string, limit?: number) => Promise<void>;
  /** Whether an automatic 6h refresh cycle is active */
  autoRefresh: boolean;
}

/** How often to auto-refresh listings (6 hours), matching the backend cron cadence. */
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const LAST_SCRAPE_KEY = 'last-auto-scrape';

async function seedFallback(): Promise<ScrapedAd[]> {
  const { SEED_DATA } = await import('@/lib/data/announcements');
  return SEED_DATA.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    source_url: s.source_url,
    source_portal: s.source_portal,
    category: s.category,
    location_text: s.location_text,
    latitude: s.latitude,
    longitude: s.longitude,
    price: s.price ? `${s.price} zł` : null,
    scraped_at: new Date(Date.now() - (s.posted_days_ago ?? Math.random() * 7) * 86400000).toISOString(),
    published_at: null,
    company: s.company ?? null,
    employment_type: s.employment_type ?? null,
    posted_days_ago: s.posted_days_ago ?? null,
  }));
}

export function useScraper(): UseScraperResult {
  const [ads, setAds] = useState<ScrapedAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScrapedAt, setLastScrapedAt] = useState<Date | null>(null);

  const scrapeNow = useCallback(async (query?: string, limit: number = 40) => {
    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (query) qs.set('query', query);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`/api/scrape?${qs.toString()}`, { signal: controller.signal });
      clearTimeout(timeout);

      const json = await response.json();

      if (json.success && json.data && json.data.length > 0) {
        setAds((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newAds = json.data.filter((a: ScrapedAd) => !existingIds.has(a.id));
          return [...newAds, ...prev].slice(0, 120);
        });
        setLastScrapedAt(new Date());
        try { localStorage.setItem(LAST_SCRAPE_KEY, String(Date.now())); } catch { /* ignore */ }
      } else {
        setAds(await seedFallback());
        setLastScrapedAt(new Date());
      }
    } catch {
      setAds(await seedFallback());
      setLastScrapedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 6h. On mount, if the last scrape is stale (or unknown),
  // trigger one immediately; then set an interval for subsequent refreshes.
  useEffect(() => {
    let stale = true;
    try {
      const last = localStorage.getItem(LAST_SCRAPE_KEY);
      if (last) stale = Date.now() - parseInt(last, 10) > REFRESH_INTERVAL_MS;
    } catch { /* ignore */ }

    if (stale) scrapeNow(undefined, 40);

    const interval = setInterval(() => scrapeNow(undefined, 40), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ads, loading, error, lastScrapedAt, scrapeNow, autoRefresh: true };
}
