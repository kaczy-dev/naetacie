import { describe, it, expect } from 'vitest';
import { extractJsonLd, parseCleanPrice, normalizeLocationText } from './extractor';

describe('Scraper Extractor Engine', () => {
  describe('extractJsonLd', () => {
    it('extracts structured Product JSON-LD offers from HTML', () => {
      const sampleHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Remont Łazienki Szczecin",
                "description": "Profesjonalne wykończenia i glazura",
                "offers": {
                  "@type": "Offer",
                  "price": "4500",
                  "priceCurrency": "PLN"
                }
              }
            </script>
          </head>
        </html>
      `;

      const items = extractJsonLd(sampleHtml);
      expect(items.length).toBe(1);
      expect(items[0].title).toBe('Remont Łazienki Szczecin');
      expect(items[0].price).toBe(4500);
      expect(items[0].description).toBe('Profesjonalne wykończenia i glazura');
    });

    it('extracts JobPosting JSON-LD schemas from HTML', () => {
      const sampleHtml = `
        <script type="application/ld+json">
          {
            "@type": "JobPosting",
            "title": "Elektryk z uprawnieniami SEP",
            "description": "Praca w Szczecinie od zaraz",
            "jobLocation": {
              "address": {
                "addressLocality": "Szczecin"
              }
            },
            "baseSalary": {
              "value": 7500
            }
          }
        </script>
      `;

      const items = extractJsonLd(sampleHtml);
      expect(items.length).toBe(1);
      expect(items[0].title).toBe('Elektryk z uprawnieniami SEP');
      expect(items[0].location).toBe('Szczecin');
    });

    it('handles multiple JSON-LD scripts and arrays of items', () => {
      const sampleHtml = `
        <script type="application/ld+json">
          [
            { "@type": "Service", "name": "Usługa 1", "price": 100 },
            { "@type": "LocalBusiness", "name": "Usługa 2", "price": 200 }
          ]
        </script>
      `;

      const items = extractJsonLd(sampleHtml);
      expect(items.length).toBe(2);
      expect(items[0].title).toBe('Usługa 1');
      expect(items[1].title).toBe('Usługa 2');
    });

    it('ignores invalid or non-matching script types gracefully', () => {
      const sampleHtml = `
        <script type="application/ld+json">
          { "invalid_json": 
        </script>
        <script type="application/ld+json">
          { "@type": "Organization", "name": "Firma Sp. z o.o." }
        </script>
      `;

      const items = extractJsonLd(sampleHtml);
      expect(items).toEqual([]);
    });
  });

  describe('parseCleanPrice', () => {
    it('parses dirty price strings correctly into PLN numbers', () => {
      expect(parseCleanPrice('1 500,50 zł')).toBe(1500.5);
      expect(parseCleanPrice('3500 PLN')).toBe(3500);
      expect(parseCleanPrice('  12 000,00 zł / mc  ')).toBe(12000);
      expect(parseCleanPrice('50 zł / godz.')).toBe(50);
    });

    it('returns null for non-numeric phrases (do negocjacji, za darmo, etc.)', () => {
      expect(parseCleanPrice('do negocjacji')).toBeNull();
      expect(parseCleanPrice('za darmo')).toBeNull();
      expect(parseCleanPrice('zamienię')).toBeNull();
      expect(parseCleanPrice('bezpłatne')).toBeNull();
      expect(parseCleanPrice('zapytaj o cenę')).toBeNull();
    });

    it('returns null for empty or invalid inputs', () => {
      expect(parseCleanPrice(null)).toBeNull();
      expect(parseCleanPrice(undefined)).toBeNull();
      expect(parseCleanPrice('')).toBeNull();
      expect(parseCleanPrice('brak ceny')).toBeNull();
    });
  });

  describe('normalizeLocationText', () => {
    it('normalizes location text removing timestamps and date suffixes', () => {
      expect(normalizeLocationText('Szczecin, Centrum - dzisiaj 14:20')).toBe('Szczecin, Centrum');
      expect(normalizeLocationText('Szczecin, Prawobrzeże - 12 maja')).toBe('Szczecin, Prawobrzeże');
      expect(normalizeLocationText('Szczecin, Niebuszewo - wczoraj 18:45')).toBe('Szczecin, Niebuszewo');
    });

    it('returns fallback for null or empty strings', () => {
      expect(normalizeLocationText(null)).toBe('Szczecin');
      expect(normalizeLocationText(undefined)).toBe('Szczecin');
      expect(normalizeLocationText('')).toBe('Szczecin');
    });
  });
});
