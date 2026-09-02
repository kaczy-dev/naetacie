import { describe, it, expect } from 'vitest';
import {
  encodeGeohash,
  decodeGeohash,
  getGeohashNeighbors,
  calculateBoundingBoxGeohashes,
} from '@/lib/geo/geohash';

describe('Spatial Geohash Engine', () => {
  // Known Szczecin Coordinates: ~53.4285° N, 14.5528° E
  const szczecinLat = 53.4285;
  const szczecinLng = 14.5528;

  describe('encodeGeohash & decodeGeohash', () => {
    it('encodes Szczecin coordinates into a valid Geohash string', () => {
      const hash6 = encodeGeohash(szczecinLat, szczecinLng, 6);
      expect(hash6).toHaveLength(6);
      expect(hash6.startsWith('u36')).toBe(true);

      const hash7 = encodeGeohash(szczecinLat, szczecinLng, 7);
      expect(hash7).toHaveLength(7);
      expect(hash7.startsWith('u36')).toBe(true);
    });

    it('decodes geohash back to approximate coordinates within error margin', () => {
      const hash = encodeGeohash(szczecinLat, szczecinLng, 7);
      const decoded = decodeGeohash(hash);

      expect(Math.abs(decoded.latitude - szczecinLat)).toBeLessThan(decoded.latitudeError * 2);
      expect(Math.abs(decoded.longitude - szczecinLng)).toBeLessThan(decoded.longitudeError * 2);
    });

    it('throws error for invalid coordinates or malformed characters', () => {
      expect(() => encodeGeohash(95, 0)).toThrow();
      expect(() => encodeGeohash(0, 200)).toThrow();
      expect(() => decodeGeohash('u36!invalid')).toThrow();
    });
  });

  describe('getGeohashNeighbors', () => {
    it('calculates 9 spatial neighbor cells (center + 8 surrounding cells)', () => {
      const centerHash = encodeGeohash(szczecinLat, szczecinLng, 6);
      const neighbors = getGeohashNeighbors(centerHash);

      expect(neighbors.length).toBeGreaterThanOrEqual(8);
      expect(neighbors).toContain(centerHash);
    });
  });

  describe('calculateBoundingBoxGeohashes', () => {
    it('computes covering geohashes for Szczecin viewport bounding box', () => {
      const szczecinBbox = {
        southLat: 53.38,
        westLng: 14.45,
        northLat: 53.48,
        eastLng: 14.62,
      };

      const hashes = calculateBoundingBoxGeohashes(szczecinBbox, 5);
      expect(hashes.length).toBeGreaterThan(0);
      expect(hashes.every((h) => h.startsWith('u3'))).toBe(true);
    });
  });
});
