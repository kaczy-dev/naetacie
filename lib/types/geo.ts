/**
 * Cached geocoding result stored in the Firestore `geo_cache` collection.
 * Entries with null coordinates represent negative cache hits.
 * TTL: 30 days from resolved_at.
 */
export interface GeoCacheEntry {
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  resolved_at: Date;
}

/**
 * Result of a geocoding resolution attempt.
 */
export interface GeocodingResult {
  latitude: number | null;
  longitude: number | null;
  fromCache: boolean;
}

/**
 * Geographic bounding box defined by southwest and northeast corners.
 * Used for spatial filtering of announcements.
 */
export interface BoundingBox {
  south_lat: number;
  west_lng: number;
  north_lat: number;
  east_lng: number;
}
