/**
 * 3D Job Demand & Urgent Contractor Heatmap GeoJSON Engine for Szczecin.
 * Visualizes high-intensity hiring density across districts (Centrum, Pogodno, Warszewo, Gumieńce, Prawobrzeże).
 */

import { MaskedAnnouncement } from '@/lib/types/announcement';

export interface DemandHeatmapGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    };
    properties: {
      weight: number; // 0.1 to 1.0
      category: string;
      isUrgent: boolean;
      price: number | null;
    };
  }>;
}

/**
 * Builds weighted GeoJSON points for MapLibre Heatmap layer.
 */
export function buildDemandHeatmapGeoJSON(
  announcements: MaskedAnnouncement[],
  filterCategory?: string | null
): DemandHeatmapGeoJSON {
  const features: DemandHeatmapGeoJSON['features'] = [];

  for (const ad of announcements) {
    if (
      ad.latitude === null ||
      ad.latitude === undefined ||
      ad.longitude === null ||
      ad.longitude === undefined ||
      isNaN(ad.latitude) ||
      isNaN(ad.longitude)
    ) {
      continue;
    }

    if (filterCategory && ad.category && !ad.category.toLowerCase().includes(filterCategory.toLowerCase())) {
      continue;
    }

    const isUrgent =
      (ad.title && /piln|zaraz|cito|natychmiast|awari/i.test(ad.title)) ||
      (ad.description && /piln|zaraz|cito|natychmiast/i.test(ad.description)) ||
      false;

    // Base weight 0.5; urgent +0.3; high salary +0.2
    let weight = 0.5;
    if (isUrgent) weight += 0.3;
    if (typeof ad.price === 'number' && ad.price >= 8000) weight += 0.2;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ad.longitude, ad.latitude],
      },
      properties: {
        weight: Math.min(1.0, weight),
        category: ad.category || 'budowa',
        isUrgent: Boolean(isUrgent),
        price: typeof ad.price === 'number' ? ad.price : null,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export const DEMAND_HEATMAP_LAYER_CONFIG = {
  sourceId: 'demand-heatmap-source',
  heatmapLayerId: 'demand-heatmap-layer',
  densityCircleLayerId: 'demand-density-circle-layer',
};
