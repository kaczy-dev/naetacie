import { describe, it, expect } from 'vitest';
import { calculateCommuteEstimate } from '@/components/map/MapCommuteRoute';
import { getDistrictSalaryGeoJson, SZCZECIN_DISTRICT_ZONES } from '@/components/map/MapDistrictSalaryHeatmap';
import { getMockSzczecinWeather } from '@/components/map/MapWeatherWidget';

describe('Advanced MAP Module Enhancements', () => {
  it('calculates real-time commute estimate and ETA', () => {
    // Gumieńce to Prawobrzeże (~12 km)
    const estimate = calculateCommuteEstimate(53.3973, 14.5064, 53.409, 14.6133);

    expect(estimate.distanceKm).toBeGreaterThan(5);
    expect(estimate.carMinutes).toBeGreaterThan(10);
    expect(estimate.transitMinutes).toBeGreaterThan(15);
    expect(estimate.label).toContain('🚗');
    expect(estimate.label).toContain('🚌');
  });

  it('generates valid GeoJSON district salary zones', () => {
    const geojson = getDistrictSalaryGeoJson();
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(SZCZECIN_DISTRICT_ZONES.length);
    expect(geojson.features[0].properties?.avgMonthlyPln).toBeGreaterThan(5000);
  });

  it('returns valid Szczecin construction weather conditions', () => {
    const weather = getMockSzczecinWeather();
    expect(weather.tempC).toBeDefined();
    expect(weather.windKmH).toBeGreaterThan(0);
    expect(weather.suitabilityMessage).toContain('dekarskich');
  });
});
