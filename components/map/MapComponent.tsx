'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MaskedAnnouncement } from '@/lib/types/announcement';
import { filterGeocodedAnnouncements, formatPrice } from './utils';
import { SearchAreaButton } from './SearchAreaButton';

// Szczecin coordinates and default zoom [lng, lat] for MapLibre
const SZCZECIN_CENTER: [number, number] = [14.5528, 53.4285];
const DEFAULT_ZOOM = 10;

// CartoDB Voyager GL vector style (Free & GPU accelerated)
const CARTO_GL_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export interface MapComponentProps {
  announcements: MaskedAnnouncement[];
  onMarkerClick?: (id: string) => void;
  onSearchArea?: (bounds: { south: number; west: number; north: number; east: number }) => void;
}

export default function MapComponent({
  announcements,
  onMarkerClick,
  onSearchArea,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapMoved, setMapMoved] = useState(false);

  const geocodedAnnouncements = filterGeocodedAnnouncements(announcements);

  const handleSearchAreaClick = useCallback(() => {
    const map = mapRef.current;
    if (!map || !onSearchArea) return;
    const b = map.getBounds();
    onSearchArea({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    });
    setMapMoved(false);
  }, [onSearchArea]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize MapLibre instance
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: CARTO_GL_STYLE,
      center: SZCZECIN_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const handleMoveEnd = () => setMapMoved(true);
    map.on('moveend', handleMoveEnd);

    mapRef.current = map;

    return () => {
      map.off('moveend', handleMoveEnd);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when announcements change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    geocodedAnnouncements.forEach((announcement) => {
      const priceLabel = announcement.price
        ? `${Math.round(announcement.price).toLocaleString('pl-PL')} zł`
        : 'Oferta';

      // Create custom HTML element for marker badge
      const el = document.createElement('div');
      el.className = 'map-price-pin';
      el.innerHTML = `<div class="map-price-badge">${priceLabel}</div>`;

      // Popup HTML content
      const popupHtml = `
        <div class="map-popup">
          <h3 class="map-popup__title">${announcement.title}</h3>
          <p class="map-popup__location">📍 ${announcement.location_text}</p>
          <p class="map-popup__price">${formatPrice(announcement.price)}</p>
          <a href="/announcements/${announcement.deduplication_key}" class="map-popup__link">
            Zobacz szczegóły
          </a>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([announcement.longitude!, announcement.latitude!])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => {
        onMarkerClick?.(announcement.deduplication_key);
      });

      markersRef.current.push(marker);
    });
  }, [geocodedAnnouncements, onMarkerClick]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {onSearchArea && (
        <SearchAreaButton visible={mapMoved} onClick={handleSearchAreaClick} />
      )}
      <div
        ref={mapContainerRef}
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
      />
    </div>
  );
}



