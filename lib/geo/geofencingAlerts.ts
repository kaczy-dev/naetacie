/**
 * Geofencing PWA Alert Engine for NaEtacie
 * Calculates distance from user's current GPS location to active job offers in Szczecin
 * Triggers native notification or toast when user comes within proximity (e.g. 1 km).
 */

export interface GeofenceMatch {
  announcementId: string;
  title: string;
  distanceKm: number;
  price?: number | null;
  location: string;
}

/**
 * Calculates Haversine distance between two GPS coordinates in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks for high-salary job offers within specified radius of user's position.
 */
export function checkNearbyJobProximity(
  userLat: number,
  userLng: number,
  offers: Array<{ id: string; title: string; latitude?: number | null; longitude?: number | null; price?: number | null; location_text?: string }>,
  radiusKm = 1.0
): GeofenceMatch[] {
  const matches: GeofenceMatch[] = [];

  for (const offer of offers) {
    if (offer.latitude != null && offer.longitude != null) {
      const dist = calculateHaversineDistanceKm(userLat, userLng, offer.latitude, offer.longitude);
      if (dist <= radiusKm) {
        matches.push({
          announcementId: offer.id,
          title: offer.title,
          distanceKm: Math.round(dist * 100) / 100,
          price: offer.price,
          location: offer.location_text || 'Szczecin',
        });
      }
    }
  }

  return matches.sort((a, b) => a.distanceKm - b.distanceKm);
}
