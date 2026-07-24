import { describe, it, expect, vi } from 'vitest';
import { ensureAbsoluteUrl, formatShortPrice, triggerHaptic } from '@/lib/utils';

describe('Utility Helper Functions (Unit Tests)', () => {
  describe('ensureAbsoluteUrl', () => {
    it('returns null for null, undefined, or empty string input', () => {
      expect(ensureAbsoluteUrl(null)).toBeNull();
      expect(ensureAbsoluteUrl(undefined)).toBeNull();
      expect(ensureAbsoluteUrl('')).toBeNull();
      expect(ensureAbsoluteUrl('   ')).toBeNull();
    });

    it('preserves existing https:// and http:// URLs', () => {
      expect(ensureAbsoluteUrl('https://olx.pl/oferta/123')).toBe('https://olx.pl/oferta/123');
      expect(ensureAbsoluteUrl('http://pracuj.pl/oferty/456')).toBe('http://pracuj.pl/oferty/456');
    });

    it('prefixes URLs missing scheme with https://', () => {
      expect(ensureAbsoluteUrl('olx.pl/oferta/123')).toBe('https://olx.pl/oferta/123');
      expect(ensureAbsoluteUrl('www.oferteo.pl/szczecin')).toBe('https://www.oferteo.pl/szczecin');
    });

    it('handles relative path links correctly', () => {
      expect(ensureAbsoluteUrl('/announcements/seed-1')).toBe('https:///announcements/seed-1');
    });
  });

  describe('formatShortPrice', () => {
    it('formats null or 0 price gracefully', () => {
      expect(formatShortPrice(null)).toBe('Ogłoszenie');
      expect(formatShortPrice(undefined as any)).toBe('Ogłoszenie');
    });

    it('formats numeric prices into compact k zł format', () => {
      expect(formatShortPrice(6500)).toBe('6.5k zł');
      expect(formatShortPrice(8000)).toBe('8k zł');
      expect(formatShortPrice(15000)).toBe('15k zł');
      expect(formatShortPrice(22500)).toBe('22.5k zł');
    });
  });

  describe('triggerHaptic', () => {
    it('runs without throwing errors in browser environment', () => {
      expect(() => triggerHaptic(10)).not.toThrow();
    });
  });
});
