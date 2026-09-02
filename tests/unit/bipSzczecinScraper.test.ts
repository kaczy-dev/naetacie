import { describe, it, expect } from 'vitest';
import { scrapeBipSzczecin } from '@/lib/scraper/portals/bipSzczecinScraper';

describe('BIP Szczecin Public Tenders Scraper', () => {
  it('scrapes public municipal construction and renovation tenders in Szczecin', async () => {
    const tenders = await scrapeBipSzczecin({ limit: 10 });
    expect(tenders.length).toBeGreaterThanOrEqual(3);

    const first = tenders[0];
    expect(first.source_portal).toBe('bip_szczecin');
    expect(first.location_text).toContain('Szczecin');
    expect(first.employer_type).toBe('contractor');
    expect(first.employment_type).toContain('Przetarg');
    expect(first.source_url).toContain('szczecin');
  });

  it('filters public tenders by query keyword', async () => {
    const tenders = await scrapeBipSzczecin({ query: 'ZDiTM' });
    expect(tenders.length).toBeGreaterThanOrEqual(1);
    expect(tenders[0].title).toContain('ZDiTM');
  });
});
