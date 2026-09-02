import { describe, it, expect } from 'vitest';
import {
  calculateCommuteEstimate,
  buildSimulatedCommuteRouteGeoJSON,
} from '@/lib/geo/routeSimulator';

describe('3D Commute Route Simulator & Fuel Cost Engine', () => {
  // Prawobrzeże [14.6500, 53.3900] -> Centrum [14.5528, 53.4285]
  const prawobrzeze: [number, number] = [14.6500, 53.3900];
  const centrum: [number, number] = [14.5528, 53.4285];

  describe('calculateCommuteEstimate', () => {
    it('calculates road distance and rush hour vs off-peak times', () => {
      const estimate = calculateCommuteEstimate(prawobrzeze, centrum);
      expect(estimate.distanceKm).toBeGreaterThan(5);
      expect(estimate.carMinutesRushHour).toBeGreaterThan(estimate.carMinutesOffPeak);
      expect(estimate.transitMinutesZDiTM).toBeGreaterThan(0);
      expect(estimate.monthlyFuelCostPln).toBeGreaterThan(50);
      expect(estimate.recommendedRouteName).toMatch(/(Trasa Zamkowa|Most Pionierów)/);
    });

    it('handles short intra-district distances properly', () => {
      // Pogodno -> Centrum (~3.5km)
      const pogodno: [number, number] = [14.5183, 53.4335];
      const estimate = calculateCommuteEstimate(pogodno, centrum);
      expect(estimate.distanceKm).toBeLessThan(10);
      expect(estimate.carMinutesOffPeak).toBeLessThan(15);
      expect(estimate.monthlyFuelCostPln).toBeGreaterThan(0);
    });
  });

  describe('buildSimulatedCommuteRouteGeoJSON', () => {
    it('generates a valid GeoJSON LineString with bridge waypoints across Odra river', () => {
      const route = buildSimulatedCommuteRouteGeoJSON(prawobrzeze, centrum);
      expect(route.type).toBe('Feature');
      expect(route.geometry.type).toBe('LineString');
      expect(route.geometry.coordinates.length).toBeGreaterThanOrEqual(3);
      expect(route.properties.distanceKm).toBeGreaterThan(0);
      expect(route.properties.monthlyFuelCostPln).toBeGreaterThan(0);
    });
  });
});
