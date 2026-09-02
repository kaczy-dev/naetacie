import { describe, it, expect, vi } from 'vitest';
import { fetchOlxRssFeed, fetchOlxPhone, parseOlxOffer, type OlxOffer } from '@/lib/scraper/olxScraper';

describe('OLX Scraper Enhancements Suite', () => {
  describe('fetchOlxRssFeed (Layer 1 Real-Time RSS Streaming)', () => {
    it('parses OLX XML RSS items into structured ScrapedAd objects', async () => {
      const mockXml = `
        <?xml version="1.0" encoding="UTF-8" ?>
        <rss version="2.0">
          <channel>
            <title>OLX Szczecin - Praca</title>
            <item>
              <title><![CDATA[Cieśla szalunkowy - budowa Szczecin]]></title>
              <link>https://www.olx.pl/d/oferta/ciesla-szalunkowy-szczecin-ID998877.html</link>
              <description><![CDATA[Zatrudnię cieślę szalunkowego. Wymagane doświadczenie Doka/Peri. Tel. 501 222 333.]]></description>
              <pubDate>Mon, 27 Jul 2026 12:00:00 +0200</pubDate>
            </item>
          </channel>
        </rss>
      `;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockXml,
      } as Response);

      const ads = await fetchOlxRssFeed('https://www.olx.pl/praca/szczecin/rss/');
      expect(ads.length).toBe(1);
      expect(ads[0].title).toBe('Cieśla szalunkowy - budowa Szczecin');
      expect(ads[0].source_portal).toBe('olx');
      expect(ads[0].source_url).toContain('ID998877.html');
      expect(ads[0].phone).toBe('501-222-333');
    });
  });

  describe('fetchOlxPhone (Unmasking Phone API)', () => {
    it('fetches unmasked phone numbers from OLX phones endpoint', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            phones: ['+48 501 234 567'],
          },
        }),
      } as Response);

      const phone = await fetchOlxPhone('998877', 'https://www.olx.pl/d/oferta/test-ID998877.html');
      expect(phone).toBe('+48 501 234 567');
    });
  });

  describe('parseOlxOffer with Photos and Micro-Districts', () => {
    it('extracts photos and micro-district metadata', () => {
      const offer: OlxOffer = {
        id: 777666,
        title: 'Monter klimatyzacji Szczecin Pogodno',
        description: 'Montaż klimatyzacji split.',
        url: 'https://www.olx.pl/d/oferta/monter-klimatyzacji-ID777666.html',
        location: {
          city: { name: 'Szczecin' },
          district: { name: 'Pogodno' },
        },
        photos: [
          { link: 'https://img.olx.pl/photos/12345/1;s=644x461' },
          { link: 'https://img.olx.pl/photos/12345/2;s=644x461' },
        ],
      };

      const parsed = parseOlxOffer(offer);
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(parsed.location_text).toBe('Szczecin, Pogodno');
        expect(parsed.district).toBe('Pogodno');
        expect(parsed.photos).toHaveLength(2);
        expect(parsed.photos?.[0]).toContain('1000x700');
      }
    });
  });
});
