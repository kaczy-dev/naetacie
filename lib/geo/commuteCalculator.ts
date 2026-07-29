/**
 * Commute Time & Distance Calculator for Szczecin Region.
 * Calculates estimated travel times for Car, Public Transit (ZTM), Bicycle, and Walking.
 */

export interface CommuteEstimate {
  carMinutes: number;
  transitMinutes: number;
  bikeMinutes: number;
  walkMinutes: number;
  distanceKm: number;
}

/**
 * Calculates Haversine distance in kilometers between two lat/lng points.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Estimates commute duration for all transport modes based on distance in Szczecin region.
 */
export function estimateCommuteTimes(
  fromLat: number,
  fromLng: number,
  toLat: number | null,
  toLng: number | null
): CommuteEstimate | null {
  if (toLat === null || toLng === null) return null;

  const dist = calculateDistanceKm(fromLat, fromLng, toLat, toLng);

  // Car: average 35 km/h in Szczecin city traffic
  const carMin = Math.max(5, Math.round((dist / 35) * 60 + 3));

  // ZTM Transit: average 22 km/h + 6 min wait/walk time
  const transitMin = Math.max(8, Math.round((dist / 22) * 60 + 6));

  // Bike: average 16 km/h
  const bikeMin = Math.max(4, Math.round((dist / 16) * 60));

  // Walk: average 4.8 km/h
  const walkMin = Math.round((dist / 4.8) * 60);

  return {
    carMinutes: carMin,
    transitMinutes: transitMin,
    bikeMinutes: bikeMin,
    walkMinutes: walkMin,
    distanceKm: dist,
  };
}
