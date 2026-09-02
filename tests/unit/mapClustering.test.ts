import { describe, it, expect } from 'vitest';
import { buildAnnouncementsGeoJSON } from '@/lib/geo/mapClustering';
import type { MaskedAnnouncement } from '@/lib/types/announcement';

describe('WebGL Map Clustering & GeoJSON Engine', () => {
  const mockAnnouncements: MaskedAnnouncement[] = [
    {
      deduplication_key: 'ad_1',
      title: 'Pilnie murarz Szczecin Gumieńce',
      description: 'Praca od zaraz na budowie',
      category: 'budowa',
      location_text: 'Szczecin, Gumieńce',
      latitude: 53.395,
      longitude: 14.505,
      price: 9500,
      source_portal: 'olx',
      scraped_at: new Date(),
      published_at: new Date(),
    },
    {
      deduplication_key: 'ad_2',
      title: 'Elektryk uprawnienia SEP',
      description: 'Montaż rozdzielnic',
      category: 'instalacje',
      location_text: 'Szczecin, Centrum',
      latitude: 53.428,
      longitude: 14.552,
      price: 6500,
      source_portal: 'pracuj',
      scraped_at: new Date(),
      published_at: new Date(),
    },
    {
      deduplication_key: 'ad_3_no_coords',
      title: 'Zdalny kosztorysant',
      description: 'Wycena projektów',
      category: 'biuro',
      location_text: 'Szczecin',
      latitude: null,
      longitude: null,
      price: null,
      source_portal: 'oferteo',
      scraped_at: new Date(),
      published_at: new Date(),
    },
  ];

  it('filters out announcements with missing or null coordinates', () => {
    const geojson = buildAnnouncementsGeoJSON(mockAnnouncements);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(2);
  });

  it('assigns emerald color badge for high-paying offers (>= 8500 PLN)', () => {
    const geojson = buildAnnouncementsGeoJSON(mockAnnouncements);
    const feature1 = geojson.features.find((f) => f.properties.deduplication_key === 'ad_1');
    expect(feature1).toBeDefined();
    expect(feature1?.properties.badge_color).toBe('#10b981'); // emerald
    expect(feature1?.properties.is_urgent).toBe(true);
    expect(feature1?.geometry.coordinates).toEqual([14.505, 53.395]);
  });

  it('assigns amber color badge for standard offers (6000-8499 PLN)', () => {
    const geojson = buildAnnouncementsGeoJSON(mockAnnouncements);
    const feature2 = geojson.features.find((f) => f.properties.deduplication_key === 'ad_2');
    expect(feature2).toBeDefined();
    expect(feature2?.properties.badge_color).toBe('#f59e0b'); // amber
    expect(feature2?.properties.is_urgent).toBe(false);
  });
});
