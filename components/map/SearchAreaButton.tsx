'use client';

import { useState, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

/**
 * "Szukaj w tym obszarze" button that appears after the user pans/zooms.
 * Reports the current map bounds to the parent for filtering.
 */
export function SearchAreaButton({
  ui,
  onSearchArea,
}: {
  ui: { surface: string; border: string; text: string; shadow: string };
  onSearchArea: (bounds: { south: number; west: number; north: number; east: number }) => void;
}) {
  const map = useMap();
  const [moved, setMoved] = useState(false);

  useMapEvents({
    moveend: () => setMoved(true),
    zoomend: () => setMoved(true),
  });

  const handleClick = useCallback(() => {
    const b = map.getBounds();
    onSearchArea({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    });
    setMoved(false);
  }, [map, onSearchArea]);

  if (!moved) return null;

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'absolute',
        top: '52px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        padding: '8px 16px',
        background: ui.surface,
        border: `1.5px solid ${ui.border}`,
        borderRadius: '20px',
        boxShadow: ui.shadow,
        fontSize: '12px',
        fontWeight: 600,
        color: ui.text,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap',
        transition: 'transform 0.15s',
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%) scale(0.95)'; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%)'; }}
    >
      🔍 Szukaj w tym obszarze
    </button>
  );
}
