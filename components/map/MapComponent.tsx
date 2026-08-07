'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MaskedAnnouncement } from '@/lib/types/announcement';
import { filterGeocodedAnnouncements, formatPrice } from './utils';
import { getAnnouncementExternalUrl } from '@/lib/utils';
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
      const price = announcement.price;
      let badgeColorClass = 'badge-slate';
      let priceLabel = 'Oferta';

      if (price) {
        priceLabel = `${Math.round(price).toLocaleString('pl-PL')} zł`;
        if (price >= 8500) badgeColorClass = 'badge-emerald'; // High tier
        else if (price >= 6000) badgeColorClass = 'badge-gold'; // Market avg
        else badgeColorClass = 'badge-blue'; // Standard
      } else {
        badgeColorClass = 'badge-purple'; // Estimated
        priceLabel = 'Estymacja AI';
      }

      // Create custom HTML element for marker badge
      const el = document.createElement('div');
      el.className = `map-price-pin ${badgeColorClass}`;
      el.innerHTML = `<div class="map-price-badge ${badgeColorClass}">${priceLabel}</div>`;

      const redirectUrl = getAnnouncementExternalUrl(announcement);

      const contactPhone = (announcement as { contact_info?: string | null }).contact_info;
      const phoneDigits = contactPhone ? contactPhone.replace(/\D/g, '') : null;

      // Popup HTML content
      const popupHtml = `
        <div class="map-popup p-3 max-w-xs bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-medium capitalize">
              ${announcement.source_portal} • ${announcement.category || 'budowa'}
            </span>
            <span class="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              🛡️ Bezpieczna
            </span>
          </div>

          <h3 class="map-popup__title font-bold text-sm text-slate-100 line-clamp-2 leading-snug mb-1">${announcement.title}</h3>
          <p class="map-popup__location text-xs text-slate-400 mb-2">📍 ${announcement.location_text}</p>
          <p class="map-popup__price text-base font-bold text-emerald-400 mb-3">${formatPrice(announcement.price)}</p>

          <div class="flex flex-col gap-1.5">
            <a href="${redirectUrl}" target="_blank" rel="noopener noreferrer" class="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-lg text-center shadow transition-transform active:scale-95 flex items-center justify-center gap-1.5">
              <span>Otwórz aktualną ofertę</span>
              <span>🚀</span>
            </a>

            ${phoneDigits ? `
              <div class="grid grid-cols-2 gap-1.5 pt-1">
                <a href="tel:+48${phoneDigits}" class="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md text-center flex items-center justify-center gap-1">
                  <span>📞 Zadzwoń</span>
                </a>
                <a href="https://wa.me/48${phoneDigits}" target="_blank" rel="noopener noreferrer" class="py-1.5 px-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md text-center flex items-center justify-center gap-1">
                  <span>💬 WhatsApp</span>
                </a>
              </div>
            ` : ''}
          </div>
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



