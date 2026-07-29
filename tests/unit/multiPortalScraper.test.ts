import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeOlx } from '@/lib/scraper/olxScraper';
import { scrapePracuj } from '@/lib/scraper/pracujScraper';
import { scrapeIndeed } from '@/lib/scraper/indeedScraper';
import { runMultiPortalScrape } from '@/lib/scraper/engine';

describe('Multi-Portal Scraper Engine (OLX, Pracuj.pl, Indeed)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('OLX Scraper', () => {
    it('parses valid OLX API response into structured ads', async () => {
      const mockOlxResponse = {
        data: [
          {
            id: 987654,
            title: 'Murarz-Zbrojarz z doświadczeniem',
            description: '<p>Poszukujemy murarza do pracy w Szczecinie. Stawka 35 zł/h.</p>',
            url: 'https://www.olx.pl/d/oferta/murarz-zbrojarz-ID987654.html',
            created_time: '2026-07-28T10:00:00Z',
            category: { type: 'job' },
            location: {
              city: { name: 'Szczecin' },
              district: { name: 'Gumieńce' },
              region: { normalized_name: 'zachodniopomorskie' },
            },
            map: { lat: 53.3973, lon: 14.5064 },
            business: true,
            user: { company_name: 'BudMax Sp. z o.o.' },
            params: [
              { key: 'salary', value: { from: 6000, to: 8000, currency: 'PLN', type: 'monthly' } },
              { key: 'agreement', value: { label: 'Umowa o pracę' } },
            ],
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOlxResponse,
      } as Response);

      const ads = await scrapeOlx({ query: 'murarz', limit: 10 });
      expect(ads.length).toBe(1);
      expect(ads[0].title).toBe('Murarz-Zbrojarz z doświadczeniem');
      expect(ads[0].source_portal).toBe('olx');
      expect(ads[0].source_url).toContain('olx.pl/d/oferta/murarz-zbrojarz-ID987654.html');
      expect(ads[0].category).toBe('budowa');
      expect(ads[0].location_text).toBe('Szczecin, Gumieńce');
      expect(ads[0].company).toBe('BudMax Sp. z o.o.');
      expect(ads[0].price).toBe('6000–8000 zł/mies.');
    });

    it('filters out non-construction jobs from OLX', async () => {
      const mockOlxResponse = {
        data: [
          {
            id: 111222,
            title: 'Księgowa / Specjalista ds. Finansów',
            description: '<p>Praca w biurze rachunkowym w Szczecinie.</p>',
            url: 'https://www.olx.pl/d/oferta/ksiegowa-ID111222.html',
            category: { type: 'job' },
            location: { region: { normalized_name: 'zachodniopomorskie' } },
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOlxResponse,
      } as Response);

      const ads = await scrapeOlx({ query: 'finanse', limit: 10 });
      expect(ads.length).toBe(0);
    });
  });

  describe('Pracuj.pl Scraper', () => {
    it('extracts Pracuj.pl job postings from JSON-LD HTML structure', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Elektryk Budowlany Szczecin",
            "description": "Zatrudnimy elektryka do prac na budowie.",
            "url": "https://www.pracuj.pl/praca/elektryk-szczecin,oferta,10098765",
            "datePublished": "2026-07-27T12:00:00Z",
            "jobLocation": {
              "address": {
                "addressLocality": "Prawobrzeże"
              }
            }
          }
          </script>
        </head>
        <body></body>
        </html>
      `;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const ads = await scrapePracuj({ query: 'elektryk', limit: 10 });
      expect(ads.length).toBe(1);
      expect(ads[0].title).toBe('Elektryk Budowlany Szczecin');
      expect(ads[0].source_portal).toBe('pracuj');
      expect(ads[0].source_url).toBe('https://www.pracuj.pl/praca/elektryk-szczecin,oferta,10098765');
      expect(ads[0].category).toBe('instalacje');
    });
  });

  describe('Indeed Scraper', () => {
    it('extracts Indeed Poland job postings from RSS XML structure', async () => {
      const mockRssXml = `
        <?xml version="1.0" encoding="UTF-8" ?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Dekarz - pokrycia dachowe</title>
              <link>https://pl.indeed.com/viewjob?jk=abc123456789</link>
              <description>Poszukujemy dekarza do montażu pokryć dachowych w Szczecinie.</description>
              <pubDate>Mon, 27 Jul 2026 14:00:00 GMT</pubDate>
              <source>DachyPol Sp. z o.o.</source>
            </item>
          </channel>
        </rss>
      `;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockRssXml,
      } as Response);

      const ads = await scrapeIndeed({ query: 'dekarz', limit: 10 });
      expect(ads.length).toBe(1);
      expect(ads[0].title).toBe('Dekarz - pokrycia dachowe');
      expect(ads[0].source_portal).toBe('indeed');
      expect(ads[0].source_url).toBe('https://pl.indeed.com/viewjob?jk=abc123456789');
      expect(ads[0].company).toBe('DachyPol Sp. z o.o.');
    });
  });

  describe('Master Multi-Portal Scrape Engine', () => {
    it('aggregates and deduplicates results across portals', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.includes('olx.pl')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [
                {
                  id: 111,
                  title: 'Hydraulik Szczecin',
                  description: 'Instalacje wod-kan',
                  url: 'https://www.olx.pl/d/oferta/hydraulik-ID111.html',
                  category: { type: 'job' },
                  location: { region: { normalized_name: 'zachodniopomorskie' } },
                },
              ],
            }),
          } as Response;
        }
        if (u.includes('pracuj.pl')) {
          return {
            ok: true,
            status: 200,
            text: async () => `
              <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "JobPosting",
                "title": "Monter klimatyzacji",
                "description": "Montaż klimatyzacji",
                "url": "https://www.pracuj.pl/praca/monter-klimatyzacji,oferta,222"
              }
              </script>
            `,
          } as Response;
        }
        if (u.includes('indeed.com')) {
          return {
            ok: true,
            status: 200,
            text: async () => `
              <rss version="2.0">
                <channel>
                  <item>
                    <title>Operator koparki</title>
                    <link>https://pl.indeed.com/viewjob?jk=333</link>
                    <description>Prace ziemne koparką</description>
                  </item>
                </channel>
              </rss>
            `,
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });

      const res = await runMultiPortalScrape({ query: 'pracownik', limit: 10 });
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(3);
      const portalsScraped = res.data.map((a) => a.source_portal);
      expect(portalsScraped).toContain('olx');
      expect(portalsScraped).toContain('pracuj');
      expect(portalsScraped).toContain('indeed');
    });
  });
});
