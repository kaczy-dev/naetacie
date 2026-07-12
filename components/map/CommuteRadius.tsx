'use client';

import { Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

/**
 * Draws a translucent circle showing the user's max commute distance.
 * Only shown when job preferences include homeLat + maxDistanceKm.
 * Uses a dashed stroke so it's visible but non-obtrusive.
 */
export function CommuteRadius({
  homeLat,
  homeLng,
  radiusKm,
}: {
  homeLat: number;
  homeLng: number;
  radiusKm: number;
}) {
  const map = useMap();

  // Add a subtle "home" marker at the center
  useEffect(() => {
    const homeMarker = L.marker([homeLat, homeLng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:14px;">🏠</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
      interactive: false,
    }).addTo(map);

    return () => { map.removeLayer(homeMarker); };
  }, [map, homeLat, homeLng]);

  return (
    <Circle
      center={[homeLat, homeLng]}
      radius={radiusKm * 1000}
      pathOptions={{
        color: '#2563eb',
        weight: 2,
        dashArray: '6 4',
        fillColor: '#2563eb',
        fillOpacity: 0.04,
      }}
    />
  );
}
