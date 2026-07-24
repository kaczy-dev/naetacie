import { describe, it, expect } from 'vitest';
import { extractJsonLd, parseCleanPrice, normalizeLocationText } from './extractor';

describe('Scraper Extractor Engine', () => {
  it('extracts structured JSON-LD service/product offers from HTML', () => {
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
  });

  it('parses dirty price strings correctly', () => {
    expect(parseCleanPrice('1 500,50 zł')).toBe(1500.5);
    expect(parseCleanPrice('3500 PLN')).toBe(3500);
    expect(parseCleanPrice('do negocjacji')).toBeNull();
    expect(parseCleanPrice(null)).toBeNull();
  });

  it('normalizes location text removing timestamps and date suffixes', () => {
    expect(normalizeLocationText('Szczecin, Centrum - dzisiaj 14:20')).toBe('Szczecin, Centrum');
    expect(normalizeLocationText('Szczecin, Prawobrzeże - 12 maja')).toBe('Szczecin, Prawobrzeże');
    expect(normalizeLocationText(null)).toBe('Szczecin');
  });
});
