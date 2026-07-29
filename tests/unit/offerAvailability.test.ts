import { describe, it, expect, vi } from 'vitest';
import {
  verifyOfferAvailability,
  filterAndAddAvailableOffers,
  checkMetadataCompleteness,
  checkOfferAge,
  checkKeywordAvailability,
  checkLiveHttpAvailability,
} from '@/lib/verification/offerAvailability';
import { ScrapedAd } from '@/lib/scraper/types';

describe('Offer Availability Algorithm & Auto-Ingestion Engine', () => {
  describe('Metadata Completeness Check', () => {
    it('returns invalid if title is missing or empty', () => {
      const res = checkMetadataCompleteness({ title: '', source_url: 'https://olx.pl/d/123' });
      expect(res.valid).toBe(false);
      expect(res.details).toContain('Missing title');
    });

    it('returns invalid if source_url is missing', () => {
      const res = checkMetadataCompleteness({ title: 'Murarz Szczecin', source_url: '' });
      expect(res.valid).toBe(false);
      expect(res.details).toContain('Missing source_url');
    });

    it('returns valid for complete metadata', () => {
      const res = checkMetadataCompleteness({
        title: 'Elektryk Budowlany',
        source_url: 'https://www.pracuj.pl/praca/123',
      });
      expect(res.valid).toBe(true);
    });
  });

  describe('Offer Age / Retention Expiration Check', () => {
    it('approves fresh offer published today', () => {
      const today = new Date().toISOString();
      const res = checkOfferAge({ published_at: today }, 30);
      expect(res.valid).toBe(true);
    });

    it('rejects offer older than 30 days', () => {
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
      const res = checkOfferAge({ published_at: oldDate }, 30);
      expect(res.valid).toBe(false);
      expect(res.ageDays).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Closed/Expired Keyword Heuristics', () => {
    it('detects "ogłoszenie nieaktualne" in description', () => {
      const res = checkKeywordAvailability('Murarz Szczecin', 'Przepraszamy, ogłoszenie jest nieaktualne.');
      expect(res.valid).toBe(false);
      expect(res.matchedKeyword).toMatch(/ogłoszenie jest nieaktualne/i);
    });

    it('detects "rekrutacja zakończona" in title', () => {
      const res = checkKeywordAvailability('Hydraulik - Rekrutacja zakończona', 'Dobre zarobki');
      expect(res.valid).toBe(false);
    });

    it('passes active construction job offer without closed keywords', () => {
      const res = checkKeywordAvailability(
        'Zatrudnię dekara na budowę Szczecin',
        'Stawka 40-50 zł/h, od zaraz, umowa o pracę.'
      );
      expect(res.valid).toBe(true);
    });
  });

  describe('Live HTTP Reachability Check', () => {
    it('detects HTTP 404 dead link', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          url: 'https://olx.pl/d/oferta/dead-123.html',
        })
      );

      const res = await checkLiveHttpAvailability('https://olx.pl/d/oferta/dead-123.html', 'olx');
      expect(res.isAvailable).toBe(false);
      expect(res.reason).toBe('HTTP_NOT_FOUND');

      vi.unstubAllGlobals();
    });

    it('detects OLX dead offer signature in HTML response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          url: 'https://olx.pl/d/oferta/archived-123.html',
          text: async () => '<html><body><div>To ogłoszenie nie jest już dostępne</div></body></html>',
        })
      );

      const res = await checkLiveHttpAvailability('https://olx.pl/d/oferta/archived-123.html', 'olx');
      expect(res.isAvailable).toBe(false);
      expect(res.reason).toBe('LIVE_PORTAL_INACTIVE');

      vi.unstubAllGlobals();
    });
  });

  describe('Full Verify & Auto-Ingest Algorithm', () => {
    it('filters out unavailable offers and returns only available ones', async () => {
      const mockOffers: Partial<ScrapedAd>[] = [
        {
          id: 'ad_1',
          title: 'Malarz Budowlany Szczecin',
          description: 'Poszukujemy malarza na budowę. Stawka 35 zł/h.',
          source_url: 'https://olx.pl/d/oferta/malarz-1',
          published_at: new Date().toISOString(),
        },
        {
          id: 'ad_2',
          title: 'Tynkarz - Nieaktualne',
          description: 'Ogłoszenie wygasło. Rekrutacja zakończona.',
          source_url: 'https://olx.pl/d/oferta/tynkarz-2',
          published_at: new Date().toISOString(),
        },
        {
          id: 'ad_3',
          title: 'Stary Dekarz',
          description: 'Bardzo stara oferta',
          source_url: 'https://olx.pl/d/oferta/dekarz-3',
          published_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const res = await filterAndAddAvailableOffers(mockOffers, { storeInFirestore: false });

      expect(res.summary.totalChecked).toBe(3);
      expect(res.summary.availableCount).toBe(1);
      expect(res.summary.rejectedCount).toBe(2);

      expect(res.availableOffers[0].id).toBe('ad_1');
      expect(res.availableOffers[0].is_active).toBe(true);
      expect(res.availableOffers[0].availability_status).toBe('active');
    });
  });
});
