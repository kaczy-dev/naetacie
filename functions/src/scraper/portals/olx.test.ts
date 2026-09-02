import { describe, it, expect, vi, beforeEach } from 'vitest';
import { olxScraper } from './olx';
import type { Browser, ScraperConfig } from '../types';

describe('OLX Portal Scraper Module', () => {
  const defaultConfig: ScraperConfig = {
    maxAdsPerPortal: 5,
    requestTimeoutMs: 10000,
    userAgents: ['Mozilla/5.0 Test-Agent-1', 'Mozilla/5.0 Test-Agent-2'],
    minDelayMs: 0,
    maxDelayMs: 0,
  };

  const createMockCard = (data: {
    title?: string | null;
    description?: string | null;
    price?: string | null;
    location?: string | null;
    contact?: string | null;
    href?: string | null;
    dataId?: string | null;
    dataCyId?: string | null;
  }) => {
    return {
      $: vi.fn().mockImplementation(async (selector: string) => {
        if (selector.includes('ad-title') || selector.includes('title')) {
          if (data.title === undefined) return null;
          return {
            textContent: async () => data.title,
          };
        }
        if (selector.includes('ad-description') || selector.includes('description')) {
          if (data.description === undefined) return null;
          return {
            textContent: async () => data.description,
          };
        }
        if (selector.includes('ad-price') || selector.includes('price')) {
          if (data.price === undefined) return null;
          return {
            textContent: async () => data.price,
          };
        }
        if (selector.includes('location-date') || selector.includes('location')) {
          if (data.location === undefined) return null;
          return {
            textContent: async () => data.location,
          };
        }
        if (selector.includes('contact-phone') || selector.includes('contact')) {
          if (data.contact === undefined) return null;
          return {
            textContent: async () => data.contact,
          };
        }
        if (selector.includes('/d/oferta/') || selector.includes('detailLink') || selector === 'a[href*="/d/oferta/"], a[href*="/oferta/"], a') {
          if (data.href === undefined) return null;
          return {
            getAttribute: async (attr: string) => (attr === 'href' ? data.href : null),
          };
        }
        return null;
      }),
      getAttribute: vi.fn().mockImplementation(async (attr: string) => {
        if (attr === 'data-id') return data.dataId ?? null;
        if (attr === 'data-cy-id') return data.dataCyId ?? null;
        return null;
      }),
    };
  };

  let mockPage: {
    setExtraHTTPHeaders: ReturnType<typeof vi.fn>;
    goto: ReturnType<typeof vi.fn>;
    waitForSelector: ReturnType<typeof vi.fn>;
    $$: ReturnType<typeof vi.fn>;
    $: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  let mockBrowser: Browser;

  beforeEach(() => {
    mockPage = {
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
      goto: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      $$: vi.fn().mockResolvedValue([]),
      $: vi.fn().mockResolvedValue(null),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as Browser;
  });

  it('identifies as "olx" portal', () => {
    expect(olxScraper.portal).toBe('olx');
  });

  it('scrapes valid OLX ad cards with full information', async () => {
    const mockCard = createMockCard({
      title: '  Remont mieszkań Szczecin  ',
      description: 'Kompleksowe wykończenia wnętrz, glazura, terakota',
      price: '4 500 zł',
      location: 'Szczecin, Śródmieście - dzisiaj 10:15',
      href: '/d/oferta/remont-mieszkan-szczecin-ID108H31.html',
      dataId: '108H31',
    });

    mockPage.$$.mockResolvedValueOnce([mockCard]);

    const results = await olxScraper.scrape(mockBrowser, defaultConfig);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      nativeId: '108H31',
      title: 'Remont mieszkań Szczecin',
      description: 'Kompleksowe wykończenia wnętrz, glazura, terakota',
      sourceUrl: 'https://www.olx.pl/d/oferta/remont-mieszkan-szczecin-ID108H31.html',
      sourcePortal: 'olx',
      category: 'construction',
      locationText: 'Szczecin, Śródmieście',
      price: 4500,
      contactInfo: null,
      publishedAt: null,
    });
  });

  it('extracts native ID from URL when data-id attribute is absent', async () => {
    const mockCard = createMockCard({
      title: 'Dekarz ze Szczecina',
      description: 'Krycie dachów papą i dachówką',
      price: 'do negocjacji',
      location: 'Szczecin, Prawobrzeże',
      href: 'https://www.olx.pl/d/oferta/dekarz-szczecin-ID918273.html',
    });

    mockPage.$$.mockResolvedValueOnce([mockCard]);

    const results = await olxScraper.scrape(mockBrowser, defaultConfig);

    expect(results[0].nativeId).toBe('918273');
    expect(results[0].price).toBeNull();
    expect(results[0].sourceUrl).toBe('https://www.olx.pl/d/oferta/dekarz-szczecin-ID918273.html');
  });

  it('rotates User-Agent headers across requests', async () => {
    mockPage.$$.mockResolvedValue([]);

    await olxScraper.scrape(mockBrowser, defaultConfig);

    expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalledWith({
      'User-Agent': 'Mozilla/5.0 Test-Agent-1',
    });
  });

  it('handles empty listing page gracefully without crashing', async () => {
    mockPage.$$.mockResolvedValueOnce([]);

    const results = await olxScraper.scrape(mockBrowser, defaultConfig);

    expect(results).toHaveLength(0);
    expect(mockPage.close).toHaveBeenCalled();
  });

  it('skips individual ad card when title is missing or empty', async () => {
    const invalidCard = createMockCard({
      title: '',
      description: 'Brak tytułu',
    });
    const validCard = createMockCard({
      title: 'Tynki maszynowe',
      description: 'Wykonujemy tynki gipsowe i cementowe',
      price: '30 zł',
      location: 'Szczecin',
      href: '/d/oferta/tynki-ID222.html',
    });

    mockPage.$$.mockResolvedValueOnce([invalidCard, validCard]);

    const results = await olxScraper.scrape(mockBrowser, defaultConfig);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Tynki maszynowe');
  });

  it('paginates to next page when nextPage element is present', async () => {
    const cardPage1 = createMockCard({
      title: 'Oferta Strona 1',
      href: '/d/oferta/strona1-ID111.html',
    });
    const cardPage2 = createMockCard({
      title: 'Oferta Strona 2',
      href: '/d/oferta/strona2-ID222.html',
    });

    mockPage.$$.mockResolvedValueOnce([cardPage1]).mockResolvedValueOnce([cardPage2]);

    // Page 1 has next page link, page 2 does not
    mockPage.$
      .mockResolvedValueOnce({ getAttribute: async () => '/next' })
      .mockResolvedValueOnce(null);

    const config: ScraperConfig = { ...defaultConfig, maxAdsPerPortal: 10 };
    const results = await olxScraper.scrape(mockBrowser, config);

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('Oferta Strona 1');
    expect(results[1].title).toBe('Oferta Strona 2');
    expect(mockPage.goto).toHaveBeenCalledTimes(2);
  });
});
