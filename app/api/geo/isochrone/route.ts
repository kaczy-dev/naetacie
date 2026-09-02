/**
 * Mapbox Real-Time Commute Isochrone API Route.
 * Returns driving / cycling travel-time polygons taking Szczecin bridges and traffic into account.
 */

import { NextResponse } from 'next/server';
import { defaultMapboxClient } from '@/lib/geo/mapboxClient';
import { generateSzczecinIsochrone } from '@/lib/geo/isochroneCalculator';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const latStr = url.searchParams.get('lat') || '53.4285';
  const lngStr = url.searchParams.get('lng') || '14.5528';
  const minutesStr = url.searchParams.get('minutes') || '15,30';
  const profile = (url.searchParams.get('profile') || 'driving') as 'driving' | 'walking' | 'cycling';

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ success: false, error: 'Invalid coordinates' }, { status: 400 });
  }

  const minutes = minutesStr
    .split(',')
    .map((m) => parseInt(m.trim(), 10))
    .filter((m) => !isNaN(m) && m > 0 && m <= 60);

  const targetMinutes = minutes.length > 0 ? minutes : [15, 30];

  if (defaultMapboxClient.isConfigured()) {
    try {
      const geojson = await defaultMapboxClient.getIsochrone([lng, lat], {
        contoursMinutes: targetMinutes,
        profile,
      });
      return NextResponse.json({ success: true, isRealTraffic: true, data: geojson });
    } catch (err) {
      console.warn('Mapbox isochrone API error, falling back to local model:', (err as Error).message);
    }
  }

  // Fallback: local geometric Szczecin isochrone generator
  const maxMins = Math.max(...targetMinutes);
  const fallbackFeature = generateSzczecinIsochrone(
    lng,
    lat,
    maxMins,
    profile === 'walking' || profile === 'cycling' ? 'transit' : 'car'
  );

  return NextResponse.json({
    success: true,
    isRealTraffic: false,
    data: {
      type: 'FeatureCollection',
      features: [fallbackFeature],
    },
  });
}
