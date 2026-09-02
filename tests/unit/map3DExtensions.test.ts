import { describe, it, expect } from 'vitest';
import { SZCZECIN_MEGA_PROJECTS } from '@/lib/geo/szczecinMegaProjects';
import { generateSzczecinIsochrone, SZCZECIN_COMMUTE_BASES } from '@/lib/geo/isochroneCalculator';
import { generateSalaryHexbinsGeoJSON, SZCZECIN_DISTRICT_SALARY_PILLARS } from '@/lib/geo/salaryHexbins';

describe('Szczecin 3D Map Extensions Suite', () => {
  describe('Mega Construction Projects & Cranes Registry', () => {
    it('contains verified major projects in Szczecin with active tower cranes', () => {
      expect(SZCZECIN_MEGA_PROJECTS.length).toBeGreaterThanOrEqual(5);

      const lasztownia = SZCZECIN_MEGA_PROJECTS.find((p) => p.id === 'proj_lasztownia');
      expect(lasztownia).toBeDefined();
      expect(lasztownia?.towerCranesCount).toBeGreaterThanOrEqual(4);
      expect(lasztownia?.demandedTrades).toContain('Zbrojarz');
      expect(lasztownia?.coordinates[0]).toBeCloseTo(14.56, 1);
    });
  });

  describe('3D Commute Isochrone Polygon Generator', () => {
    it('generates valid GeoJSON Polygon for 20 minute car commute from Centrum', () => {
      const isochrone = generateSzczecinIsochrone(
        SZCZECIN_COMMUTE_BASES.centrum.coords[0],
        SZCZECIN_COMMUTE_BASES.centrum.coords[1],
        20,
        'car'
      );

      expect(isochrone.type).toBe('Feature');
      expect(isochrone.geometry.type).toBe('Polygon');
      expect(isochrone.geometry.coordinates[0].length).toBeGreaterThan(30);
      expect(isochrone.properties.minutes).toBe(20);
      expect(isochrone.properties.fillColor).toBe('#3b82f6');
    });

    it('handles different time ranges (10, 30, 45 mins)', () => {
      const iso10 = generateSzczecinIsochrone(14.55, 53.42, 10, 'car');
      const iso45 = generateSzczecinIsochrone(14.55, 53.42, 45, 'car');

      expect(iso10.properties.fillColor).toBe('#10b981');
      expect(iso45.properties.fillColor).toBe('#ef4444');
    });
  });

  describe('3D Salary Hexbin Columns', () => {
    it('generates 3D extrusion features with realistic Szczecin salary heights', () => {
      const hexbins = generateSalaryHexbinsGeoJSON();

      expect(hexbins.type).toBe('FeatureCollection');
      expect(hexbins.features.length).toBe(SZCZECIN_DISTRICT_SALARY_PILLARS.length);

      const warszewo = hexbins.features.find((f) => f.properties.district.includes('Warszewo'));
      expect(warszewo).toBeDefined();
      expect(warszewo?.properties.avgMonthlyPLN).toBeGreaterThanOrEqual(9000);
      expect(warszewo?.properties.extrusionHeight).toBeGreaterThan(400);
      expect(warszewo?.geometry.coordinates[0].length).toBe(7); // 6 sides + closed ring
    });
  });
});
