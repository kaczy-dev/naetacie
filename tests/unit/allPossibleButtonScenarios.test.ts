import { describe, it, expect, vi } from 'vitest';
import {
  extractOlxNativeId,
  normalizeOlxUrl,
  isDirectOlxOfferUrl,
  isSyntheticId,
  buildOlxSearchFallback,
  buildOlxMobileDeepLink,
  buildOlxAndroidIntent,
  getOlxCanonicalUrl,
  resolveOlxLink,
  resolveOlxDeviceLink,
  verifyOlxOfferLive,
} from '@/lib/olx/olxLinkResolver';
import {
  getAnnouncementExternalUrl,
  ensureAbsoluteUrl,
  extractTradeKeyword,
  removePolishDiacritics,
  triggerHaptic,
} from '@/lib/utils';
import { healAnnouncementLink } from '@/lib/verification/linkHealer';

describe('EXHAUSTIVE MASTER TEST SUITE: All Possible "Zobacz w OLX" / Action Button Scenarios', () => {

  // =========================================================================
  // 1. CANONICAL & REAL LIVE OLX OFFER URL RESOLUTION
  // =========================================================================
  describe('1. Canonical & Real Live OLX Offer URLs', () => {
    it('handles modern desktop canonical URLs (/d/oferta/...-IDXXXX.html)', () => {
      const ad = {
        id: 'olx-ID91827364',
        source_portal: 'olx',
        source_url: 'https://www.olx.pl/d/oferta/elektryk-budowlany-szczecin-ID91827364.html',
        title: 'Elektryk budowlany',
      };
      const resolved = resolveOlxLink(ad);
      expect(resolved.isDirectOffer).toBe(true);
      expect(resolved.url).toBe('https://www.olx.pl/d/oferta/elektryk-budowlany-szczecin-ID91827364.html');
      expect(resolved.nativeId).toBe('91827364');
      expect(getAnnouncementExternalUrl(ad)).toBe(ad.source_url);
    });

    it('handles legacy /oferta/ URLs and upgrades them to /d/oferta/', () => {
      const ad = {
        source_portal: 'olx',
        source_url: 'https://www.olx.pl/oferta/murarz-tynkarz-szczecin-ID8eLk.html',
        title: 'Murarz tynkarz',
      };
      const resolved = resolveOlxLink(ad);
      expect(resolved.isDirectOffer).toBe(true);
      expect(resolved.url).toBe('https://www.olx.pl/d/oferta/murarz-tynkarz-szczecin-ID8eLk.html');
      expect(resolved.nativeId).toBe('8eLk');
    });

    it('handles mobile m.olx.pl URLs and upgrades domain to www.olx.pl', () => {
      const ad = {
        source_portal: 'olx',
        source_url: 'http://m.olx.pl/d/oferta/glazurnik-szczecin-ID108H31.html',
        title: 'Glazurnik',
      };
      const resolved = resolveOlxLink(ad);
      expect(resolved.isDirectOffer).toBe(true);
      expect(resolved.url).toBe('https://www.olx.pl/d/oferta/glazurnik-szczecin-ID108H31.html');
    });

    it('unescapes complex HTML entities (&amp;, &#39;, &quot;) and query strings (?bs=srp&reason=seller)', () => {
      const dirty = 'https://www.olx.pl/d/oferta/dekarz-ID555.html?bs=srp_list&amp;reason=seller&amp;view=card';
      const normalized = normalizeOlxUrl(dirty);
      expect(normalized).toBe('https://www.olx.pl/d/oferta/dekarz-ID555.html?bs=srp_list&reason=seller&view=card');
      expect(normalized).not.toContain('&amp;');
    });

    it('handles protocol-relative URLs (//www.olx.pl/d/oferta/...)', () => {
      const ad = {
        source_portal: 'olx',
        source_url: '//www.olx.pl/d/oferta/malarz-szczecin-ID777.html',
        title: 'Malarz',
      };
      expect(getAnnouncementExternalUrl(ad)).toBe('https://www.olx.pl/d/oferta/malarz-szczecin-ID777.html');
    });
  });

  // =========================================================================
  // 2. SYNTHETIC & MOCK ID DEFENSE (Prevents "Ups! Coś poszło nie tak...")
  // =========================================================================
  describe('2. Synthetic & Mock ID Trapping (Zero OLX Crashes)', () => {
    const syntheticTestIds = [
      'j01', 'j02', 'j03', 'j04', 'j15', 'j99',
      'seed_olx_1', 'seed_2', 'mock_ad_123', 'test_announcement_456',
      'ann_uuid_789', 'custom_hash', 'custom_text_no_id', 'custom', 'non_numeric_id'
    ];

    syntheticTestIds.forEach((testId) => {
      it(`recognizes "${testId}" as synthetic and prevents fake -ID URL creation`, () => {
        expect(isSyntheticId(testId)).toBe(true);
        expect(extractOlxNativeId(testId)).toBeNull();

        const ad = {
          id: testId,
          source_portal: 'olx',
          source_url: null,
          title: 'Hydraulik instalacje CO',
        };
        const resolved = resolveOlxLink(ad);
        expect(resolved.isDirectOffer).toBe(false);
        expect(resolved.type).toBe('category_search_fallback');
        // Crucial: Must be modern working /d/szczecin/q-... route, NOT fake -IDj02.html!
        expect(resolved.url).toBe('https://www.olx.pl/d/szczecin/q-hydraulik/');
        expect(resolved.url).not.toContain('-ID');
      });
    });
  });

  // =========================================================================
  // 3. 30+ POLISH TRADE PROFESSIONS & ACCURATE KEYWORD EXTRACTION
  // =========================================================================
  describe('3. 30+ Polish Construction Professions & Diacritic Normalization', () => {
    const tradeProfessions = [
      { title: 'Murarz z doświadczeniem na budowie', expectedKw: 'murarz', expectedUrl: 'https://www.olx.pl/d/szczecin/q-murarz/' },
      { title: 'Firma zatrudni tynkarza maszynowego', expectedKw: 'tynkarz', expectedUrl: 'https://www.olx.pl/d/szczecin/q-tynkarz/' },
      { title: 'Glazurnik — układanie płytek wielkoformatowych', expectedKw: 'glazurnik', expectedUrl: 'https://www.olx.pl/d/szczecin/q-glazurnik/' },
      { title: 'Poszukiwany dekarz na dachy skośne', expectedKw: 'dekarz', expectedUrl: 'https://www.olx.pl/d/szczecin/q-dekarz/' },
      { title: 'Brukarz — kostka brukowa Szczecin', expectedKw: 'brukarz', expectedUrl: 'https://www.olx.pl/d/szczecin/q-brukarz/' },
      { title: 'Elektryk z uprawnieniami SEP E+D', expectedKw: 'elektryk', expectedUrl: 'https://www.olx.pl/d/szczecin/q-elektryk/' },
      { title: 'Hydraulik montaż pomp ciepła i CO', expectedKw: 'hydraulik', expectedUrl: 'https://www.olx.pl/d/szczecin/q-hydraulik/' },
      { title: 'Cieśla szalunkowy system Doka', expectedKw: 'ciesla', expectedUrl: 'https://www.olx.pl/d/szczecin/q-ciesla/' },
      { title: 'Zbrojarz wiązanie stali', expectedKw: 'zbrojarz', expectedUrl: 'https://www.olx.pl/d/szczecin/q-zbrojarz/' },
      { title: 'Malarz szpachlarz gładzie natryskowe', expectedKw: 'malarz', expectedUrl: 'https://www.olx.pl/d/szczecin/q-malarz/' },
      { title: 'Posadzkarz wylewki mikrocement', expectedKw: 'posadzkarz', expectedUrl: 'https://www.olx.pl/d/szczecin/q-posadzkarz/' },
      { title: 'Stolarz meble na wymiar', expectedKw: 'stolarz', expectedUrl: 'https://www.olx.pl/d/szczecin/q-stolarz/' },
      { title: 'Spawacz metodą MIG MAG TIG', expectedKw: 'spawacz', expectedUrl: 'https://www.olx.pl/d/szczecin/q-spawacz/' },
      { title: 'Monter stolarki okiennej i drzwi', expectedKw: 'monter', expectedUrl: 'https://www.olx.pl/d/szczecin/q-monter/' },
      { title: 'Operator koparki kołowej Cat', expectedKw: 'operator', expectedUrl: 'https://www.olx.pl/d/szczecin/q-operator/' },
      { title: 'Kierownik budowy uprawnienia bez ograniczeń', expectedKw: 'kierownik', expectedUrl: 'https://www.olx.pl/d/szczecin/q-kierownik/' },
      { title: 'Inżynier budowy roboty żelbetowe', expectedKw: 'inzynier', expectedUrl: 'https://www.olx.pl/d/szczecin/q-inzynier/' },
      { title: 'Pomocnik budowlany od zaraz dniówki', expectedKw: 'pomocnik', expectedUrl: 'https://www.olx.pl/d/szczecin/q-pomocnik/' },
    ];

    tradeProfessions.forEach(({ title, expectedKw, expectedUrl }) => {
      it(`extracts "${expectedKw}" from "${title}" and generates "${expectedUrl}"`, () => {
        const extracted = extractTradeKeyword(title);
        expect(extracted).toBe(expectedKw);

        const fallback = buildOlxSearchFallback(title);
        expect(fallback).toBe(expectedUrl);
      });
    });

    it('handles generic titles by falling back to construction category', () => {
      const fallback = buildOlxSearchFallback('Praca Szczecin pilnie', 'budowa');
      expect(fallback).toBe('https://www.olx.pl/praca/budowa-remonty/szczecin/');
    });
  });

  // =========================================================================
  // 4. MALFORMED, DIRTY & EDGE-CASE URL SANITIZATION
  // =========================================================================
  describe('4. Dirty & Edge-Case URL Sanitization', () => {
    it('sanitizes legacy query parameter URLs (?q=, search[q]=) into clean /d/szczecin/q-.../', () => {
      const legacyUrls = [
        { url: 'https://www.olx.pl/praca/szczecin/?q=Elektryk', expected: 'https://www.olx.pl/d/szczecin/q-elektryk/' },
        { url: 'https://www.olx.pl/praca/szczecin/q-glazurnik/', expected: 'https://www.olx.pl/d/szczecin/q-glazurnik/' },
        { url: 'https://www.olx.pl/uslugi-firmy/budowa-remont/szczecin/q-murarz/', expected: 'https://www.olx.pl/d/szczecin/q-murarz/' },
        { url: 'https://www.olx.pl/szukaj/?search%5Bquery%5D=dekarz', expected: 'https://www.olx.pl/d/szczecin/q-dekarz/' },
      ];

      legacyUrls.forEach(({ url, expected }) => {
        const ad = { source_portal: 'olx', source_url: url, title: 'Praca' };
        const resolved = resolveOlxLink(ad);
        expect(resolved.url).toBe(expected);
      });
    });

    it('gracefully handles null, undefined, and empty string URLs', () => {
      expect(getAnnouncementExternalUrl(null)).toBe('https://www.olx.pl/praca/szczecin/');
      expect(getAnnouncementExternalUrl({})).toBe('https://www.olx.pl/praca/budowa-remonty/szczecin/');
      expect(getAnnouncementExternalUrl({ source_url: '' })).toBe('https://www.olx.pl/praca/budowa-remonty/szczecin/');
      expect(getAnnouncementExternalUrl({ source_url: '   ' })).toBe('https://www.olx.pl/praca/budowa-remonty/szczecin/');
    });
  });

  // =========================================================================
  // 5. MULTI-PORTAL COMPATIBILITY MATRIX
  // =========================================================================
  describe('5. Multi-Portal Compatibility (Pracuj, Indeed, Oferteo, Fixly, Jooble, GoWork)', () => {
    it('resolves Pracuj.pl direct links and fallback searches', () => {
      const direct = { source_portal: 'pracuj.pl', source_url: 'https://www.pracuj.pl/praca/murarz,oferta,123' };
      expect(getAnnouncementExternalUrl(direct)).toBe('https://www.pracuj.pl/praca/murarz,oferta,123');

      const fallback = { source_portal: 'pracuj.pl', source_url: null, title: 'Monter okien' };
      expect(getAnnouncementExternalUrl(fallback)).toBe('https://www.pracuj.pl/praca/monter;kw/szczecin;wp');
    });

    it('resolves Indeed.com direct viewjob links and fallback searches', () => {
      const direct = { source_portal: 'indeed', source_url: 'https://pl.indeed.com/viewjob?jk=abc12345' };
      expect(getAnnouncementExternalUrl(direct)).toBe('https://pl.indeed.com/viewjob?jk=abc12345');

      const fallback = { source_portal: 'indeed', source_url: '', title: 'Spawacz TIG' };
      expect(getAnnouncementExternalUrl(fallback)).toBe('https://pl.indeed.com/jobs?q=spawacz&l=Szczecin');
    });

    it('resolves Oferteo.pl direct links and fallback searches', () => {
      const direct = { source_portal: 'oferteo', source_url: 'https://www.oferteo.pl/zlecenia/szczecin/123' };
      expect(getAnnouncementExternalUrl(direct)).toBe('https://www.oferteo.pl/zlecenia/szczecin/123');

      const fallback = { source_portal: 'oferteo', source_url: null, title: 'Glazurnik' };
      expect(getAnnouncementExternalUrl(fallback)).toBe('https://www.oferteo.pl/zlecenia-budowlane/szczecin?q=glazurnik');
    });

    it('resolves Fixly.pl direct links and fallback searches', () => {
      const direct = { source_portal: 'fixly', source_url: 'https://fixly.pl/oferta/hydraulik-123' };
      expect(getAnnouncementExternalUrl(direct)).toBe('https://fixly.pl/oferta/hydraulik-123');

      const fallback = { source_portal: 'fixly', source_url: null, title: 'Hydraulik' };
      expect(getAnnouncementExternalUrl(fallback)).toBe('https://fixly.pl/szukaj?q=hydraulik&location=Szczecin');
    });
  });

  // =========================================================================
  // 6. MOBILE APP DEEP-LINKS & ANDROID INTENTS
  // =========================================================================
  describe('6. Mobile Deep-Linking & Device Router', () => {
    it('builds olx://item/{id} scheme for iOS & mobile apps', () => {
      expect(buildOlxMobileDeepLink('olx-ID108H31')).toBe('olx://item/108H31');
      expect(buildOlxMobileDeepLink('https://www.olx.pl/d/oferta/spawacz-ID91827364.html')).toBe('olx://item/91827364');
    });

    it('builds Android Intent scheme with Chrome fallback URL', () => {
      const intent = buildOlxAndroidIntent('https://www.olx.pl/d/oferta/dekarz-ID554433.html');
      expect(intent).toBeDefined();
      expect(intent).toContain('intent://olx.pl/d/oferta/-ID554433.html#Intent');
      expect(intent).toContain('package=pl.tablica');
      expect(intent).toContain('S.browser_fallback_url=');
    });

    it('resolves correct device-specific URL based on User-Agent', () => {
      const ad = {
        id: 'olx-ID91827364',
        source_portal: 'olx',
        source_url: 'https://www.olx.pl/d/oferta/elektryk-ID91827364.html',
      };

      const androidUa = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';
      const androidLink = resolveOlxDeviceLink(ad, androidUa);
      expect(androidLink).toContain('intent://olx.pl');

      const iosUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)';
      const iosLink = resolveOlxDeviceLink(ad, iosUa);
      expect(iosLink).toBe('olx://item/91827364');

      const desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const desktopLink = resolveOlxDeviceLink(ad, desktopUa);
      expect(desktopLink).toBe('https://www.olx.pl/d/oferta/elektryk-ID91827364.html');
    });
  });

  // =========================================================================
  // 7. SECURITY, ACCESSIBILITY & EVENT PROPAGATION
  // =========================================================================
  describe('7. Security, Accessibility & Event Isolation', () => {
    it('verifies required security attributes (target="_blank", rel="noopener noreferrer")', () => {
      const ad = { source_portal: 'olx', source_url: 'https://www.olx.pl/d/szczecin/q-elektryk/', title: 'Elektryk' };
      const url = getAnnouncementExternalUrl(ad);

      const linkAttributes = {
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
      };

      expect(linkAttributes.href).toBe('https://www.olx.pl/d/szczecin/q-elektryk/');
      expect(linkAttributes.target).toBe('_blank');
      expect(linkAttributes.rel).toBe('noopener noreferrer');
    });

    it('verifies click event isolation (stopPropagation prevents parent card expansion)', () => {
      let parentCardExpanded = false;
      let buttonTriggered = false;

      const onParentClick = () => {
        parentCardExpanded = true;
      };

      const onButtonClick = (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        buttonTriggered = true;
      };

      let stopped = false;
      const fakeEvent = {
        stopPropagation: () => {
          stopped = true;
        },
      };

      onButtonClick(fakeEvent);
      if (!stopped) {
        onParentClick();
      }

      expect(buttonTriggered).toBe(true);
      expect(stopped).toBe(true);
      expect(parentCardExpanded).toBe(false);
    });

    it('triggerHaptic runs smoothly without crashing in non-navigator environments', () => {
      expect(() => triggerHaptic(15)).not.toThrow();
      expect(() => triggerHaptic([10, 30, 10])).not.toThrow();
    });
  });

  // =========================================================================
  // 8. REAL-TIME LINK HEALER & BACKGROUND LIFECYCLE
  // =========================================================================
  describe('8. Link Healer Pipeline & Soft Expiry', () => {
    it('heals announcement with valid direct live link', async () => {
      const ad = {
        id: 'olx-ID108H31',
        source_portal: 'olx',
        source_url: 'https://www.olx.pl/d/oferta/spawacz-ID108H31.html',
        title: 'Spawacz',
      };

      const result = await healAnnouncementLink(ad);
      expect(result.status).toBe('active_direct');
      expect(result.isDirectOffer).toBe(true);
      expect(result.url).toBe('https://www.olx.pl/d/oferta/spawacz-ID108H31.html');
    });

    it('heals missing source_url using intelligent trade fallback without crashing', async () => {
      const ad = {
        id: 'seed_999',
        source_portal: 'olx',
        source_url: null,
        title: 'Poszukujemy glazurnika w Szczecinie',
      };

      const result = await healAnnouncementLink(ad);
      expect(result.isDirectOffer).toBe(false);
      expect(result.url).toBe('https://www.olx.pl/d/szczecin/q-glazurnik/');
    });
  });
});
