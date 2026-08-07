import { describe, it, expect } from 'vitest';
import { getAnnouncementExternalUrl, ensureAbsoluteUrl, extractTradeKeyword } from '@/lib/utils';
import { healAnnouncementLink } from '@/lib/verification/linkHealer';

describe('OLX "Zobacz w OLX" / "Otwórz" Button Unit Test Suite', () => {
  describe('Direct Offer URL Resolution', () => {
    it('preserves canonical direct OLX offer link (/d/oferta/...-IDXXXX.html)', () => {
      const ad = {
        source_portal: 'olx',
        source_url: 'https://www.olx.pl/d/oferta/elektryk-budowlany-instalacje-szczecin-ID8eLk.html',
        title: 'Elektryk budowlany',
        id: 'olx_8eLk',
      };

      const url = getAnnouncementExternalUrl(ad);
      expect(url).toBe('https://www.olx.pl/d/oferta/elektryk-budowlany-instalacje-szczecin-ID8eLk.html');
      expect(url).toContain('/d/oferta/');
      expect(url).toContain('.html');
    });

    it('normalizes legacy /oferta/ relative path to /d/oferta/', () => {
      const ad = {
        source_portal: 'olx',
        source_url: '/oferta/murarz-tynkarz-szczecin-ID9fG2.html',
        title: 'Murarz tynkarz',
        id: 'j04',
      };

      const url = getAnnouncementExternalUrl(ad);
      expect(url).toBe('https://www.olx.pl/d/oferta/murarz-tynkarz-szczecin-ID9fG2.html');
    });

    it('resolves numerical OLX offer ID into direct offer URL', () => {
      const ad = {
        source_portal: 'olx',
        source_url: null,
        title: 'Brukarz kostka',
        id: 'olx_91827364',
      };

      const url = getAnnouncementExternalUrl(ad);
      expect(url).toBe('https://www.olx.pl/d/oferta/-ID91827364.html');
    });

    it('resolves raw numeric OLX ID (olx_raw_123456) into direct offer URL', () => {
      const ad = {
        source_portal: 'olx',
        source_url: '',
        title: 'Dekarz Szczecin',
        id: 'olx_raw_7654321',
      };

      const url = getAnnouncementExternalUrl(ad);
      expect(url).toBe('https://www.olx.pl/d/oferta/-ID7654321.html');
    });

    it('resolves alphanumeric OLX native ID (olx-ID108H31 or olx_108H31) into direct offer URL', () => {
      const ad = {
        source_portal: 'olx',
        source_url: null,
        title: 'Monter ogrodzeń',
        id: 'olx-ID108H31',
      };

      const url = getAnnouncementExternalUrl(ad);
      expect(url).toBe('https://www.olx.pl/d/oferta/-ID108H31.html');
    });

    it('unescapes HTML entities (&amp;) and normalizes m.olx.pl domains', () => {
      const ad = {
        source_portal: 'olx',
        source_url: 'https://m.olx.pl/d/oferta/spawacz-ID998.html?bs=srp_list&amp;reason=seller',
        title: 'Spawacz',
        id: 'olx_998',
      };

      const url = getAnnouncementExternalUrl(ad);
      expect(url).toBe('https://www.olx.pl/d/oferta/spawacz-ID998.html?bs=srp_list&reason=seller');
    });
  });

  describe('Search Query Fallback Resolution', () => {
    it('uses clean q- trade keyword slug when no direct link or ID exists', () => {
      const ad = {
        source_portal: 'olx',
        source_url: null,
        title: 'Firma Onesto zatrudni dekarza z doświadczeniem w Szczecinie',
        id: 'custom_id_no_numbers',
      };

      const url = getAnnouncementExternalUrl(ad);
      expect(url).toBe('https://www.olx.pl/praca/szczecin/q-dekarz/');
    });

    it('sanitizes legacy ?q= parameters into clean q- trade category slugs', () => {
      const ad = {
        source_portal: 'olx',
        source_url: 'https://www.olx.pl/praca/szczecin/?q=Elektryk+budowlany',
        title: 'Elektryk budowlany',
        id: 'j02',
      };

      const url = getAnnouncementExternalUrl(ad);
      expect(url).toBe('https://www.olx.pl/praca/szczecin/q-elektryk/');
      expect(url).not.toContain('?q=');
    });
  });

  describe('Link Healer Integration', () => {
    it('healAnnouncementLink returns active_direct status for direct live URLs', async () => {
      const ad = {
        source_portal: 'olx',
        source_url: 'https://www.olx.pl/d/oferta/spawacz-mig-mag-szczecin-ID555.html',
        title: 'Spawacz MIG/MAG',
        id: 'olx_555',
      };

      const result = await healAnnouncementLink(ad);
      expect(result.url).toBe('https://www.olx.pl/d/oferta/spawacz-mig-mag-szczecin-ID555.html');
      expect(result.isDirectOffer).toBe(true);
    });

    it('healAnnouncementLink returns healed_search fallback when source_url is missing', async () => {
      const ad = {
        source_portal: 'olx',
        source_url: '',
        title: 'Pomocnik budowlany Szczecin',
        id: 'non_numeric_id',
      };

      const result = await healAnnouncementLink(ad);
      expect(result.url).toBe('https://www.olx.pl/praca/szczecin/q-pomocnik/');
      expect(result.isDirectOffer).toBe(false);
      expect(result.status).toBe('healed_search');
    });
  });
});
