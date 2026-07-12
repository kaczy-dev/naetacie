'use client';

import dynamic from 'next/dynamic';
import type { MapComponentProps } from './MapComponent';

/**
 * Dynamically imported MapComponent with SSR disabled.
 * React-Leaflet requires the DOM (window, document) which is not available
 * during server-side rendering in Next.js.
 */
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
      }}
    >
      Loading map...
    </div>
  ),
});

export default MapComponent;
export type { MapComponentProps };
