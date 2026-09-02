/**
 * High-Performance Base32 Geohashing & Spatial Query Engine.
 * Provides sub-millisecond geohash encoding, decoding, neighbor expansion,
 * and viewport bounding box cell coverage for NoSQL and Firestore spatial queries.
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BITS = [16, 8, 4, 2, 1];

export interface GeohashDecoded {
  latitude: number;
  longitude: number;
  latitudeError: number;
  longitudeError: number;
}

export interface BoundingBox {
  southLat: number;
  westLng: number;
  northLat: number;
  eastLng: number;
}

/**
 * Encodes latitude and longitude coordinates into a standard Base32 Geohash string.
 *
 * Precision guide:
 * - 4 chars: ~39km x 19.5km (Region)
 * - 5 chars: ~4.9km x 4.9km (City district / Szczecin area)
 * - 6 chars: ~1.2km x 0.6km (Neighborhood / Street level)
 * - 7 chars: ~152m x 152m (Building / Construction site precision)
 */
export function encodeGeohash(latitude: number, longitude: number, precision = 6): string {
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Coordinates out of range for geohashing');
  }

  let latMin = -90.0;
  let latMax = 90.0;
  let lonMin = -180.0;
  let lonMax = 180.0;

  let isEven = true;
  let bit = 0;
  let ch = 0;
  let geohash = '';

  while (geohash.length < precision) {
    if (isEven) {
      const lonMid = (lonMin + lonMax) / 2;
      if (longitude >= lonMid) {
        ch |= BITS[bit];
        lonMin = lonMid;
      } else {
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (latitude >= latMid) {
        ch |= BITS[bit];
        latMin = latMid;
      } else {
        latMax = latMid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}

/**
 * Decodes a geohash string into latitude and longitude center coordinates and error margins.
 */
export function decodeGeohash(geohash: string): GeohashDecoded {
  let isEven = true;
  let latMin = -90.0;
  let latMax = 90.0;
  let lonMin = -180.0;
  let lonMax = 180.0;

  const lower = geohash.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i];
    const cd = BASE32.indexOf(c);
    if (cd === -1) {
      throw new Error(`Invalid character "${c}" in geohash`);
    }

    for (let j = 0; j < 5; j++) {
      const mask = BITS[j];
      if (isEven) {
        const lonMid = (lonMin + lonMax) / 2;
        if ((cd & mask) !== 0) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        const latMid = (latMin + latMax) / 2;
        if ((cd & mask) !== 0) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }
      isEven = !isEven;
    }
  }

  const latitude = (latMin + latMax) / 2;
  const longitude = (lonMin + lonMax) / 2;

  return {
    latitude,
    longitude,
    latitudeError: (latMax - latMin) / 2,
    longitudeError: (lonMax - lonMin) / 2,
  };
}

/**
 * Calculates the 8 adjacent neighboring geohashes + center cell for radial spatial queries.
 */
export function getGeohashNeighbors(geohash: string): string[] {
  const decoded = decodeGeohash(geohash);
  const latSpan = decoded.latitudeError * 2;
  const lonSpan = decoded.longitudeError * 2;
  const precision = geohash.length;

  const latCenter = decoded.latitude;
  const lonCenter = decoded.longitude;

  const deltas = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],  [0, 0],  [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  const neighbors = new Set<string>();

  for (const [dLat, dLon] of deltas) {
    const lat = Math.max(-90, Math.min(90, latCenter + dLat * latSpan));
    let lon = lonCenter + dLon * lonSpan;
    if (lon < -180) lon += 360;
    if (lon > 180) lon -= 360;

    neighbors.add(encodeGeohash(lat, lon, precision));
  }

  return Array.from(neighbors);
}

/**
 * Generates the optimal set of geohash prefixes that cover a geographic viewport bounding box.
 */
export function calculateBoundingBoxGeohashes(bbox: BoundingBox, precision = 5): string[] {
  const { southLat, westLng, northLat, eastLng } = bbox;

  const geohashes = new Set<string>();

  // Determine step based on precision
  const latStep = precision <= 4 ? 0.2 : precision === 5 ? 0.04 : 0.01;
  const lngStep = precision <= 4 ? 0.3 : precision === 5 ? 0.05 : 0.015;

  for (let lat = southLat; lat <= northLat + latStep / 2; lat += latStep) {
    for (let lng = westLng; lng <= eastLng + lngStep / 2; lng += lngStep) {
      const clampedLat = Math.max(-90, Math.min(90, lat));
      const clampedLng = Math.max(-180, Math.min(180, lng));
      geohashes.add(encodeGeohash(clampedLat, clampedLng, precision));
    }
  }

  return Array.from(geohashes);
}
