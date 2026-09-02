'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface GeocodingResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

export interface MapGeocoderSearchProps {
  onSelectLocation: (lat: number, lng: number, displayName: string) => void;
  ui: {
    surface: string;
    surfaceAlpha: string;
    border: string;
    text: string;
    textMuted: string;
    shadow: string;
  };
  isDark: boolean;
}

export function MapGeocoderSearch({
  onSelectLocation,
  ui,
  isDark,
}: MapGeocoderSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search via Nominatim OSM API
  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&countrycodes=pl&limit=5`
        );
        if (res.ok) {
          const data: GeocodingResult[] = await res.json();
          setResults(data);
          setIsOpen(data.length > 0);
        }
      } catch {
        // Ignore network errors
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (item: GeocodingResult) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (!isNaN(lat) && !isNaN(lng)) {
        onSelectLocation(lat, lng, item.display_name);
        setIsOpen(false);
        setQuery(item.display_name.split(',')[0]);
      }
    },
    [onSelectLocation]
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: '64px',
        left: '12px',
        zIndex: 25,
        maxWidth: '280px',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: ui.surfaceAlpha,
          backdropFilter: 'blur(12px)',
          border: `1.5px solid ${ui.border}`,
          borderRadius: '20px',
          boxShadow: ui.shadow,
          padding: '1px 8px',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: '11px', marginRight: '5px', opacity: 0.7 }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Szukaj adresu / miasta..."
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '11px',
            fontWeight: 500,
            color: ui.text,
            padding: '4px 0',
          }}
        />
        {loading && (
          <span
            style={{
              fontSize: '11px',
              color: ui.textMuted,
              animation: 'map-loader-spin 0.8s linear infinite',
            }}
          >
            ⏳
          </span>
        )}
        {query && !loading && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: ui.textMuted,
              cursor: 'pointer',
              fontSize: '14px',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: ui.surface,
            backdropFilter: 'blur(16px)',
            border: `1px solid ${ui.border}`,
            borderRadius: '14px',
            boxShadow: ui.shadow,
            overflow: 'hidden',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
          className="no-scrollbar"
        >
          {results.map((item) => (
            <button
              key={item.place_id}
              onClick={() => handleSelect(item)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${isDark ? 'rgba(55,65,81,0.5)' : 'rgba(229,231,235,0.8)'}`,
                color: ui.text,
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = isDark
                  ? '#374151'
                  : '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '13px', flexShrink: 0 }}>📍</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                }}
              >
                {item.display_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
