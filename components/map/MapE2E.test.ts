import { describe, it, expect, vi } from 'vitest';
import { filterGeocodedAnnouncements, formatPrice } from './utils';
import { DisplayAnnouncement } from '@/lib/types/display';

// Mock maplibre-gl to run inside Node environment safely
vi.mock('maplibre-gl', () => {
  class MockMap {
    options: any;
    events: Record<string, Array<(...args: any[]) => any>> = {};
    pitch = 0;
    bearing = 0;
    center = [14.5528, 53.4285];
    zoom = 10;
    style = 'light';
    sources: Record<string, any> = {};
    layers: any[] = [];

    constructor(options: any) {
      this.options = options;
    }

    addControl = vi.fn();
    remove = vi.fn();
    
    on = vi.fn().mockImplementation((event: string, callback: (...args: any[]) => any) => {
      if (!this.events[event]) this.events[event] = [];
      this.events[event].push(callback);
    });

    off = vi.fn();

    getCenter = () => ({ lng: this.center[0], lat: this.center[1] });
    getZoom = () => this.zoom;
    getPitch = () => this.pitch;
    
    flyTo = vi.fn().mockImplementation(({ center, zoom }: any) => {
      if (center) this.center = center;
      if (zoom) this.zoom = zoom;
      // Trigger move and zoom end events
      if (this.events['moveend']) this.events['moveend'].forEach(cb => cb());
      if (this.events['zoomend']) this.events['zoomend'].forEach(cb => cb());
    });

    easeTo = vi.fn().mockImplementation(({ pitch, bearing }: any) => {
      if (pitch !== undefined) this.pitch = pitch;
      if (bearing !== undefined) this.bearing = bearing;
    });

    addSource = vi.fn().mockImplementation((id: string, source: any) => {
      this.sources[id] = source;
    });
    getSource = (id: string) => this.sources[id];
    removeSource = vi.fn().mockImplementation((id: string) => {
      delete this.sources[id];
    });

    addLayer = vi.fn().mockImplementation((layer: any) => {
      this.layers.push(layer);
    });
    getLayer = (id: string) => this.layers.find(l => l.id === id);
    removeLayer = vi.fn().mockImplementation((id: string) => {
      this.layers = this.layers.filter(l => l.id !== id);
    });

    getStyle = () => ({
      layers: this.layers,
      sources: this.sources
    });

    setStyle = vi.fn().mockImplementation((style: string) => {
      this.style = style;
      if (this.events['style.load']) {
        this.events['style.load'].forEach(cb => cb());
      }
    });

    isStyleLoaded = () => true;
  }

  class MockNavigationControl {}
  class MockAttributionControl {}

  class MockMarker {
    lngLat: [number, number] = [0, 0];
    element: HTMLElement | null = null;
    popup: any = null;

    constructor(options?: { element?: HTMLElement }) {
      if (options?.element) this.element = options.element;
    }

    setLngLat = vi.fn().mockImplementation((lngLat: [number, number]) => {
      this.lngLat = lngLat;
      return this;
    });

    setPopup = vi.fn().mockImplementation((popup: any) => {
      this.popup = popup;
      return this;
    });

    addTo = vi.fn().mockReturnThis();
    remove = vi.fn();
  }

  class MockPopup {
    html = '';
    options: any;
    lngLat: [number, number] = [0, 0];

    constructor(options?: any) {
      this.options = options;
    }

    setLngLat = vi.fn().mockImplementation((lngLat: [number, number]) => {
      this.lngLat = lngLat;
      return this;
    });

    setDOMContent = vi.fn().mockReturnThis();
    setHTML = vi.fn().mockImplementation((html: string) => {
      this.html = html;
      return this;
    });

    addTo = vi.fn().mockReturnThis();
    remove = vi.fn();
    on = vi.fn();
  }

  return {
    default: {
      Map: MockMap,
      NavigationControl: MockNavigationControl,
      AttributionControl: MockAttributionControl,
      Marker: MockMarker,
      Popup: MockPopup,
    },
    Map: MockMap,
    NavigationControl: MockNavigationControl,
    AttributionControl: MockAttributionControl,
    Marker: MockMarker,
    Popup: MockPopup,
  };
});

describe('Map Interactivity E2E Flow Simulation', () => {
  const mockAds: DisplayAnnouncement[] = [
    {
      id: 'ad-1',
      deduplication_key: 'key-1',
      title: 'Praca dla Murarza',
      description: 'Zatrudnię murarza od zaraz na budowę w Szczecinie.',
      source_portal: 'olx',
      category: 'construction',
      location_text: 'Szczecin, Śródmieście',
      latitude: 53.43,
      longitude: 14.55,
      price: 6500,
      scraped_at: new Date(),
      published_at: null,
    },
    {
      id: 'ad-2',
      deduplication_key: 'key-2',
      title: 'Elektryk z uprawnieniami SEP',
      description: 'Praca przy instalacjach elektrycznych.',
      source_portal: 'oferteo',
      category: 'construction',
      location_text: 'Szczecin, Prawobrzeże',
      latitude: 53.40,
      longitude: 14.65,
      price: 7200,
      scraped_at: new Date(),
      published_at: null,
    }
  ];

  it('filters only geocoded announcements for display', () => {
    const mixedAds = [
      ...mockAds,
      {
        id: 'ad-3',
        deduplication_key: 'key-3',
        title: 'Praca zdalna bez lokalizacji',
        description: 'Brak koordynatów',
        source_portal: 'olx',
        category: 'construction',
        location_text: 'Cała Polska',
        latitude: null,
        longitude: null,
        price: 4000,
        scraped_at: new Date(),
        published_at: null,
      } as unknown as DisplayAnnouncement
    ];

    const displayable = filterGeocodedAnnouncements(mixedAds);
    expect(displayable).toHaveLength(2);
    expect(displayable.map(a => a.id)).not.toContain('ad-3');
  });

  it('correctly formats price values for Polish currency and empty state', () => {
    expect(formatPrice(6500)).toContain('6');
    expect(formatPrice(6500)).toContain('PLN');
    expect(formatPrice(null)).toBe('Cena niepodana');
  });
});
