import { describe, it, expect } from 'vitest';
import {
  extractOlxNativeId,
  normalizeOlxUrl,
  isDirectOlxOfferUrl,
  buildOlxSearchFallback,
  buildOlxMobileDeepLink,
  resolveOlxLink,
} from '@/lib/olx/olxLinkResolver';
import { getAnnouncementExternalUrl, ensureAbsoluteUrl, extractTradeKeyword } from '@/lib/utils';
import { healAnnouncementLink } from '@/lib/verification/linkHealer';

describe('SUPER-STRONG RIGOROUS TEST SUITE: "ZOBACZ W OLX" / "Otwórz" Live Offer Button', () => {

  describe('1. Direct Live OLX Offer Resolution (Exact Offer Targets)', () => {
    it('resolves canonical live OLX link (/d/oferta/title-IDXXXX.html)', () => {
      const ad = {
        id: 'olx-ID8eLk',
        source_portal: 'olx',
        source_url: 'https://www.olx.pl/d/oferta/elektryk-budowlany-instalacje-szczecin-ID8eLk.html',
        title: 'Elektryk budowlany w Szczecinie',
      };

      const resolved = resolveOlxLink(ad);
      expect(resolved.isDirectOffer).toBe(true);
      expect(resolved.type).toBe('direct_canonical');
      expect(resolved.url).toBe('https://www.olx.pl/d/oferta/elektryk-budowlany-instalacje-szczecin-ID8eLk.html');
      expect(resolved.nativeId).toBe('8eLk');

      const mobileDeepLink = buildOlxMobileDeepLink(ad.source_url);
      expect(mobileDeepLink).toBe('olx://item/8eLk');
    });

    it('upgrades legacy /oferta/ and m.olx.pl to canonical https://www.olx.pl/d/oferta/...', () => {
      const legacyMobileUrl = 'http://m.olx.pl/oferta/spawacz-mig-mag-ID108H31.html?bs=srp&amp;reason=seller';
      const normalized = normalizeOlxUrl(legacyMobileUrl);

      expect(normalized).toBe('https://www.olx.pl/d/oferta/spawacz-mig-mag-ID108H31.html?bs=srp&reason=seller');
      expect(normalized).not.toContain('http://');
      expect(normalized).not.toContain('m.olx.pl');
      expect(normalized).toContain('/d/oferta/');
      expect(normalized).not.toContain('&amp;');
    });

    it('reconstructs live offer URL from ID formats (olx-ID108H31, olx_raw_918273, olx_8eLk) when source_url is missing', () => {
      const testCases = [
        { id: 'olx-ID108H31', expectedNativeId: '108H31', expectedUrl: 'https://www.olx.pl/d/oferta/murarz-szczecin-ID108H31.html' },
        { id: 'olx_raw_91827364', expectedNativeId: '91827364', expectedUrl: 'https://www.olx.pl/d/oferta/murarz-szczecin-ID91827364.html' },
        { id: 'olx_8eLk', expectedNativeId: '8eLk', expectedUrl: 'https://www.olx.pl/d/oferta/murarz-szczecin-ID8eLk.html' },
        { id: '987654321', expectedNativeId: '987654321', expectedUrl: 'https://www.olx.pl/d/oferta/murarz-szczecin-ID987654321.html' },
      ];

      for (const tc of testCases) {
        const ad = { id: tc.id, source_portal: 'olx', source_url: null, title: 'Murarz Szczecin' };
        const resolved = resolveOlxLink(ad);
        expect(resolved.isDirectOffer).toBe(true);
        expect(resolved.nativeId).toBe(tc.expectedNativeId);
        expect(resolved.url).toBe(tc.expectedUrl);
        expect(getAnnouncementExternalUrl(ad)).toBe(tc.expectedUrl);
      }
    });

    it('extracts native OLX ID from complex query strings or mobile deep links', () => {
      expect(extractOlxNativeId('https://www.olx.pl/d/oferta/ciela-stolarz-ID777.html?ref=search')).toBe('777');
      expect(extractOlxNativeId('olx-raw-443322')).toBe('443322');
      expect(extractOlxNativeId('olx-ID108H31')).toBe('108H31');
    });
  });

  describe('2. Smart Search Query Fallback Resolution (Clean SLUGs)', () => {
    it('builds clean trade category queries without dirty ?q= parameters', () => {
      const trades = [
        { title: 'Zatrudnię dekarza na budowę domów', category: 'budowa', expected: 'https://www.olx.pl/d/szczecin/q-dekarz/' },
        { title: 'Poszukiwany elektryk z uprawnieniami SEP', category: 'instalacje', expected: 'https://www.olx.pl/d/szczecin/q-elektryk/' },
        { title: 'Hydraulik instalacje sanitarne i C.O.', category: 'instalacje', expected: 'https://www.olx.pl/d/szczecin/q-hydraulik/' },
        { title: 'Wykończenia wnętrz glazurnik malarz', category: 'wykończenia', expected: 'https://www.olx.pl/d/szczecin/q-glazurnik/' },
      ];

      for (const t of trades) {
        const fallback = buildOlxSearchFallback(t.title, t.category);
        expect(fallback).toBe(t.expected);
      }
    });

    it('extracts trade keyword correctly from complex multi-word job titles', () => {
      expect(extractTradeKeyword('Firma Budowlana Szczecin zatrudni murarza z doświadczeniem')).toBe('murarz');
      expect(extractTradeKeyword('Monter instalacji wentylacyjnych i klimatyzacji')).toBe('monter');
      expect(extractTradeKeyword('Kierownik Budowy / Inżynier Budowy')).toBe('kierownik');
    });

    it('sanitizes legacy query URLs with ?q= parameters into clean search query format', () => {
      const dirtyUrl = 'https://www.olx.pl/praca/szczecin/?q=Malarz+szpachlarz';
      const ad = { id: 'custom-no-id', source_portal: 'olx', source_url: dirtyUrl, title: 'Malarz' };

      const resolvedUrl = getAnnouncementExternalUrl(ad);
      expect(resolvedUrl).toBe('https://www.olx.pl/d/szczecin/q-malarz/');
    });
  });

  describe('3. Link Healer & Real-World Live Verification', () => {
    it('healAnnouncementLink verifies active direct link status', async () => {
      const ad = {
        id: 'olx-ID91827364',
        source_portal: 'olx',
        source_url: 'https://www.olx.pl/d/oferta/ciesla-szczecin-ID91827364.html',
        title: 'Cieśla konstrukcyjny',
      };

      const result = await healAnnouncementLink(ad);
      expect(result.isDirectOffer).toBe(true);
      expect(result.status).toBe('active_direct');
      expect(result.url).toBe('https://www.olx.pl/d/oferta/ciesla-szczecin-ID91827364.html');
    });

    it('healAnnouncementLink repairs missing source_url using ID fallback', async () => {
      const ad = {
        id: 'olx-ID554433',
        source_portal: 'olx',
        source_url: null,
        title: 'Pomocnik budowlany Szczecin',
      };

      const result = await healAnnouncementLink(ad);
      expect(result.url).toBe('https://www.olx.pl/d/oferta/pomocnik-budowlany-szczecin-ID554433.html');
    });

    it('getAnnouncementExternalUrl handles external portal URLs correctly', () => {
      const portals = [
        { portal: 'pracuj', url: 'https://www.pracuj.pl/praca/spawacz-szczecin,oferta,1001' },
        { portal: 'indeed', url: 'https://pl.indeed.com/viewjob?jk=abc12345' },
      ];

      for (const p of portals) {
        const ad = { id: `id-${p.portal}`, source_portal: p.portal, source_url: p.url, title: 'Praca' };
        const url = getAnnouncementExternalUrl(ad);
        expect(url).toBe(p.url);
      }
    });
  });
});
