import { NotificationPreferences } from '../../../lib/types/user';

/**
 * Calculate the haversine distance between two geographic points in kilometers.
 *
 * Uses the Haversine formula which accounts for the Earth's curvature.
 * The Earth radius used is 6371 km (mean radius).
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const EARTH_RADIUS_KM = 6371;

  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Check if an announcement's location is within a user's notification radius.
 *
 * Returns true if the haversine distance between the announcement coordinates
 * and the user's center point is less than or equal to the configured radius.
 */
export function isWithinRadius(
  announcement: { latitude: number; longitude: number },
  prefs: NotificationPreferences
): boolean {
  const distance = haversineDistanceKm(
    announcement.latitude,
    announcement.longitude,
    prefs.centerLat,
    prefs.centerLng
  );
  return distance <= prefs.radiusKm;
}
