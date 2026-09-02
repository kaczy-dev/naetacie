import { describe, it, expect } from 'vitest';
import { computeAverageSalary } from '@/components/list/CollapsibleAnnouncementList';
import { formatPrice, isPointInPolygon, formatMarkerBadgePrice, getMarkerPriceTier } from '@/components/map/utils';

describe('Responsive UI/UX Engine & Polish Trade Optimization', () => {
  describe('CollapsibleAnnouncementList & Stats Summary', () => {
    it('computes average salary correctly across announcements', () => {
      const items = [
        { id: '1', price: 8000 },
        { id: '2', price: 12000 },
        { id: '3', price: 'Do uzgodnienia' },
        { id: '4', price: null },
      ];
      const avg = computeAverageSalary(items);
      expect(avg).toBe(10000);
    });

    it('returns null when no numeric prices are present', () => {
      const items = [
        { id: '1', price: 'Do uzgodnienia' },
        { id: '2', price: null },
      ];
      expect(computeAverageSalary(items)).toBeNull();
    });
  });

  describe('Polish Formatters & Visual Pricing Badges', () => {
    it('formats salary with clean PLN unit', () => {
      expect(formatPrice(7500)).toContain('PLN');
      expect(formatPrice(7500)).toContain('7');
      expect(formatPrice(null)).toBe('Cena niepodana');
    });

    it('creates intuitive compact badge prices for mobile and map', () => {
      expect(formatMarkerBadgePrice(15000)).toBe('15k');
      expect(formatMarkerBadgePrice(8500)).toBe('8.5k');
      expect(formatMarkerBadgePrice(500)).toBe('500 zł');
      expect(formatMarkerBadgePrice(null)).toBe('Oferta');
    });

    it('classifies pricing tiers into high/medium/normal for visual hierarchy', () => {
      expect(getMarkerPriceTier(11000)).toBe('high');
      expect(getMarkerPriceTier(7000)).toBe('medium');
      expect(getMarkerPriceTier(4500)).toBe('normal');
    });
  });
});
