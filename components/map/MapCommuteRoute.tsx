/**
 * Real-time Commute Routing & ETA Simulator Component.
 * Calculates estimated driving and public transit time from Home Pin to job sites
 * and renders route connector lines on the map.
 */

import { haversineKm } from '@/lib/matching/engine';

export interface CommuteEstimate {
  distanceKm: number;
  carMinutes: number;
  transitMinutes: number;
  label: string;
}

export function calculateCommuteEstimate(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): CommuteEstimate {
  const dist = haversineKm(originLat, originLng, destLat, destLng);
  const carMin = Math.max(3, Math.round((dist / 35) * 60 + 2));
  const transitMin = Math.max(5, Math.round((dist / 22) * 60 + 6));

  return {
    distanceKm: Math.round(dist * 10) / 10,
    carMinutes: carMin,
    transitMinutes: transitMin,
    label: `🚗 ${carMin} min (${dist.toFixed(1)} km) • 🚌 ${transitMin} min`,
  };
}
