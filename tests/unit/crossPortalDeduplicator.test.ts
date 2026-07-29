import { describe, it, expect } from 'vitest';
import { deduplicateCrossPortalAds } from '@/lib/deduplication/crossPortalDeduplicator';
import { ScrapedAd } from '@/lib/scraper/types';

describe('Cross-Portal Fuzzy Deduplicator', () => {
  it('merges identical job postings from OLX and Pracuj.pl', () => {
    const rawAds: ScrapedAd[] = [
      {
        id: 'olx_1',
        title: 'Murarz Tynkarz Szczecin Gumieńce',
        description: 'Budowa osiedla',
        source_url: 'https://www.olx.pl/d/oferta/murarz-ID1.html',
        source_portal: 'olx',
        category: 'budowa',
        location_text: 'Szczecin',
        latitude: 53.39,
        longitude: 14.5,
        price: '7000 zł',
        scraped_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        company: 'BudMax Sp z o o',
        employment_type: 'Umowa o pracę',
      },
      {
        id: 'pracuj_2',
        title: 'Murarz-Tynkarz Szczecin Gumieńce',
        description: 'Budowa osiedla mieszkaniowego',
        source_url: 'https://www.pracuj.pl/praca/murarz,oferta,2',
        source_portal: 'pracuj',
        category: 'budowa',
        location_text: 'Szczecin',
        latitude: 53.39,
        longitude: 14.5,
        price: '7000 zł',
        scraped_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        company: 'BudMax Sp z o o',
        employment_type: 'Umowa o pracę',
      },
    ];

    const merged = deduplicateCrossPortalAds(rawAds);

    expect(merged.length).toBe(1);
    expect(merged[0].is_cross_posted).toBe(true);
    expect(merged[0].available_portals).toContain('olx');
    expect(merged[0].available_portals).toContain('pracuj');
    expect(merged[0].source_urls.olx).toBe('https://www.olx.pl/d/oferta/murarz-ID1.html');
    expect(merged[0].source_urls.pracuj).toBe('https://www.pracuj.pl/praca/murarz,oferta,2');
  });
});
