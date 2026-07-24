'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export interface CommuteRadiusProps {
  map: maplibregl.Map | null;
  homeLat: number;
  homeLng: number;
  radiusKm: number;
}

/**
 * Calculates GeoJSON Polygon coordinates for a circle given a center and radius in km.
 */
function createGeoJsonCircle(center: [number, number], radiusKm: number, points = 64) {
  const [lng, lat] = center;
  const coords = [];
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

/**
 * Draws a translucent commute radius circle and a home pin on MapLibre GL JS map.
 */
export function CommuteRadius({
  map,
  homeLat,
  homeLng,
  radiusKm,
}: CommuteRadiusProps) {
  const homeMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const sourceId = 'commute-radius-source';
    const fillLayerId = 'commute-radius-fill';
    const lineLayerId = 'commute-radius-line';

    const circleData = createGeoJsonCircle([homeLng, homeLat], radiusKm);

    // Add GeoJSON source for commute circle
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: circleData,
      });

      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#2563eb',
          'fill-opacity': 0.08,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#2563eb',
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });
    } else {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(circleData);
    }

    // Home icon marker
    const homeEl = document.createElement('div');
    homeEl.innerHTML = '🏠';
    homeEl.style.fontSize = '20px';
    homeEl.style.lineHeight = '1';
    homeEl.style.cursor = 'default';

    const homeMarker = new maplibregl.Marker({ element: homeEl })
      .setLngLat([homeLng, homeLat])
      .addTo(map);

    homeMarkerRef.current = homeMarker;

    return () => {
      homeMarker.remove();
      homeMarkerRef.current = null;

      if (map.getStyle()) {
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, homeLat, homeLng, radiusKm]);

  return null;
}

