/**
 * WebGL Hardware-Accelerated Geospatial Clustering for MapLibre 3D.
 * Transforms announcement entities into structured GeoJSON FeatureCollections for 120 FPS rendering.
 */

import { MaskedAnnouncement } from '@/lib/types/announcement';
import { formatPrice } from '@/components/map/utils';

export interface GeoJsonAnnouncementProperties {
  id: string;
  deduplication_key: string;
  title: string;
  price: number | null;
  formattedPrice: string;
  category: string;
  source_portal: string;
  location_text: string;
  contact_info?: string | null;
  is_urgent: boolean;
  badge_color: string;
}

export interface AnnouncementFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    };
    properties: GeoJsonAnnouncementProperties;
  }>;
}

/**
 * Transforms an array of announcements into an optimized GeoJSON FeatureCollection.
 */
export function buildAnnouncementsGeoJSON(
  announcements: MaskedAnnouncement[]
): AnnouncementFeatureCollection {
  const features: AnnouncementFeatureCollection['features'] = [];

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

    const priceNum = typeof ad.price === 'number' ? ad.price : null;
    let badgeColor = '#64748b'; // slate

    if (priceNum) {
      if (priceNum >= 8500) badgeColor = '#10b981'; // emerald high rate
      else if (priceNum >= 6000) badgeColor = '#f59e0b'; // amber/gold
      else badgeColor = '#3b82f6'; // blue
    } else {
      badgeColor = '#8b5cf6'; // purple AI estimation
    }

    const isUrgent =
      (ad.title && /piln|zaraz|cito|natychmiast|awari/i.test(ad.title)) ||
      (ad.description && /piln|zaraz|cito|natychmiast/i.test(ad.description)) ||
      false;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ad.longitude, ad.latitude],
      },
      properties: {
        id: ad.id || ad.deduplication_key,
        deduplication_key: ad.deduplication_key,
        title: ad.title,
        price: priceNum,
        formattedPrice: formatPrice(ad.price),
        category: ad.category || 'budowa',
        source_portal: ad.source_portal || 'olx',
        location_text: ad.location_text,
        contact_info: ad.contact_info,
        is_urgent: Boolean(isUrgent),
        badge_color: badgeColor,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * MapLibre Layer specifications for WebGL Clusters and Unclustered Points
 */
export const CLUSTER_LAYER_CONFIG = {
  sourceId: 'announcements-webgl-source',
  clustersLayerId: 'clusters-bubble-layer',
  clusterCountLayerId: 'clusters-count-text-layer',
  unclusteredPointLayerId: 'unclustered-pins-layer',
  unclusteredGlowLayerId: 'unclustered-pins-glow-layer',
  unclusteredLabelLayerId: 'unclustered-pins-label-layer',
};
