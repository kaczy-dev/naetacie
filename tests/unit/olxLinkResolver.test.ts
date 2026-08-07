import { describe, it, expect } from 'vitest';
import {
  extractOlxNativeId,
  normalizeOlxUrl,
  isDirectOlxOfferUrl,
  buildOlxSearchFallback,
  buildOlxMobileDeepLink,
  resolveOlxLink,
} from '@/lib/olx/olxLinkResolver';

describe('OLX Link Resolver Suite', () => {
  describe('extractOlxNativeId', () => {
    it('extracts numeric ID from canonical URL with -ID suffix', () => {
      expect(extractOlxNativeId('https://www.olx.pl/d/oferta/elektryk-szczecin-ID91827364.html')).toBe('91827364');
    });

    it('extracts alphanumeric ID from canonical URL with -ID suffix (e.g. ID108H31)', () => {
      expect(extractOlxNativeId('https://www.olx.pl/d/oferta/monter-ID108H31.html')).toBe('108H31');
    });

    it('extracts ID from ID strings with prefixes (olx-, olx_, olx_raw_)', () => {
      expect(extractOlxNativeId('olx-123456')).toBe('123456');
      expect(extractOlxNativeId('olx_ID108H31')).toBe('108H31');
      expect(extractOlxNativeId('olx_raw_998877')).toBe('998877');
      expect(extractOlxNativeId('olx-ID8eLk')).toBe('8eLk');
    });

    it('extracts standalone native IDs', () => {
      expect(extractOlxNativeId('ID108H31')).toBe('108H31');
      expect(extractOlxNativeId('918273645')).toBe('918273645');
    });

    it('returns null for unparseable input', () => {
      expect(extractOlxNativeId(null)).toBeNull();
      expect(extractOlxNativeId('')).toBeNull();
      expect(extractOlxNativeId('custom_text_no_id')).toBeNull();
    });
  });

  describe('normalizeOlxUrl', () => {
    it('normalizes domain without www (olx.pl -> www.olx.pl)', () => {
      expect(normalizeOlxUrl('http://olx.pl/d/oferta/test-ID123.html')).toBe(
        'https://www.olx.pl/d/oferta/test-ID123.html'
      );
    });

    it('normalizes mobile domain (m.olx.pl -> www.olx.pl)', () => {
      expect(normalizeOlxUrl('https://m.olx.pl/d/oferta/test-ID123.html')).toBe(
        'https://www.olx.pl/d/oferta/test-ID123.html'
      );
    });

    it('converts legacy /oferta/ to /d/oferta/', () => {
      expect(normalizeOlxUrl('https://www.olx.pl/oferta/test-ID123.html')).toBe(
        'https://www.olx.pl/d/oferta/test-ID123.html'
      );
    });

    it('unescapes HTML entities like &amp;', () => {
      expect(
        normalizeOlxUrl('https://www.olx.pl/d/oferta/test-ID123.html?bs=srp&amp;reason=seller')
      ).toBe('https://www.olx.pl/d/oferta/test-ID123.html?bs=srp&reason=seller');
    });

    it('returns relative path turned absolute', () => {
      expect(normalizeOlxUrl('/d/oferta/test-ID123.html')).toBe(
        'https://www.olx.pl/d/oferta/test-ID123.html'
      );
    });
  });

  describe('isDirectOlxOfferUrl', () => {
    it('returns true for valid offer URLs', () => {
      expect(isDirectOlxOfferUrl('https://www.olx.pl/d/oferta/dekarz-ID108H31.html')).toBe(true);
      expect(isDirectOlxOfferUrl('/oferta/murarz-ID123.html')).toBe(true);
    });

    it('returns false for generic search / category URLs', () => {
      expect(isDirectOlxOfferUrl('https://www.olx.pl/praca/szczecin/')).toBe(false);
      expect(isDirectOlxOfferUrl('https://www.olx.pl/d/oferta/')).toBe(false);
    });
  });

  describe('buildOlxSearchFallback', () => {
    it('builds job category search fallback for job titles', () => {
      expect(buildOlxSearchFallback('Zatrudnię dekarza w Szczecinie', 'budowa')).toBe(
        'https://www.olx.pl/praca/szczecin/q-dekarz/'
      );
    });

    it('builds services category search fallback for renovation/wykończenie category', () => {
      expect(buildOlxSearchFallback('Glazurnik remont łazienek', 'wykończenia')).toBe(
        'https://www.olx.pl/uslugi-firmy/budowa-remont/szczecin/q-glazurnik/'
      );
    });
  });

  describe('buildOlxMobileDeepLink', () => {
    it('generates olx://item/{id} deep link for mobile apps', () => {
      expect(buildOlxMobileDeepLink('olx-ID108H31')).toBe('olx://item/108H31');
      expect(buildOlxMobileDeepLink('https://www.olx.pl/d/oferta/test-ID918273.html')).toBe('olx://item/918273');
    });
  });

  describe('resolveOlxLink', () => {
    it('resolves direct canonical offer URL when present', () => {
      const res = resolveOlxLink({
        source_portal: 'olx',
        source_url: 'https://olx.pl/oferta/spawacz-ID555.html',
        id: 'olx-555',
      });
      expect(res.url).toBe('https://www.olx.pl/d/oferta/spawacz-ID555.html');
      expect(res.isDirectOffer).toBe(true);
      expect(res.type).toBe('direct_canonical');
      expect(res.mobileDeepLink).toBe('olx://item/555');
    });

    it('reconstructs direct offer URL from ID when source_url is missing (e.g. Free Tier)', () => {
      const res = resolveOlxLink({
        source_portal: 'olx',
        source_url: null,
        id: 'olx-ID108H31',
        title: 'Dekarz',
      });
      expect(res.url).toBe('https://www.olx.pl/d/oferta/-ID108H31.html');
      expect(res.isDirectOffer).toBe(true);
      expect(res.type).toBe('direct_id_reconstructed');
      expect(res.nativeId).toBe('108H31');
    });

    it('falls back to smart search URL when both URL and ID are unparseable', () => {
      const res = resolveOlxLink({
        source_portal: 'olx',
        source_url: '',
        id: 'custom_hash',
        title: 'Poszukujemy kierownika budowy w Szczecinie',
      });
      expect(res.url).toBe('https://www.olx.pl/praca/szczecin/q-kierownik/');
      expect(res.isDirectOffer).toBe(false);
      expect(res.type).toBe('category_search_fallback');
    });
  });
});
