import { describe, it, expect } from 'vitest';
import { getCategoryTheme, formatCompactPrice, PriceTagMarker } from '@/components/map/PriceTagMarker';
import { SZCZECIN_BRIDGES, EnterpriseMapHUD } from '@/components/map/EnterpriseMapHUD';
import { DesktopCommandCenter } from '@/components/layout/DesktopCommandCenter';

describe('Desktop Command Center & Enterprise Map Suite', () => {
  describe('PriceTagMarker Formatter & Themes', () => {
    it('formats monthly and hourly salaries into compact badges', () => {
      expect(formatCompactPrice(8500)).toBe('8.5k zł');
      expect(formatCompactPrice(12000)).toBe('12k zł');
      expect(formatCompactPrice(500)).toBe('500 zł');
      expect(formatCompactPrice('45 zł/h')).toBe('45/h');
      expect(formatCompactPrice('Wycena indywidualna')).toBe('Wycena');
      expect(formatCompactPrice(null)).toBe('Wycena');
    });

    it('assigns high-contrast neon theme based on trade category', () => {
      const electrician = getCategoryTheme('elektryk montaż');
      expect(electrician.icon).toBe('⚡');
      expect(electrician.border).toContain('amber');

      const plumber = getCategoryTheme('hydraulik wod-kan');
      expect(plumber.icon).toBe('🚿');
      expect(plumber.border).toContain('cyan');

      const painter = getCategoryTheme('wykończenia wnętrz');
      expect(painter.icon).toBe('🎨');
      expect(painter.border).toContain('purple');

      const bricklayer = getCategoryTheme('murarz zbrojarz');
      expect(bricklayer.icon).toBe('🧱');
      expect(bricklayer.border).toContain('orange');
    });
  });

  describe('EnterpriseMapHUD & Szczecin Bridges', () => {
    it('contains real-time traffic monitoring for all major Szczecin river crossings', () => {
      expect(SZCZECIN_BRIDGES).toHaveLength(3);
      const names = SZCZECIN_BRIDGES.map((b) => b.name);
      expect(names).toContain('Most Długi');
      expect(names).toContain('Most Pionierów');
      expect(names).toContain('Trasa Zamkowa');
    });

    it('exports EnterpriseMapHUD component function', () => {
      expect(typeof EnterpriseMapHUD).toBe('function');
      expect(typeof DesktopCommandCenter).toBe('function');
    });
  });
});
