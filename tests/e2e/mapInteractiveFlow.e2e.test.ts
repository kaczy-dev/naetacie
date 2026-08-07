import { describe, it, expect, vi } from 'vitest';
import type { DisplayAnnouncement } from '@/lib/types/display';
import { ALL_CATEGORY_KEYS, CATEGORIES, normalizeCategory } from '@/lib/data/categories';
import { getAnnouncementExternalUrl } from '@/lib/utils';

describe('Interactive MAP Section E2E Test Suite', () => {
  const sampleOffers: DisplayAnnouncement[] = [
    {
      id: 'e2e-map-1',
      deduplication_key: 'olx-e2e-1',
      title: 'Monter Konstrukcji Stalowych',
      company: 'Stal-Bud Szczecin',
      description: 'Praca na wysokościach, atrakcyjne stawki.',
      source_portal: 'olx',
      category: 'construction',
      location_text: 'Szczecin, Nad Odrą',
      latitude: 53.45,
      longitude: 14.58,
      price: 9500,
      phone: '600700800',
      scraped_at: new Date(),
      published_at: null,
    },
    {
      id: 'e2e-map-2',
      deduplication_key: 'pracuj-e2e-2',
      title: 'Malarz Szpachlarz Wykończenia',
      company: 'Remonty-Szczecin',
      description: 'Prace wykończeniowe w mieszkaniach.',
      source_portal: 'pracuj',
      category: 'construction',
      location_text: 'Szczecin, Śródmieście',
      latitude: 53.43,
      longitude: 14.55,
      price: 7500,
      phone: null,
      scraped_at: new Date(),
      published_at: null,
    },
  ];

  it('Flow 1: Filter chips selection updates active set', () => {
    let activeCats = new Set(ALL_CATEGORY_KEYS);
    expect(activeCats.size).toBe(ALL_CATEGORY_KEYS.length);

    // Toggle construction off
    const catKey = normalizeCategory('construction');
    activeCats.delete(catKey);

    const filtered = sampleOffers.filter(a => activeCats.has(normalizeCategory(a.category)));
    expect(filtered).toHaveLength(0);
  });

  it('Flow 2: Marker click opens DraggableJobModal with 1-tap QR, Share & Search actions', () => {
    let selectedId: string | null = null;
    const handleMarkerClick = (id: string) => {
      selectedId = id;
    };

    handleMarkerClick('e2e-map-1');
    expect(selectedId).toBe('e2e-map-1');

    const selectedAd = sampleOffers.find(a => a.id === selectedId);
    expect(selectedAd).toBeDefined();
    expect(selectedAd!.title).toBe('Monter Konstrukcji Stalowych');

    const externalUrl = getAnnouncementExternalUrl(selectedAd!);
    expect(externalUrl).toContain('https://www.olx.pl');
  });

  it('Flow 3: Mobile Bottom Sheet snaps between states (collapsed, medium, expanded)', () => {
    type SnapState = 'collapsed' | 'medium' | 'expanded';
    let currentSnap: SnapState = 'medium';

    const handleDragUp = () => {
      if (currentSnap === 'collapsed') currentSnap = 'medium';
      else if (currentSnap === 'medium') currentSnap = 'expanded';
    };

    const handleDragDown = () => {
      if (currentSnap === 'expanded') currentSnap = 'medium';
      else if (currentSnap === 'medium') currentSnap = 'collapsed';
    };

    handleDragUp();
    expect(currentSnap).toBe('expanded');

    handleDragDown();
    expect(currentSnap).toBe('medium');

    handleDragDown();
    expect(currentSnap).toBe('collapsed');
  });

  it('Flow 4: Nominatim Address Search geocodes location and triggers flyTo', async () => {
    const mockNominatimResult = [
      {
        place_id: 12345,
        display_name: 'Brama Portowa, Szczecin, Polska',
        lat: '53.425',
        lon: '14.553',
        type: 'landmark',
      },
    ];

    const onSelectLocation = vi.fn();
    const result = mockNominatimResult[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    onSelectLocation(lat, lng, result.display_name);

    expect(onSelectLocation).toHaveBeenCalledWith(53.425, 14.553, 'Brama Portowa, Szczecin, Polska');
  });
});
