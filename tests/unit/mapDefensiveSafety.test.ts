import { describe, it, expect } from 'vitest';
import {
  filterGeocodedAnnouncements,
  formatPrice,
  isPointInPolygon,
  formatMarkerBadgePrice,
  getMarkerPriceTier,
} from '@/components/map/utils';
import type { MaskedAnnouncement } from '@/lib/types/announcement';

describe('Map Defensive & Error Resilience Engine', () => {
  describe('filterGeocodedAnnouncements', () => {
    it('handles null, undefined, empty, and corrupt inputs safely', () => {
      // @ts-expect-error test invalid inputs
      expect(filterGeocodedAnnouncements(null)).toEqual([]);
      // @ts-expect-error test invalid inputs
      expect(filterGeocodedAnnouncements(undefined)).toEqual([]);
      expect(filterGeocodedAnnouncements([])).toEqual([]);

      const corruptList = [
        { id: '1', latitude: NaN, longitude: 14.5 } as unknown as MaskedAnnouncement,
        { id: '2', latitude: 53.4, longitude: undefined } as unknown as MaskedAnnouncement,
        { id: '3', latitude: 53.42, longitude: 14.55 } as unknown as MaskedAnnouncement,
      ];

      const valid = filterGeocodedAnnouncements(corruptList);
      expect(valid).toHaveLength(1);
      expect(valid[0].id).toBe('3');
    });
  });

  describe('formatPrice', () => {
    it('formats null, undefined, and NaN prices without crashing', () => {
      expect(formatPrice(null)).toBe('Cena niepodana');
      // @ts-expect-error test invalid inputs
      expect(formatPrice(undefined)).toBe('Cena niepodana');
      expect(formatPrice(NaN)).toBe('Cena niepodana');
      expect(formatPrice(8500)).toContain('8');
    });
  });

  describe('isPointInPolygon', () => {
    const polygon: Array<[number, number]> = [
      [14.50, 53.40],
      [14.60, 53.40],
      [14.60, 53.50],
      [14.50, 53.50],
    ];

    it('detects points inside polygon', () => {
      // [lat, lng] inside
      expect(isPointInPolygon([53.45, 14.55], polygon)).toBe(true);
      // [lat, lng] outside
      expect(isPointInPolygon([53.60, 14.55], polygon)).toBe(false);
    });

    it('returns false for corrupt polygon or corrupt point safely', () => {
      expect(isPointInPolygon(null, polygon)).toBe(false);
      expect(isPointInPolygon([53.45, 14.55], null)).toBe(false);
      expect(isPointInPolygon([53.45, 14.55], [])).toBe(false);
      expect(isPointInPolygon([NaN, 14.55], polygon)).toBe(false);
    });
  });

  describe('formatMarkerBadgePrice & getMarkerPriceTier', () => {
    it('formats badge prices correctly', () => {
      expect(formatMarkerBadgePrice(null)).toBe('Oferta');
      expect(formatMarkerBadgePrice('12000')).toBe('12k');
      expect(formatMarkerBadgePrice(8500)).toBe('8.5k');
    });

    it('resolves price tiers accurately', () => {
      expect(getMarkerPriceTier(12000)).toBe('high');
      expect(getMarkerPriceTier(7500)).toBe('medium');
      expect(getMarkerPriceTier(4000)).toBe('normal');
      expect(getMarkerPriceTier(null)).toBe('normal');
    });
  });
});
