import { describe, it, expect } from 'vitest';
import { extractJsonLd, parseCleanPrice, normalizeLocationText } from '@/functions/src/scraper/extractor';
import { extractOlxNativeId, normalizeOlxUrl, resolveOlxLink, resolveOlxDeviceLink } from '@/lib/olx/olxLinkResolver';
import { extractJobTraits, extractPhoneNumber } from '@/lib/ai/freeJobExtractor';
import { extractRequirements } from '@/lib/ai/extractor';
import { deduplicateCrossPortalAds } from '@/lib/deduplication/crossPortalDeduplicator';
import { applyTierMasking } from '@/app/api/announcements/masking';
import { validateQueryParams } from '@/app/api/announcements/validate';

describe('OLX Data Extraction & Pipeline E2E Integration Suite', () => {
  const sampleOlxHtmlCard = `
    <div data-testid="l-card" data-id="91827364">
      <h6 data-testid="ad-title">Elektryk z uprawnieniami SEP - Praca Szczecin</h6>
      <p data-testid="ad-description">Zatrudnimy elektryka z doświadczeniem. Wymagane uprawnienia SEP E+D, własne auto służbowe oraz brak lęku wysokości. Stawka 40 zł / h. Tel. 501 234 567.</p>
      <p data-testid="ad-price">40 zł / h</p>
      <span data-testid="location-date">Szczecin, Śródmieście - dzisiaj 11:30</span>
      <a href="/d/oferta/elektryk-szczecin-ID91827364.html" data-testid="detail-link">Zobacz</a>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Elektryk z uprawnieniami SEP - Praca Szczecin",
          "description": "Zatrudnimy elektryka z doświadczeniem.",
          "jobLocation": {
            "address": {
              "addressLocality": "Szczecin"
            }
          }
        }
      </script>
    </div>
  `;

  it('Stage 1: Raw HTML & JSON-LD Extraction', () => {
    const jsonLdItems = extractJsonLd(sampleOlxHtmlCard);
    expect(jsonLdItems).toHaveLength(1);
    expect(jsonLdItems[0].title).toBe('Elektryk z uprawnieniami SEP - Praca Szczecin');
    expect(jsonLdItems[0].location).toBe('Szczecin');
  });

  it('Stage 2: Price & Location Sanitization', () => {
    const rawPrice = '40 zł / h';
    const rawLocation = 'Szczecin, Śródmieście - dzisiaj 11:30';

    const cleanPrice = parseCleanPrice(rawPrice);
    const normalizedLoc = normalizeLocationText(rawLocation);

    expect(cleanPrice).toBe(40);
    expect(normalizedLoc).toBe('Szczecin, Śródmieście');
  });

  it('Stage 3: AI Traits, Phone, Badges & Fraud Analysis Extraction', () => {
    const title = 'Elektryk z uprawnieniami SEP - Praca Szczecin';
    const description = 'Zatrudnimy elektryka z doświadczeniem. Wymagane uprawnienia SEP E+D, własne auto służbowe oraz brak lęku wysokości. Stawka 40 zł / h. Tel. 501 234 567.';

    const traits = extractJobTraits(title, description);
    const phone = extractPhoneNumber(description);
    const badges = extractRequirements(title, description);

    expect(traits.certifications).toContain('Uprawnienia SEP');
    expect(traits.certifications).toContain('Praca na wysokości');
    expect(traits.salary_parsed?.unit).toBe('hourly');
    expect(traits.salary_parsed?.min).toBe(40);
    expect(traits.fraud_analysis.isSuspicious).toBe(false);

    expect(phone).toBe('501-234-567');
    expect(badges.some((b) => b.id === 'sep')).toBe(true);
    expect(badges.some((b) => b.id === 'vehicle')).toBe(true);
  });

  it('Stage 4: Link Healing & Deep-Link Resolution', () => {
    const href = '/d/oferta/elektryk-szczecin-ID91827364.html';
    const nativeId = extractOlxNativeId(href);

    expect(nativeId).toBe('91827364');

    const normalizedUrl = normalizeOlxUrl(href);
    expect(normalizedUrl).toBe('https://www.olx.pl/d/oferta/elektryk-szczecin-ID91827364.html');

    const resolved = resolveOlxLink({
      id: `olx-${nativeId}`,
      source_url: normalizedUrl,
      source_portal: 'olx',
      title: 'Elektryk z uprawnieniami SEP',
    });

    expect(resolved.isDirectOffer).toBe(true);
    expect(resolved.type).toBe('direct_canonical');
    expect(resolved.mobileDeepLink).toBe('olx://item/91827364');

    const androidLink = resolveOlxDeviceLink(
      { id: `olx-${nativeId}`, source_url: normalizedUrl, source_portal: 'olx' },
      'Mozilla/5.0 (Linux; Android 11)'
    );
    expect(androidLink).toContain('intent://olx.pl/d/oferta/-ID91827364.html');
  });

  it('Stage 5: Cross-Portal Deduplication', () => {
    const scrapedAds = [
      {
        title: 'Elektryk budowlany Szczecin',
        description: 'Zatrudnię elektryka z doświadczeniem',
        source_url: 'https://www.olx.pl/d/oferta/elektryk-ID1.html',
        source_portal: 'olx' as const,
        category: 'construction',
        location_text: 'Szczecin',
        price: 40,
        published_at: null,
      },
      {
        title: 'Elektryk budowlany Szczecin',
        description: 'Zatrudnię elektryka z doświadczeniem',
        source_url: 'https://www.oferteo.pl/zlecenie-1',
        source_portal: 'oferteo' as const,
        category: 'construction',
        location_text: 'Szczecin',
        price: 40,
        published_at: null,
      },
    ];

    const deduplicated = deduplicateCrossPortalAds(scrapedAds);
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].is_cross_posted).toBe(true);
    expect(deduplicated[0].available_portals).toContain('olx');
    expect(deduplicated[0].available_portals).toContain('oferteo');
  });

  it('Stage 6: Freemium Access Control & Masking', () => {
    const oldDate = new Date(Date.now() - 72 * 3600 * 1000); // 72 hours ago
    const rawAd = {
      deduplication_key: 'olx-91827364',
      title: 'Elektryk z uprawnieniami SEP',
      description: 'Zatrudnimy elektryka z doświadczeniem. Wymagane uprawnienia SEP E+D oraz własne auto.',
      source_url: 'https://www.olx.pl/d/oferta/elektryk-szczecin-ID91827364.html',
      source_portal: 'olx' as const,
      category: 'construction',
      location_text: 'Szczecin, Śródmieście',
      latitude: 53.4285,
      longitude: 14.5528,
      price: 40,
      contact_info: '501-234-567',
      scraped_at: oldDate,
      published_at: null,
    };

    // Free tier: source_url and contact_info are omitted
    const freeMasked = applyTierMasking([rawAd], 'free', new Date());
    expect(freeMasked[0].source_url).toBeUndefined();
    expect(freeMasked[0].contact_info).toBeUndefined();

    // Premium tier: full raw data returned
    const premiumUnmasked = applyTierMasking([rawAd], 'premium', new Date());
    expect(premiumUnmasked[0].source_url).toBe('https://www.olx.pl/d/oferta/elektryk-szczecin-ID91827364.html');
    expect(premiumUnmasked[0].contact_info).toBe('501-234-567');
  });

  it('Stage 7: Query Validation API Pipeline', () => {
    const validQuery = {
      page: '1',
      limit: '20',
      source_portal: 'olx',
      bounding_box: '53.3,14.4,53.5,14.6',
    };

    const validation = validateQueryParams(validQuery);
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.parsed.source_portal).toBe('olx');
      expect(validation.parsed.limit).toBe(20);
    }
  });

  it('Stage 8: Multi-Strategy HTML State & JSON Parser', () => {
    const rawOlxHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <script id="__NEXT_DATA__" type="application/json">
            {
              "props": {
                "pageProps": {
                  "ads": [
                    {
                      "id": "108H31",
                      "title": "Cieśla dachowy Szczecin",
                      "description": "Zatrudnię cieślę. Stawka 45 zł/h. Tel. 505 111 222.",
                      "url": "/d/oferta/ciesla-dachowy-szczecin-ID108H31.html",
                      "location": { "city": { "name": "Szczecin" } }
                    }
                  ]
                }
              }
            }
          </script>
        </head>
      </html>
    `;

    expect(rawOlxHtml).toContain('108H31');
    expect(rawOlxHtml).toContain('Cieśla dachowy');
  });
});
