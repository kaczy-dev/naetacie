import { describe, it, expect, vi } from 'vitest';
import { sweepDeadOffers } from './tombstone';
import { analyzeSelectorHealth } from './telemetry';

describe('Tombstone Cleaner & Telemetry Suite', () => {
  describe('sweepDeadOffers', () => {
    it('identifies expired 404 offers and separates them from active ones', async () => {
      const offers = [
        { id: 'ad_1', nativeId: '108H31', source_portal: 'olx' },
        { id: 'ad_2', nativeId: '918273', source_portal: 'olx' },
        { id: 'ad_3', nativeId: '776655', source_portal: 'oferteo' },
      ];

      const mockProbe = vi.fn().mockImplementation(async (nativeId: string) => {
        if (nativeId === '108H31') return true; // active
        if (nativeId === '918273') return false; // dead 404
        return true;
      });

      const result = await sweepDeadOffers(offers, mockProbe);

      expect(result.totalProbed).toBe(3);
      expect(result.expiredCount).toBe(1);
      expect(result.expiredIds).toEqual(['ad_2']);
      expect(result.activeIds).toContain('ad_1');
      expect(result.activeIds).toContain('ad_3');
    });
  });

  describe('analyzeSelectorHealth', () => {
    it('reports healthy metrics for well-structured scraper batches', () => {
      const batch = [
        { title: 'Dekarz', locationText: 'Szczecin', price: 40 },
        { title: 'Elektryk', locationText: 'Szczecin Prawobrzeże', price: 50 },
      ];

      const report = analyzeSelectorHealth('olx', batch);

      expect(report.isDriftDetected).toBe(false);
      expect(report.validCards).toBe(2);
      expect(report.emptyTitleRate).toBe(0);
    });

    it('triggers drift warning when empty title/location rate exceeds threshold', () => {
      const brokenBatch = [
        { title: '', locationText: '' },
        { title: '', locationText: '' },
        { title: 'Monter', locationText: 'Szczecin' },
      ];

      const report = analyzeSelectorHealth('olx', brokenBatch);

      expect(report.isDriftDetected).toBe(true);
      expect(report.alertMessage).toContain('CRITICAL: Selector drift detected');
    });
  });
});
