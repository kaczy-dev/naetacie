import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { haversineDistanceKm, isWithinRadius } from './distance';
import { NotificationPreferences } from '../../../lib/types/user';

/**
 * Feature: construction-ads-aggregator, Property 7: Haversine distance and radius check
 * Validates: Requirements 6.1
 */
describe('Property 7: Haversine distance and radius check', () => {
  // Generators for valid geographic coordinates
  const latArb = fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true });
  const lngArb = fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true });
  const radiusArb = fc.double({ min: 1, max: 50, noNaN: true, noDefaultInfinity: true });

  it('isWithinRadius returns true iff haversineDistanceKm <= radiusKm', () => {
    fc.assert(
      fc.property(
        latArb,
        lngArb,
        latArb,
        lngArb,
        radiusArb,
        (annLat, annLng, centerLat, centerLng, radiusKm) => {
          const prefs: NotificationPreferences = {
            centerLat,
            centerLng,
            radiusKm,
            enabled: true,
          };

          const announcement = { latitude: annLat, longitude: annLng };
          const distance = haversineDistanceKm(annLat, annLng, centerLat, centerLng);
          const result = isWithinRadius(announcement, prefs);

          expect(result).toBe(distance <= radiusKm);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('haversineDistanceKm is commutative', () => {
    fc.assert(
      fc.property(
        latArb,
        lngArb,
        latArb,
        lngArb,
        (lat1, lng1, lat2, lng2) => {
          const d1 = haversineDistanceKm(lat1, lng1, lat2, lng2);
          const d2 = haversineDistanceKm(lat2, lng2, lat1, lng1);

          expect(d1).toBeCloseTo(d2, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('haversineDistanceKm returns 0 for same point', () => {
    fc.assert(
      fc.property(
        latArb,
        lngArb,
        (lat, lng) => {
          const distance = haversineDistanceKm(lat, lng, lat, lng);

          expect(distance).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
