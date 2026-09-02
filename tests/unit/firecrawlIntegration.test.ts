import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FirecrawlClient } from '@/lib/scraper/firecrawl/firecrawlClient';
import {
  scrapeOferteoWithFirecrawl,
  scrapeFixlyWithFirecrawl,
} from '@/lib/scraper/firecrawl/firecrawlScraper';

describe('Firecrawl Integration Layer', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reports configuration status accurately', () => {
    const unconfigured = new FirecrawlClient('');
    expect(unconfigured.isConfigured()).toBe(false);

    const configured = new FirecrawlClient('fc-test-key-999');
    expect(configured.isConfigured()).toBe(true);
  });

  it('handles scrape errors properly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized API key',
    });
    global.fetch = mockFetch;

    const client = new FirecrawlClient('invalid-key');
    const result = await client.scrape('https://example.com');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Firecrawl API error [401]');
  });

  it('extracts structured construction job listing via Firecrawl AI extract', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          extract: {
            title: 'Zlecenie: Wykonanie instalacji elektrycznej w domku jednorodzinnym',
            description: 'Szukam elektryka z uprawnieniami SEP do położenia instalacji w Szczecinie na Warszewie.',
            salary: '6000-8000 zł',
            district: 'Warszewo',
            phone: '602111222',
            company: 'Prywatny Inwestor',
            category: 'instalacje',
            employmentType: 'B2B / Zlecenie',
          },
          metadata: {
            sourceURL: 'https://www.oferteo.pl/zlecenia-budowlane/zlecenie-1',
          },
        },
      }),
    });
    global.fetch = mockFetch;

    const client = new FirecrawlClient('valid-key');
    const ad = await client.extractJobListing(
      'https://www.oferteo.pl/zlecenia-budowlane/zlecenie-1',
      'oferteo'
    );

    expect(ad).not.toBeNull();
    expect(ad?.title).toContain('Wykonanie instalacji elektrycznej');
    expect(ad?.category).toBe('instalacje');
    expect(ad?.location_text).toContain('Warszewo');
    expect(ad?.phone).toBe('602111222');
    expect(ad?.price).toBe('6000-8000 zł');
  });

  it('falls back to local stealth scraper if Firecrawl is unconfigured', async () => {
    const unconfiguredClient = new FirecrawlClient('');
    // Calling scrapeOferteoWithFirecrawl should gracefully invoke fallback
    const ads = await scrapeOferteoWithFirecrawl({ query: 'elektryk' }, unconfiguredClient);
    expect(Array.isArray(ads)).toBe(true);
  });
});
