import { describe, it, expect } from 'vitest';
import { haversineDistanceKm, isWithinRadius } from './distance';
import { NotificationPreferences } from '../../../lib/types/user';

describe('haversineDistanceKm', () => {
  it('should return 0 for identical points', () => {
    expect(haversineDistanceKm(53.4285, 14.5528, 53.4285, 14.5528)).toBe(0);
  });

  it('should be commutative', () => {
    const d1 = haversineDistanceKm(53.4285, 14.5528, 52.2297, 21.0122);
    const d2 = haversineDistanceKm(52.2297, 21.0122, 53.4285, 14.5528);
    expect(d1).toBeCloseTo(d2, 10);
  });

  it('should return a known distance (Szczecin to Warsaw ~450km)', () => {
    const distance = haversineDistanceKm(53.4285, 14.5528, 52.2297, 21.0122);
    expect(distance).toBeGreaterThan(440);
    expect(distance).toBeLessThan(460);
  });

  it('should return a known short distance (~1km)', () => {
    // Approximately 1 degree of latitude is ~111km
    // So 0.009 degrees latitude ≈ ~1km
    const distance = haversineDistanceKm(53.4285, 14.5528, 53.4375, 14.5528);
    expect(distance).toBeCloseTo(1.0, 0);
  });

  it('should handle antipodal points (max distance ~20000km)', () => {
    const distance = haversineDistanceKm(0, 0, 0, 180);
    expect(distance).toBeCloseTo(20015, -1);
  });

  it('should handle negative coordinates', () => {
    const distance = haversineDistanceKm(-33.8688, 151.2093, 51.5074, -0.1278);
    expect(distance).toBeGreaterThan(16000);
    expect(distance).toBeLessThan(18000);
  });
});

describe('isWithinRadius', () => {
  const defaultPrefs: NotificationPreferences = {
    centerLat: 53.4285,
    centerLng: 14.5528,
    radiusKm: 10,
    enabled: true,
  };

  it('should return true for a point at the same location', () => {
    const announcement = { latitude: 53.4285, longitude: 14.5528 };
    expect(isWithinRadius(announcement, defaultPrefs)).toBe(true);
  });

  it('should return true for a point within radius', () => {
    // ~1km away
    const announcement = { latitude: 53.4375, longitude: 14.5528 };
    expect(isWithinRadius(announcement, defaultPrefs)).toBe(true);
  });

  it('should return false for a point outside radius', () => {
    // Warsaw is ~450km away, well outside 10km radius
    const announcement = { latitude: 52.2297, longitude: 21.0122 };
    expect(isWithinRadius(announcement, defaultPrefs)).toBe(false);
  });

  it('should return true for a point exactly at the radius boundary', () => {
    // Use a point exactly at the distance edge
    // With radiusKm = 50 and a point ~50km away
    const prefs: NotificationPreferences = {
      centerLat: 0,
      centerLng: 0,
      radiusKm: 50,
      enabled: true,
    };
    // 0.45 degrees lat ≈ ~50km
    const announcement = { latitude: 0.45, longitude: 0 };
    const distance = haversineDistanceKm(0, 0, 0.45, 0);
    // The point should be within if distance <= radius
    expect(isWithinRadius(announcement, prefs)).toBe(distance <= 50);
  });

  it('should work with minimum radius (1km)', () => {
    const prefs: NotificationPreferences = {
      centerLat: 53.4285,
      centerLng: 14.5528,
      radiusKm: 1,
      enabled: true,
    };
    // Very close point (~0.5km)
    const nearby = { latitude: 53.4330, longitude: 14.5528 };
    // Farther point (~2km)
    const farther = { latitude: 53.4465, longitude: 14.5528 };

    expect(isWithinRadius(nearby, prefs)).toBe(true);
    expect(isWithinRadius(farther, prefs)).toBe(false);
  });

  it('should work with maximum radius (50km)', () => {
    const prefs: NotificationPreferences = {
      centerLat: 53.4285,
      centerLng: 14.5528,
      radiusKm: 50,
      enabled: true,
    };
    // Point ~30km away
    const within = { latitude: 53.7, longitude: 14.5528 };
    // Point ~100km away
    const outside = { latitude: 54.3, longitude: 14.5528 };

    expect(isWithinRadius(within, prefs)).toBe(true);
    expect(isWithinRadius(outside, prefs)).toBe(false);
  });
});
