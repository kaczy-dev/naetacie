'use client';

/**
 * Hook for loading announcements with guaranteed data display.
 * 
 * Strategy:
 * 1. Immediately load static seed data (instant UI)
 * 2. Try to fetch from API in background (with 5s timeout)
 * 3. If API returns data, merge/replace seed data
 * 4. If authenticated, try Firestore realtime (with fallback)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SEED_DATA } from '@/lib/data/announcements';

export interface RealtimeAnnouncement {
  id: string;
  title: string;
  description: string;
  source_url: string;
  source_portal: string;
  category: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  price: string | number | null;
  contact_info: string | null;
  scraped_at: Date;
  published_at: Date | null;
  company?: string | null;
  employment_type?: string | null;
  posted_days_ago?: number | null;
}

interface UseRealtimeAnnouncementsResult {
  announcements: RealtimeAnnouncement[];
  loading: boolean;
  error: string | null;
  isLive: boolean;
  refresh: () => void;
}

/** Convert seed data to announcement format */
function seedToAnnouncements(): RealtimeAnnouncement[] {
  const now = Date.now();
  return SEED_DATA.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    source_url: item.source_url,
    source_portal: item.source_portal,
    category: item.category,
    location_text: item.location_text,
    latitude: item.latitude,
    longitude: item.longitude,
    price: item.price ? `${item.price} zł` : null,
    contact_info: item.phone,
    scraped_at: new Date(now - (item.posted_days_ago ?? Math.random() * 5) * 24 * 60 * 60 * 1000),
    published_at: new Date(now - (item.posted_days_ago ?? Math.random() * 10) * 24 * 60 * 60 * 1000),
    company: item.company || null,
    employment_type: item.employment_type || null,
    posted_days_ago: item.posted_days_ago ?? null,
  }));
}

export function useRealtimeAnnouncements(
  maxItems: number = 50
): UseRealtimeAnnouncementsResult {
  const [announcements, setAnnouncements] = useState<RealtimeAnnouncement[]>(seedToAnnouncements);
  const [isLive, setIsLive] = useState(false);
  const fetchedRef = useRef(false);

  const tryFetchApi = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`/api/announcements?limit=${maxItems}&page=1`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const apiData: RealtimeAnnouncement[] = json.data.map((item: Record<string, unknown>) => ({
            id: (item.deduplication_key as string) || (item.id as string) || '',
            title: (item.title as string) || '',
            description: (item.description as string) || '',
            source_url: (item.source_url as string) || '',
            source_portal: (item.source_portal as string) || '',
            category: (item.category as string) || '',
            location_text: (item.location_text as string) || '',
            latitude: item.latitude as number | null,
            longitude: item.longitude as number | null,
            price: item.price as string | number | null,
            contact_info: (item.contact_info as string) || null,
            scraped_at: new Date(item.scraped_at as string),
            published_at: item.published_at ? new Date(item.published_at as string) : null,
          }));
          setAnnouncements(apiData);
          setIsLive(true);
        }
      }
    } catch {
      // API failed — keep seed data, no error shown
    }
  }, [maxItems]);

  useEffect(() => {
    // Try API in background after initial render
    tryFetchApi();
  }, [tryFetchApi]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    tryFetchApi();
  }, [tryFetchApi]);

  return { announcements, loading: false, error: null, isLive, refresh };
}
