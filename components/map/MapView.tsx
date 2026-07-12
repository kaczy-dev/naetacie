'use client';

/**
 * Interactive map integrated with the announcement list.
 *
 * Integration points (this is what makes it a single feature, not two):
 * - Receives already-filtered `ads` from the parent page — same search/sort/
 *   category/favorites filters that drive the list drive the map too.
 * - Marker click selects the ad in shared context; popup offers "Zobacz na
 *   liście" which the parent uses to switch tabs and scroll to the card.
 * - When a list card is clicked ("Pokaż na mapie"), `flyToken` changes and
 *   the map flies to that marker and opens its popup automatically.
 * - Favorited ads get a small heart badge directly on the pin.
 *
 * UI notes:
 * - All floating controls (zoom, locate, home, filters, stats, popups) are
 *   theme-aware — they switch to dark surfaces when the app is in dark mode,
 *   so nothing looks like a stray light-mode box floating over a dark map.
 * - The map wrapper has an explicit background color so a slow/failed tile
 *   load never shows through as solid black (which is what a CSS dark
 *   background page would otherwise show behind transparent 404 tiles).
 *
 * Perf notes: marker icons are cached by (category, favorite, selected) so
 * we don't reallocate SVG strings on every render, and marker refs are kept
 * in a registry so we can open a specific popup after a programmatic flyTo.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { CATEGORIES, ALL_CATEGORY_KEYS, normalizeCategory, type CategoryKey } from '@/lib/data/categories';
import { jitteredPosition } from '@/lib/geo/jitter';
import { haversineKm } from '@/lib/matching/engine';
import { SearchAreaButton } from './SearchAreaButton';
import { CommuteRadius } from './CommuteRadius';
import type { DisplayAnnouncement } from '@/lib/types/display';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const SZCZECIN: L.LatLngExpression = [53.4285, 14.5528];
const DEFAULT_ZOOM = 11;
const FLY_TO_ZOOM = 16;
const MIN_ZOOM = 8;
const MAX_ZOOM = 19;
/** Must match disableClusteringAtZoom below so a flyTo always un-clusters the target marker */
const DISABLE_CLUSTER_ZOOM = 16;

/**
 * OpenStreetMap tile endpoints. Standard OSM tiles are:
 * - Reliable (never go down for long)
 * - Already in our CSP img-src whitelist
 * - No subdomain issues
 */
const TILES = {
  light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  dark: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
};
const TILE_SUBDOMAINS = ['a', 'b', 'c'];
/** 1x1 transparent PNG used as errorTileUrl so a failed tile is invisible instead of a broken-image icon */
const TRANSPARENT_TILE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** UI surface colors for floating controls — switches with app dark mode */
const UI = {
  light: {
    surface: '#ffffff', surfaceAlpha: 'rgba(255,255,255,0.95)', border: '#e5e7eb',
    text: '#374151', textMuted: '#6b7280', shadow: '0 2px 8px rgba(0,0,0,0.15)', mapBg: '#f0f4f0',
  },
  dark: {
    surface: '#1f2937', surfaceAlpha: 'rgba(31,41,55,0.92)', border: '#374151',
    text: '#e5e7eb', textMuted: '#9ca3af', shadow: '0 2px 10px rgba(0,0,0,0.5)', mapBg: '#0f1620',
  },
};

/**
 * CSS filter that turns light OSM tiles into a dark basemap.
 * invert + hue-rotate keeps landmasses dark and water/roads legible,
 * without needing an external (CSP-restricted) dark tile provider.
 */
const DARK_TILE_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(0.8)';

// ═══════════════════════════════════════════════════════════════════
// MARKER ICONS — SVG-based DivIcon, cached per (category, favorite, selected)
// ═══════════════════════════════════════════════════════════════════

const iconCache = new Map<string, L.DivIcon>();

function getMarkerIcon(category: string, isFavorite: boolean, isSelected: boolean, dimmed: boolean = false): L.DivIcon {
  const key = `${category}|${isFavorite ? 1 : 0}|${isSelected ? 1 : 0}|${dimmed ? 1 : 0}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const cat = CATEGORIES[normalizeCategory(category)];
  const w = 30;
  const h = 38;
  const borderColor = isSelected ? cat.color : 'white';
  const shadowStyle = isSelected
    ? `filter: drop-shadow(0 3px 6px ${cat.color}88);`
    : 'filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));';
  const opacity = dimmed ? 'opacity:0.4;' : '';

  const heartBadge = isFavorite
    ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#ef4444;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:8px;line-height:1;">❤</div>`
    : '';

  const icon = L.divIcon({
    className: 'construction-marker',
    html: `
      <div role="button" tabindex="0" style="position:relative;width:${w}px;height:${h}px;${shadowStyle}${opacity}">
        <svg width="${w}" height="${h}" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 23 15 23s15-11.75 15-23C30 6.716 23.284 0 15 0z" fill="${cat.color}" stroke="${borderColor}" stroke-width="2"/>
          <circle cx="15" cy="14" r="9" fill="white"/>
          <text x="15" y="18" text-anchor="middle" font-size="11">${cat.icon}</text>
        </svg>
        ${heartBadge}
      </div>
    `,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
  });

  iconCache.set(key, icon);
  return icon;
}

function createClusterIcon(cluster: unknown): L.DivIcon {
  const c = cluster as { getChildCount: () => number };
  const count = c.getChildCount();
  let size = 38;
  let bgColor = '#2563eb';

  if (count >= 20) { size = 52; bgColor = '#9333ea'; }
  else if (count >= 10) { size = 46; bgColor = '#dc2626'; }

  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bgColor};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:700;font-size:14px;font-family:system-ui,sans-serif;
      box-shadow:0 4px 14px ${bgColor}55, 0 0 0 6px ${bgColor}22;
      border:3px solid white;
    ">${count}</div>`,
    className: '',
    iconSize: L.point(size, size),
  });
}

// ═══════════════════════════════════════════════════════════════════
// MAP CONTROL COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function ControlButton({
  onClick, title, ariaLabel, top, ui, children,
}: {
  onClick: () => void;
  title: string;
  ariaLabel: string;
  top: number;
  ui: typeof UI.light;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      style={{
        position: 'absolute', top: `${top}px`, right: '10px', zIndex: 1000,
        width: '38px', height: '38px', background: ui.surface, border: `1px solid ${ui.border}`,
        borderRadius: '10px', boxShadow: ui.shadow, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        color: ui.text, transition: 'transform 0.15s ease',
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.92)'; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
}

function LocateControl({ ui, top }: { ui: typeof UI.light; top: number }) {
  const map = useMap();
  const [state, setState] = useState<'idle' | 'locating' | 'found' | 'error'>('idle');

  const handleLocate = useCallback(() => {
    setState('locating');
    map.locate({ enableHighAccuracy: true, timeout: 8000 });

    map.once('locationfound', (e) => {
      map.flyTo(e.latlng, 14, { duration: 1.4 });
      L.circle(e.latlng, { radius: e.accuracy / 2, color: '#2563eb', fillOpacity: 0.12, weight: 1 }).addTo(map);
      L.marker(e.latlng, {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:14px;height:14px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,0.5);"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(map);
      setState('found');
    });

    map.once('locationerror', () => setState('error'));
  }, [map]);

  return (
    <ControlButton onClick={handleLocate} title="Moja lokalizacja" ariaLabel="Pokaż moją lokalizację na mapie" top={top} ui={ui}>
      {state === 'locating' ? '⏳' : state === 'error' ? '⚠️' : '📍'}
    </ControlButton>
  );
}

function HomeControl({ ui, top }: { ui: typeof UI.light; top: number }) {
  const map = useMap();
  return (
    <ControlButton
      onClick={() => map.flyTo(SZCZECIN, DEFAULT_ZOOM, { duration: 1 })}
      title="Powrót do Szczecina"
      ariaLabel="Wycentruj mapę na Szczecinie"
      top={top}
      ui={ui}
    >
      🏠
    </ControlButton>
  );
}

function CategoryFilter({
  active, onChange, ui,
}: {
  active: Set<CategoryKey>;
  onChange: (cats: Set<CategoryKey>) => void;
  ui: typeof UI.light;
}) {
  const allSelected = active.size === ALL_CATEGORY_KEYS.length;

  return (
    <div
      className="no-scrollbar"
      style={{
        position: 'absolute', top: '10px', left: '10px', right: '58px', zIndex: 1000,
        display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px',
      }}
    >
      <button
        onClick={() => onChange(allSelected ? new Set() : new Set(ALL_CATEGORY_KEYS))}
        style={{
          flexShrink: 0, padding: '6px 12px', borderRadius: '20px',
          border: `1.5px solid ${ui.border}`, background: ui.surfaceAlpha, backdropFilter: 'blur(6px)',
          color: ui.textMuted, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          boxShadow: ui.shadow, whiteSpace: 'nowrap',
        }}
      >
        {allSelected ? 'Odznacz wszystko' : 'Wybierz wszystko'}
      </button>
      {ALL_CATEGORY_KEYS.map((key) => {
        const cat = CATEGORIES[key];
        const isActive = active.has(key);
        return (
          <button
            key={key}
            onClick={() => {
              const next = new Set(active);
              if (isActive) next.delete(key); else next.add(key);
              onChange(next);
            }}
            style={{
              flexShrink: 0, pointerEvents: 'auto', padding: '6px 13px', borderRadius: '20px',
              border: `1.5px solid ${isActive ? cat.color : ui.border}`,
              background: isActive ? `${cat.color}20` : ui.surfaceAlpha,
              backdropFilter: 'blur(6px)',
              color: isActive ? cat.color : ui.textMuted,
              fontSize: '12px', fontWeight: isActive ? 700 : 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
              boxShadow: ui.shadow, transition: 'all 0.15s ease',
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MapStats({ total, visible, ui }: { total: number; visible: number; ui: typeof UI.light }) {
  return (
    <div style={{
      position: 'absolute', bottom: '116px', left: '10px', zIndex: 1000,
      background: ui.surfaceAlpha, backdropFilter: 'blur(8px)', border: `1px solid ${ui.border}`,
      padding: '6px 12px', borderRadius: '10px', boxShadow: ui.shadow,
      fontSize: '11px', color: ui.text, display: 'flex', gap: '8px', alignItems: 'center',
      pointerEvents: 'none',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
        <strong>{visible}</strong>
        <span style={{ color: ui.textMuted }}>widocznych</span>
      </span>
      <span style={{ color: ui.border }}>│</span>
      <span style={{ color: ui.textMuted }}>{total} łącznie</span>
    </div>
  );
}

/**
 * Invisible helper that flies the map to a specific ad's position and opens
 * its marker popup whenever `flyToken` changes. Lives inside MapContainer so
 * it can call useMap().
 */
function FlyToSelected({
  ads, selectedId, flyToken, markerRefs, reducedMotion,
}: {
  ads: DisplayAnnouncement[];
  selectedId: string | null;
  flyToken: number;
  markerRefs: React.MutableRefObject<Map<string, L.Marker>>;
  reducedMotion: boolean;
}) {
  const map = useMap();
  const lastToken = useRef(-1);

  useEffect(() => {
    if (flyToken === lastToken.current) return;
    lastToken.current = flyToken;
    if (!selectedId) return;

    const ad = ads.find((a) => a.id === selectedId);
    if (!ad || ad.latitude === null || ad.longitude === null) return;

    const latlng = L.latLng(ad.latitude, ad.longitude);
    if (reducedMotion) {
      map.setView(latlng, Math.max(map.getZoom(), FLY_TO_ZOOM));
    } else {
      map.flyTo(latlng, Math.max(map.getZoom(), FLY_TO_ZOOM), { duration: 1.2 });
    }

    const tryOpen = () => {
      const marker = markerRefs.current.get(selectedId);
      if (marker) {
        try { marker.openPopup(); } catch { /* marker not attached yet */ }
      }
    };
    // Popups can only be opened once the marker is actually on the map
    // (i.e. after the fly animation + un-clustering settles).
    const timeout = setTimeout(tryOpen, 700);
    return () => clearTimeout(timeout);
    // markerRefs is a stable ref container, intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToken, selectedId, ads, map]);

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// POPUP
// ═══════════════════════════════════════════════════════════════════

function MarkerPopup({
  ad, isFavorite, onToggleFavorite, onShowInList, isDark,
}: {
  ad: DisplayAnnouncement;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShowInList: () => void;
  isDark: boolean;
}) {
  const cat = CATEGORIES[normalizeCategory(ad.category)];
  const priceDisplay = ad.price
    ? (typeof ad.price === 'number' ? `${ad.price} zł${ad.price < 500 ? '/m²' : ''}` : ad.price)
    : null;

  const text = isDark ? '#f3f4f6' : '#111827';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';
  const chipBg = isDark ? '#374151' : '#f3f4f6';

  return (
    <div style={{ minWidth: '220px', maxWidth: '300px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px',
          borderRadius: '4px', background: `${cat.color}22`, color: cat.color,
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em',
        }}>
          {cat.icon} {cat.label}
        </span>
        <button
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '17px',
            color: isFavorite ? '#ef4444' : '#d1d5db', lineHeight: 1, padding: '2px',
          }}
        >
          {isFavorite ? '❤' : '♡'}
        </button>
      </div>

      <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, lineHeight: 1.3, color: text }}>
        {ad.title}
      </h3>

      <p style={{ margin: '0 0 10px', fontSize: '12px', color: textMuted, lineHeight: 1.5 }}>
        {ad.description.length > 140 ? `${ad.description.substring(0, 140)}...` : ad.description}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', background: chipBg, color: text, padding: '3px 8px', borderRadius: '4px' }}>
          📍 {ad.location_text}
        </span>
        {priceDisplay && (
          <span style={{ fontSize: '11px', background: isDark ? '#1e3a8a44' : '#dbeafe', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, color: isDark ? '#60a5fa' : '#2563eb' }}>
            {priceDisplay}
          </span>
        )}
        <span style={{ fontSize: '11px', background: chipBg, color: textMuted, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
          {ad.source_portal}
        </span>
      </div>

      {ad.phone && (
        <a href={`tel:${ad.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#16a34a', fontWeight: 600, textDecoration: 'none', marginBottom: '10px' }}>
          📞 {ad.phone}
        </a>
      )}

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={onShowInList}
          style={{
            flex: 1, textAlign: 'center', padding: '8px', background: chipBg, color: text,
            border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Zobacz na liście
        </button>
        {ad.source_url && (
          <a
            href={ad.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, textAlign: 'center', padding: '8px', background: '#2563eb', color: 'white',
              borderRadius: '7px', fontSize: '12px', fontWeight: 700, textDecoration: 'none',
            }}
          >
            Ogłoszenie →
          </a>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EMPTY STATE (no markers match current filters)
// ═══════════════════════════════════════════════════════════════════

function EmptyOverlay({ ui, hasAny }: { ui: typeof UI.light; hasAny: boolean }) {
  return (
    <div
      style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 900, background: ui.surfaceAlpha, backdropFilter: 'blur(8px)',
        border: `1px solid ${ui.border}`, borderRadius: '14px', padding: '20px 28px',
        textAlign: 'center', boxShadow: ui.shadow, pointerEvents: 'none', maxWidth: '260px',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '6px' }}>{hasAny ? '🧭' : '🏗️'}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: ui.text, marginBottom: '2px' }}>
        {hasAny ? 'Brak ogłoszeń w tych kategoriach' : 'Brak ogłoszeń do wyświetlenia'}
      </div>
      <div style={{ fontSize: '11px', color: ui.textMuted }}>
        {hasAny ? 'Włącz więcej kategorii u góry mapy' : 'Spróbuj odświeżyć listę'}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RESULTS CAROUSEL — horizontal strip of offer cards synced with markers
// ═══════════════════════════════════════════════════════════════════

function ResultsCarousel({
  ads, selectedId, ui, isDark, isFavorite, onSelect,
}: {
  ads: DisplayAnnouncement[];
  selectedId: string | null;
  ui: typeof UI.light;
  isDark: boolean;
  isFavorite: (id: string) => boolean;
  onSelect: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Auto-scroll the carousel to the selected card
  useEffect(() => {
    if (selectedId) {
      cardRefs.current.get(selectedId)?.scrollIntoView({
        behavior: 'smooth', inline: 'center', block: 'nearest',
      });
    }
  }, [selectedId]);

  if (ads.length === 0) return null;

  return (
    <div
      className="no-scrollbar"
      ref={scrollRef}
      style={{
        position: 'absolute', bottom: '10px', left: '10px', right: '10px', zIndex: 1000,
        display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px',
        scrollSnapType: 'x mandatory', pointerEvents: 'auto',
      }}
    >
      {ads.map((ad) => {
        const cat = CATEGORIES[normalizeCategory(ad.category)];
        const active = ad.id === selectedId;
        const price = ad.price
          ? (typeof ad.price === 'number' ? `${ad.price} zł` : ad.price)
          : null;
        return (
          <button
            key={ad.id}
            ref={(el) => { if (el) cardRefs.current.set(ad.id, el); else cardRefs.current.delete(ad.id); }}
            onClick={() => onSelect(ad.id)}
            style={{
              flexShrink: 0, width: '240px', scrollSnapAlign: 'center', textAlign: 'left',
              background: ui.surfaceAlpha, backdropFilter: 'blur(10px)',
              border: `2px solid ${active ? cat.color : ui.border}`,
              borderRadius: '12px', padding: '10px 12px', cursor: 'pointer',
              boxShadow: active ? `0 6px 20px ${cat.color}44` : ui.shadow,
              transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
              transform: active ? 'translateY(-2px)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: cat.color }}>
                {cat.icon} {cat.label}
              </span>
              {isFavorite(ad.id) && <span style={{ fontSize: '12px' }}>❤</span>}
            </div>
            <div style={{
              fontSize: '13px', fontWeight: 600, color: ui.text, lineHeight: 1.25,
              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '5px', minHeight: '32px',
            }}>
              {ad.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: ui.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📍 {ad.location_text}
              </span>
              {price && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#60a5fa' : '#2563eb', whiteSpace: 'nowrap' }}>
                  {price}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN MAP COMPONENT
// ═══════════════════════════════════════════════════════════════════

export interface MapViewProps {
  /** Ads to render — should already reflect the same search/sort/category/favorite filters as the list */
  ads: DisplayAnnouncement[];
  /** Total ad count before category filtering (for the "X widocznych | Y łącznie" stat) */
  totalCount?: number;
  activeCategories: Set<CategoryKey>;
  onCategoryChange: (cats: Set<CategoryKey>) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  /** id of the ad currently selected via a list card click or marker click */
  selectedId?: string | null;
  /** Bump this to force the map to fly to `selectedId` (e.g. after a list card click) */
  flyToken?: number;
  /** Called when a marker is clicked, to sync selection back into the shared context */
  onMarkerClick?: (id: string) => void;
  /** Called when the user taps "Zobacz na liście" inside a popup */
  onShowInList?: (id: string) => void;
  /** Called when user clicks "Szukaj w tym obszarze" — parent can filter list to bounds */
  onSearchArea?: (bounds: { south: number; west: number; north: number; east: number }) => void;
  /** User's home coordinates (from job preferences) — used to show commute radius */
  homeLat?: number | null;
  homeLng?: number | null;
  maxDistanceKm?: number | null;
}

export default function MapView({
  ads,
  totalCount,
  activeCategories,
  onCategoryChange,
  isFavorite,
  onToggleFavorite,
  selectedId = null,
  flyToken = 0,
  onMarkerClick,
  onShowInList,
  onSearchArea,
  homeLat = null,
  homeLng = null,
  maxDistanceKm = null,
}: MapViewProps) {
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  const visibleAds = useMemo(
    () => ads.filter((ad) => activeCategories.has(normalizeCategory(ad.category))),
    [ads, activeCategories]
  );

  const geocodedAds = useMemo(
    () => visibleAds.filter((ad) => ad.latitude !== null && ad.longitude !== null),
    [visibleAds]
  );

  // Detect app-level dark mode with debounced MutationObserver
  const [isDark, setIsDark] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const readDark = () =>
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark';

    setIsDark(readDark());
    setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setIsDark(readDark()), 50);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    return () => { observer.disconnect(); if (timeout) clearTimeout(timeout); };
  }, []);

  const ui = isDark ? UI.dark : UI.light;

  // Internal selection driven by the carousel: fly to the tapped card's marker.
  // We merge external (parent) flyToken with an internal one so both paths work.
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [internalFlyToken, setInternalFlyToken] = useState(0);

  const effectiveSelectedId = internalSelectedId ?? selectedId;
  const effectiveFlyToken = flyToken + internalFlyToken;

  const handleCarouselSelect = useCallback((id: string) => {
    setInternalSelectedId(id);
    setInternalFlyToken((t) => t + 1);
    onMarkerClick?.(id);
  }, [onMarkerClick]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', background: ui.mapBg }}>
      <MapContainer
        center={SZCZECIN}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        style={{ height: '100%', width: '100%', background: ui.mapBg }}
        zoomControl={false}
        attributionControl
        keyboard
      >
        <TileLayer
          key={isDark ? 'dark' : 'light'}
          url={isDark ? TILES.dark : TILES.light}
          subdomains={TILE_SUBDOMAINS}
          attribution={TILE_ATTRIBUTION}
          errorTileUrl={TRANSPARENT_TILE}
          maxZoom={MAX_ZOOM}
        />

        <ZoomControl position="topright" />
        <LocateControl ui={ui} top={56} />
        <HomeControl ui={ui} top={100} />
        <FlyToSelected ads={geocodedAds} selectedId={effectiveSelectedId} flyToken={effectiveFlyToken} markerRefs={markerRefs} reducedMotion={prefersReducedMotion} />

        {/* "Search in this area" button — appears after panning */}
        {onSearchArea && <SearchAreaButton ui={ui} onSearchArea={onSearchArea} />}

        {/* Commute radius visualization (from job preferences) */}
        {homeLat != null && homeLng != null && maxDistanceKm != null && (
          <CommuteRadius homeLat={homeLat} homeLng={homeLng} radiusKm={maxDistanceKm} />
        )}

        <MarkerClusterGroup
          chunkedLoading
          chunkInterval={100}
          chunkDelay={10}
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          zoomToBoundsOnClick
          animate
          animateAddingMarkers={false}
          disableClusteringAtZoom={DISABLE_CLUSTER_ZOOM}
          iconCreateFunction={createClusterIcon}
          removeOutsideVisibleBounds
        >
          {geocodedAds.map((ad) => {
            // Dim markers outside the user's commute radius
            const isDimmed = (homeLat != null && homeLng != null && maxDistanceKm != null && ad.latitude != null && ad.longitude != null)
              ? haversineKm(homeLat, homeLng, ad.latitude, ad.longitude) > maxDistanceKm
              : false;
            return (
            <Marker
              key={ad.id}
              position={jitteredPosition(ad.latitude as number, ad.longitude as number, ad.id)}
              icon={getMarkerIcon(ad.category, isFavorite(ad.id), ad.id === effectiveSelectedId, isDimmed)}
              ref={(instance) => {
                if (instance) markerRefs.current.set(ad.id, instance);
                else markerRefs.current.delete(ad.id);
              }}
              eventHandlers={{ click: () => onMarkerClick?.(ad.id) }}
              title={ad.title}
            >
              <Popup maxWidth={320} minWidth={240} closeButton autoPan autoPanPadding={L.point(40, 40)}>
                <MarkerPopup
                  ad={ad}
                  isFavorite={isFavorite(ad.id)}
                  onToggleFavorite={() => onToggleFavorite(ad.id)}
                  onShowInList={() => onShowInList?.(ad.id)}
                  isDark={isDark}
                />
              </Popup>
            </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      <CategoryFilter active={activeCategories} onChange={onCategoryChange} ui={ui} />

      {/* Stats sit just above the carousel */}
      <MapStats total={totalCount ?? ads.length} visible={geocodedAds.length} ui={ui} />

      {/* Bottom carousel of visible offers — tap a card to fly to its marker */}
      <ResultsCarousel
        ads={geocodedAds}
        selectedId={effectiveSelectedId}
        ui={ui}
        isDark={isDark}
        isFavorite={isFavorite}
        onSelect={handleCarouselSelect}
      />

      {geocodedAds.length === 0 && (
        <EmptyOverlay ui={ui} hasAny={visibleAds.length > 0 || ads.length > 0} />
      )}

      <style>{`
        .leaflet-container {
          font-family: system-ui, -apple-system, sans-serif;
          background: ${ui.mapBg};
        }
        .leaflet-tile-pane {
          transition: opacity 0.3s ease;
          ${isDark ? `filter: ${DARK_TILE_FILTER};` : ''}
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.18) !important;
          padding: 0 !important;
          background: ${isDark ? '#1f2937' : '#ffffff'} !important;
        }
        .leaflet-popup-content { margin: 14px 16px !important; line-height: 1.4 !important; }
        .leaflet-popup-tip { box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; background: ${isDark ? '#1f2937' : '#ffffff'} !important; }
        .leaflet-popup-close-button { color: ${isDark ? '#9ca3af' : '#9ca3af'} !important; }
        .leaflet-control-zoom a {
          border-radius: 8px !important; width: 36px !important; height: 36px !important;
          line-height: 36px !important; font-size: 16px !important;
          background: ${ui.surface} !important; color: ${ui.text} !important;
          border-color: ${ui.border} !important;
        }
        .leaflet-control-zoom { border: none !important; box-shadow: ${ui.shadow} !important; border-radius: 8px !important; overflow: hidden; }
        .leaflet-touch .leaflet-control-zoom a { width: 40px !important; height: 40px !important; line-height: 40px !important; }
        .leaflet-control-attribution {
          font-size: 9px !important; background: ${ui.surfaceAlpha} !important; color: ${ui.textMuted} !important;
          backdrop-filter: blur(4px) !important; border-radius: 4px !important; padding: 1px 5px !important;
          margin-bottom: 106px !important;
        }
        .leaflet-control-attribution a { color: ${ui.textMuted} !important; }
        .construction-marker { background: transparent !important; border: none !important; }
        .leaflet-marker-icon:hover { z-index: 10000 !important; }
        .leaflet-marker-icon:focus-visible { outline: 3px solid #2563eb !important; outline-offset: 2px; border-radius: 50%; z-index: 10000 !important; }
        .marker-cluster:hover { transform: scale(1.05) !important; }
        @media (prefers-reduced-motion: reduce) {
          .leaflet-tile-pane { transition: none !important; }
          .leaflet-zoom-anim .leaflet-zoom-animated { transition: none !important; }
          .leaflet-fade-anim .leaflet-popup { transition: none !important; }
        }
      `}</style>
    </div>
  );
}
