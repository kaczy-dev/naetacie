import { describe, it, expect } from 'vitest';
import { ensureAbsoluteUrl, formatShortPrice, triggerHaptic, extractTradeKeyword, getAnnouncementExternalUrl } from '@/lib/utils';

describe('Utility Helper Functions (Unit Tests)', () => {
  describe('ensureAbsoluteUrl', () => {
    it('returns null for null, undefined, or empty string input', () => {
      expect(ensureAbsoluteUrl(null)).toBeNull();
      expect(ensureAbsoluteUrl(undefined)).toBeNull();
      expect(ensureAbsoluteUrl('')).toBeNull();
      expect(ensureAbsoluteUrl('   ')).toBeNull();
    });

    it('preserves existing https:// and http:// URLs', () => {
      expect(ensureAbsoluteUrl('https://example.com/oferta/123')).toBe('https://example.com/oferta/123');
      expect(ensureAbsoluteUrl('http://pracuj.pl/oferty/456')).toBe('http://pracuj.pl/oferty/456');
    });

    it('prefixes URLs missing scheme with https://', () => {
      expect(ensureAbsoluteUrl('example.com/oferta/123')).toBe('https://example.com/oferta/123');
      expect(ensureAbsoluteUrl('www.oferteo.pl/szczecin')).toBe('https://www.oferteo.pl/szczecin');
    });

    it('handles relative path links and portal hints correctly', () => {
      expect(ensureAbsoluteUrl('/d/oferta/praca-murarz-ID123.html')).toBe('https://www.olx.pl/d/oferta/praca-murarz-ID123.html');
      expect(ensureAbsoluteUrl('/praca/szczecin', 'pracuj')).toBe('https://www.pracuj.pl/praca/szczecin');
      expect(ensureAbsoluteUrl('//www.olx.pl/d/oferta/123')).toBe('https://www.olx.pl/d/oferta/123');
      expect(ensureAbsoluteUrl('/announcements/seed-1')).toBe('https://www.olx.pl/announcements/seed-1');
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

  describe('extractTradeKeyword', () => {
    it('extracts exact trade keyword from long sentence titles', () => {
      expect(extractTradeKeyword('Firma Onesto zatrudni dekarza z doświadczeniem')).toBe('dekarz');
      expect(extractTradeKeyword('Pilnie poszukujemy elektryka do budowy')).toBe('elektryk');
      expect(extractTradeKeyword('Zatrudnię pomocnika od zaraz')).toBe('pomocnik');

      const url = getAnnouncementExternalUrl({
        title: 'Firma Onesto zatrudni dekarza z doświadczeniem',
        source_portal: 'olx',
      });
      expect(url).toBe('https://www.olx.pl/d/szczecin/q-dekarz/');
    });
  });

  describe('triggerHaptic', () => {
    it('runs without throwing errors in browser environment', () => {
      expect(() => triggerHaptic(10)).not.toThrow();
    });
  });
});
