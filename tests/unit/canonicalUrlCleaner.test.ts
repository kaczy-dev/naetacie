import { describe, it, expect } from 'vitest';
import { cleanCanonicalUrl, extractPortalOfferId } from '@/lib/scraper/canonicalUrlCleaner';

describe('Canonical URL Cleaner & Portal ID Extractor', () => {
  it('strips tracking UTM parameters, fbclid, and gclid', () => {
    const dirtyUrl =
      'https://www.olx.pl/d/oferta/tynkarz-szczecin-CID4-ID123xyz.html?utm_source=facebook&utm_medium=cpc&fbclid=IwAR123#gallery';
    const clean = cleanCanonicalUrl(dirtyUrl);
    expect(clean).toBe('https://www.olx.pl/d/oferta/tynkarz-szczecin-CID4-ID123xyz.html');
  });

  it('normalizes mobile subdomains to www', () => {
    const mobileUrl = 'http://m.olx.pl/d/oferta/murarz-ID999.html?isPreviewActive=0';
    const clean = cleanCanonicalUrl(mobileUrl);
    expect(clean).toBe('https://www.olx.pl/d/oferta/murarz-ID999.html');
  });

  it('extracts native portal IDs accurately across major portals', () => {
    expect(
      extractPortalOfferId('https://www.olx.pl/d/oferta/glazurnik-CID4-IDaBcDe.html')
    ).toBe('olx_aBcDe');

    expect(
      extractPortalOfferId('https://www.pracuj.pl/praca/kierownik-budowy-szczecin,oferta,98765432')
    ).toBe('pracuj_98765432');

    expect(
      extractPortalOfferId('https://pl.indeed.com/viewjob?jk=abcdef0123456789')
    ).toBe('indeed_abcdef0123456789');

    expect(
      extractPortalOfferId('https://www.oferteo.pl/zlecenia/11223344')
    ).toBe('oferteo_11223344');

    expect(
      extractPortalOfferId('https://fixly.pl/zlecenie/556677')
    ).toBe('fixly_556677');
  });
});
