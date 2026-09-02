/**
 * Mapbox Forward & Reverse Geocoding API Route.
 * Provides street-level address autocomplete and resolution in Szczecin.
 */

import { NextResponse } from 'next/server';
import { defaultMapboxClient } from '@/lib/geo/mapboxClient';
import { LOCATION_COORDINATES } from '@/lib/scraper/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const latStr = url.searchParams.get('lat');
  const lngStr = url.searchParams.get('lng');

  // Case 1: Reverse geocoding
  if (latStr && lngStr) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      if (defaultMapboxClient.isConfigured()) {
        try {
          const rev = await defaultMapboxClient.reverseGeocode(lng, lat);
          return NextResponse.json({ success: true, data: rev });
        } catch (err) {
          console.warn('Mapbox reverse geocode error:', err);
        }
      }
      return NextResponse.json({
        success: true,
        data: { lng, lat, placeName: `Szczecin (${lat.toFixed(4)}, ${lng.toFixed(4)})` },
      });
    }
  }

  // Case 2: Forward geocoding
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
  }

  if (defaultMapboxClient.isConfigured()) {
    try {
      const results = await defaultMapboxClient.forwardGeocode(q, { limit: 6 });
      return NextResponse.json({ success: true, data: results });
    } catch (err) {
      console.warn('Mapbox forward geocode error, falling back:', (err as Error).message);
    }
  }

  // Fallback: local geocoding resolution using Szczecin coordinates table
  const locLower = q.toLowerCase();
  let matchedLng = 14.5528;
  let matchedLat = 53.4285;
  let matchedName = `${q}, Szczecin`;
  let relevance = 0.5;

  for (const [district, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (locLower.includes(district)) {
      matchedLng = coords.lon;
      matchedLat = coords.lat;
      matchedName = `${district.charAt(0).toUpperCase() + district.slice(1)}, Szczecin`;
      relevance = 0.85;
      break;
    }
  }

  return NextResponse.json({
    success: true,
    data: [
      {
        lng: matchedLng,
        lat: matchedLat,
        placeName: matchedName,
        relevance,
      },
    ],
  });
}
