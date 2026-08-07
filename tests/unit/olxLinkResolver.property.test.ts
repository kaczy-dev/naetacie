import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { extractOlxNativeId, normalizeOlxUrl, resolveOlxLink } from '@/lib/olx/olxLinkResolver';

describe('OLX Link Resolver Property-Based Tests', () => {
  it('Property 1: extractOlxNativeId always extracts valid native ID string or null', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = extractOlxNativeId(input);
        if (result !== null) {
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThanOrEqual(3);
          expect(result).toMatch(/^[a-zA-Z0-9]+$/);
        }
      })
    );
  });

  it('Property 2: normalizeOlxUrl always produces valid https://www.olx.pl URL for olx links', () => {
    const olxUrlArb = fc
      .tuple(
        fc.constantFrom('http://', 'https://', '//', ''),
        fc.constantFrom('olx.pl', 'www.olx.pl', 'm.olx.pl'),
        fc.constantFrom('/d/oferta/', '/oferta/'),
        fc.stringMatching(/^[a-zA-Z0-9]{4,12}$/)
      )
      .map(([proto, host, path, id]) => `${proto}${host}${path}item-ID${id}.html`);

    fc.assert(
      fc.property(olxUrlArb, (raw) => {
        const normalized = normalizeOlxUrl(raw);
        expect(normalized).not.toBeNull();
        expect(normalized).toMatch(/^https:\/\/www\.olx\.pl\/d\/oferta\//);
      })
    );
  });

  it('Property 3: resolveOlxLink never throws and always returns a non-empty absolute URL', () => {
    const adArb = fc.record(
      {
        id: fc.option(fc.string(), { nil: undefined }),
        title: fc.option(fc.string(), { nil: undefined }),
        source_url: fc.option(fc.string(), { nil: undefined }),
        source_portal: fc.option(fc.constantFrom('olx', 'OLX', null), { nil: undefined }),
      },
      { requiredKeys: [] }
    );

    fc.assert(
      fc.property(adArb, (ad) => {
        const res = resolveOlxLink(ad);
        expect(res.url).toMatch(/^https:\/\/(www\.)?olx\.pl\//);
        expect(typeof res.isDirectOffer).toBe('boolean');
        expect(['direct_canonical', 'direct_id_reconstructed', 'category_search_fallback']).toContain(res.type);
      })
    );
  });
});
