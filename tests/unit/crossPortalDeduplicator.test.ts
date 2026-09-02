import { describe, it, expect } from 'vitest';
import {
  deduplicateCrossPortalAds,
  canonicalizeCompanyName,
  calculateDiceCoefficient,
  areAdsEquivalent,
} from '@/lib/deduplication/crossPortalDeduplicator';
import { ScrapedAd } from '@/lib/scraper/types';

describe('Cross-Portal Fuzzy Deduplicator & Entity Resolution 2.0', () => {
  describe('canonicalizeCompanyName', () => {
    it('strips Polish legal form suffixes and prefixes', () => {
      expect(canonicalizeCompanyName('Bud-Max Sp. z o.o.')).toBe('bud max');
      expect(canonicalizeCompanyName('F.H.U. Tech-Bud s.c.')).toBe('tech bud');
      expect(canonicalizeCompanyName('STRABAG Spółka z o.o.')).toBe('strabag');
      expect(canonicalizeCompanyName('ERBUD S.A.')).toBe('erbud');
    });
  });

  describe('calculateDiceCoefficient', () => {
    it('computes character bigram similarity accurately', () => {
      expect(calculateDiceCoefficient('murarz', 'murarz')).toBe(1.0);
      expect(calculateDiceCoefficient('murarz tynkarz', 'murarz-tynkarz')).toBeGreaterThan(0.9);
      expect(calculateDiceCoefficient('elektryk', 'malarz')).toBeLessThan(0.3);
    });
  });

  describe('areAdsEquivalent', () => {
    it('matches offers by identical verified phone number', () => {
      const ad1: ScrapedAd = {
        id: 'olx_1',
        title: 'Zatrudnię zbrojarza cieślę od zaraz',
        description: 'Szczecin Prawobrzeże',
        source_url: 'https://olx.pl/1',
        source_portal: 'olx',
        category: 'budowa',
        location_text: 'Szczecin',
        latitude: null,
        longitude: null,
        price: '40 zł/h',
        phone: '501-234-567',
        scraped_at: new Date().toISOString(),
        published_at: null,
        company: null,
        employment_type: null,
      };

      const ad2: ScrapedAd = {
        id: 'pracuj_2',
        title: 'Cieśla / Zbrojarz',
        description: 'Praca na budowie osiedla',
        source_url: 'https://pracuj.pl/2',
        source_portal: 'pracuj',
        category: 'budowa',
        location_text: 'Szczecin',
        latitude: null,
        longitude: null,
        price: null,
        phone: '+48 501 234 567',
        scraped_at: new Date().toISOString(),
        published_at: null,
        company: null,
        employment_type: null,
      };

      const result = areAdsEquivalent(ad1, ad2);
      expect(result.isMatch).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('deduplicateCrossPortalAds', () => {
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

    it('synthesizes richest attributes from multiple sources (photos, phone, salary)', () => {
      const rawAds: ScrapedAd[] = [
        {
          id: 'olx_3',
          title: 'Elektryk z uprawnieniami SEP',
          description: 'Krótki opis',
          source_url: 'https://olx.pl/el3',
          source_portal: 'olx',
          category: 'instalacje',
          location_text: 'Szczecin',
          latitude: 53.43,
          longitude: 14.55,
          price: null,
          phone: '601-999-888',
          photos: ['https://olx.pl/photo1.jpg', 'https://olx.pl/photo2.jpg'],
          scraped_at: new Date().toISOString(),
          published_at: null,
          company: 'Elektro-Szczecin Sp. z o.o.',
          employment_type: null,
        },
        {
          id: 'pracuj_3',
          title: 'Elektryk z uprawnieniami SEP',
          description: 'Bardzo szczegółowy opis wymagań i zakresu obowiązków na budowie',
          source_url: 'https://pracuj.pl/el3',
          source_portal: 'pracuj',
          category: 'instalacje',
          location_text: 'Szczecin',
          latitude: null,
          longitude: null,
          price: '6500–8500 zł/mies.',
          phone: null,
          photos: null,
          scraped_at: new Date().toISOString(),
          published_at: null,
          company: 'Elektro-Szczecin Sp. z o.o.',
          employment_type: 'Pełny etat',
        },
      ];

      const merged = deduplicateCrossPortalAds(rawAds);
      expect(merged.length).toBe(1);
      const unified = merged[0];

      expect(unified.phone).toBe('601-999-888');
      expect(unified.price).toBe('6500–8500 zł/mies.');
      expect(unified.photos?.length).toBe(2);
      expect(unified.description).toContain('Bardzo szczegółowy opis');
      expect(unified.employment_type).toBe('Pełny etat');
      expect(unified.latitude).toBe(53.43);
    });
  });
});
