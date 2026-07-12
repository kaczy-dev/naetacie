'use client';

import dynamic from 'next/dynamic';
import type { MapViewProps } from './MapView';

/**
 * Dynamically imported MapView with SSR disabled.
 * React-Leaflet requires the DOM (window, document) which is not available
 * during server-side rendering in Next.js.
 */
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        backgroundColor: 'var(--color-background, #f0f0f0)',
        color: 'var(--color-foreground, #6b7280)',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '3px solid currentColor',
          borderTopColor: 'transparent',
          opacity: 0.6,
          animation: 'map-spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: '13px', opacity: 0.7 }}>Wczytywanie mapy...</span>
      <style>{`
        @keyframes map-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  ),
});

export default MapView;
export type { MapViewProps };
