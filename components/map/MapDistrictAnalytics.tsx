'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { DisplayAnnouncement } from '@/lib/types/display';

export interface DistrictStat {
  name: string;
  center: [number, number]; // [lng, lat]
  count: number;
  avgPrice: number | null;
}

export interface MapDistrictAnalyticsProps {
  map: maplibregl.Map | null;
  ads: DisplayAnnouncement[];
  visible: boolean;
  ui: {
    surface: string;
    border: string;
    text: string;
    shadow: string;
  };
  isDark: boolean;
}

/**
 * Known Szczecin & regional district boundaries / center centroids
 */
const KNOWN_DISTRICTS: Array<{ name: string; center: [number, number]; keywords: string[] }> = [
  { name: 'Śródmieście', center: [14.5528, 53.4285], keywords: ['śródmieście', 'centrum', 'stare miasto'] },
  { name: 'Prawobrzeże', center: [14.6500, 53.3850], keywords: ['prawobrzeże', 'majakowskiego', 'słoneczne', 'bukowe', 'dąbie'] },
  { name: 'Zachód / Pogodno', center: [14.5150, 53.4450], keywords: ['pogodno', 'zawadzkiego', 'krzekowo', 'bezrzecze'] },
  { name: 'Północ / Niebuszewo', center: [14.5600, 53.4600], keywords: ['niebuszewo', 'żelechowa', 'stelmacha', 'warszewo'] },
];

export function MapDistrictAnalytics({
  map,
  ads,
  visible,
  ui,
  isDark,
}: MapDistrictAnalyticsProps) {
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const districtStats = useMemo(() => {
    const statsMap = new Map<string, { count: number; prices: number[]; center: [number, number] }>();

    KNOWN_DISTRICTS.forEach((d) => {
      statsMap.set(d.name, { count: 0, prices: [], center: d.center });
    });

    ads.forEach((ad) => {
      if (ad.latitude == null || ad.longitude == null) return;
      const locLower = ad.location_text.toLowerCase();

      let matched = KNOWN_DISTRICTS.find((d) =>
        d.keywords.some((k) => locLower.includes(k))
      );

      if (!matched) {
        // Fallback matching by proximity to center
        matched = KNOWN_DISTRICTS[0];
      }

      const entry = statsMap.get(matched.name);
      if (entry) {
        entry.count += 1;
        if (typeof ad.price === 'number' && ad.price > 0) {
          entry.prices.push(ad.price);
        }
      }
    });

    const result: DistrictStat[] = [];
    statsMap.forEach((data, name) => {
      if (data.count > 0) {
        const avg = data.prices.length > 0
          ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
          : null;
        result.push({
          name,
          center: data.center,
          count: data.count,
          avgPrice: avg,
        });
      }
    });

    return result;
  }, [ads]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!visible) return;

    districtStats.forEach((stat) => {
      const priceText = stat.avgPrice ? `~${stat.avgPrice.toLocaleString('pl-PL')} zł` : `${stat.count} ofert`;

      const el = document.createElement('div');
      el.className = 'district-analytics-badge';
      el.style.background = isDark ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.95)';
      el.style.border = `1.5px solid ${isDark ? '#374151' : '#e5e7eb'}`;
      el.style.borderRadius = '16px';
      el.style.padding = '6px 12px';
      el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.gap = '2px';
      el.style.whiteSpace = 'nowrap';
      el.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';

      el.innerHTML = `
        <div style="font-size: 10px; font-weight: 700; color: ${isDark ? '#9ca3af' : '#6b7280'}; text-transform: uppercase; letter-spacing: 0.05em;">${stat.name}</div>
        <div style="font-size: 12px; font-weight: 800; color: #10b981;">${priceText}</div>
        <div style="font-size: 9px; font-weight: 600; color: ${isDark ? '#d1d5db' : '#374151'};">${stat.count} ogłoszeń</div>
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });
      el.addEventListener('click', () => {
        map.flyTo({
          center: stat.center,
          zoom: 13,
          duration: 1000,
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(stat.center)
        .addTo(map);

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [map, districtStats, visible, isDark]);

  return null;
}
