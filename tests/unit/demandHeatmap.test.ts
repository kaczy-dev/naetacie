import { describe, it, expect } from 'vitest';
import { buildDemandHeatmapGeoJSON } from '@/lib/geo/demandHeatmap';
import type { MaskedAnnouncement } from '@/lib/types/announcement';

describe('3D Demand & Hiring Density Heatmap', () => {
  const mockAds: MaskedAnnouncement[] = [
    {
      deduplication_key: 'h1',
      title: 'Pilna awaria hydrauliczna Szczecin Centrum',
      description: 'Zalanie, potrzebny hydraulik na cito',
      category: 'instalacje',
      location_text: 'Szczecin, Centrum',
      latitude: 53.428,
      longitude: 14.552,
      price: 10000,
      source_portal: 'olx',
      scraped_at: new Date(),
      published_at: new Date(),
    },
    {
      deduplication_key: 'h2',
      title: 'Malarz tapetowanie',
      description: 'Spokojna praca w mieszkaniu',
      category: 'wykończenia',
      location_text: 'Szczecin, Pogodno',
      latitude: 53.433,
      longitude: 14.518,
      price: 5000,
      source_portal: 'pracuj',
      scraped_at: new Date(),
      published_at: new Date(),
    },
  ];

  it('builds weighted heatmap features with higher weight for urgent and high paying jobs', () => {
    const geojson = buildDemandHeatmapGeoJSON(mockAds);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(2);

    const urgentJob = geojson.features.find((f) => f.properties.isUrgent);
    expect(urgentJob).toBeDefined();
    expect(urgentJob?.properties.weight).toBe(1.0); // 0.5 base + 0.3 urgent + 0.2 high pay = 1.0
  });

  it('filters by category when requested', () => {
    const geojson = buildDemandHeatmapGeoJSON(mockAds, 'instalacje');
    expect(geojson.features).toHaveLength(1);
    expect(geojson.features[0].properties.category).toBe('instalacje');
  });
});
