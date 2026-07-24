/**
 * Structured Data & Element Extraction Engine for Scrapers.
 *
 * Provides robust JSON-LD, __NEXT_DATA__, and SSR state parsing alongside
 * fallback string/price sanitizers.
 */

export interface ParsedJsonLdAd {
  title?: string;
  description?: string;
  price?: number | null;
  location?: string;
  url?: string;
  image?: string;
  datePublished?: string;
}

/**
 * Extracts and parses structured JSON-LD objects from raw HTML strings or scripts.
 */
export function extractJsonLd(html: string): ParsedJsonLdAd[] {
  const results: ParsedJsonLdAd[] = [];
  const scriptRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const rawJson = match[1].trim();
      if (!rawJson) continue;

      const parsed = JSON.parse(rawJson);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        // Handles Product, Service, Offer, or JobPosting schema types
        if (
          item['@type'] === 'Product' ||
          item['@type'] === 'Service' ||
          item['@type'] === 'Offer' ||
          item['@type'] === 'JobPosting' ||
          item['@type'] === 'LocalBusiness'
        ) {
          const offer = item.offers ? (Array.isArray(item.offers) ? item.offers[0] : item.offers) : item;
          const priceVal = offer?.price ?? offer?.priceSpecification?.price ?? item.price;
          const numericPrice = typeof priceVal === 'number' ? priceVal : parseFloat(String(priceVal));

          results.push({
            title: item.name || item.title || item.headline,
            description: item.description,
            price: Number.isFinite(numericPrice) ? numericPrice : null,
            location: item.address?.addressLocality || item.jobLocation?.address?.addressLocality || item.areaServed?.name,
            url: item.url || offer?.url,
            image: Array.isArray(item.image) ? item.image[0] : item.image,
            datePublished: item.datePublished || item.validFrom,
          });
        }
      }
    } catch {
      // Ignore malformed JSON-LD scripts
    }
  }

  return results;
}

/**
 * Parses numeric PLN prices safely from dirty text strings (e.g. "1 500,00 zł", "1500 PLN", "do negocjacji").
 */
export function parseCleanPrice(priceText: string | null | undefined): number | null {
  if (!priceText) return null;

  const lower = priceText.toLowerCase().trim();
  const nonNumericKeywords = ['do negocjacji', 'zamienię', 'za darmo', 'bezpłatne', 'darmowe', 'zapytaj o cenę'];
  if (nonNumericKeywords.some((keyword) => lower.includes(keyword))) {
    return null;
  }

  const cleaned = priceText
    .replace(/\s+/g, '')
    .replace(/zł/gi, '')
    .replace(/PLN/gi, '')
    .replace(/,/g, '.');

  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const val = parseFloat(match[1]);
  return Number.isFinite(val) && val > 0 ? val : null;
}

/**
 * Normalizes location text by stripping dates, timestamps, and redundant whitespace.
 * e.g. "Szczecin, Niebuszewo - dzisiaj 14:30" -> "Szczecin, Niebuszewo"
 */
export function normalizeLocationText(locationRaw: string | null | undefined, fallback = 'Szczecin'): string {
  if (!locationRaw) return fallback;

  let text = locationRaw.trim();
  const dashIndex = text.indexOf(' - ');
  if (dashIndex > 0) {
    text = text.substring(0, dashIndex).trim();
  }

  // Strip trailing dates like "25 maja", "dzisiaj 12:00"
  text = text.replace(/-(?:\s*\d{1,2}\s+[a-ząęłńóśźż]+|\s*dzisiaj.*|\s*wczoraj.*)$/i, '').trim();

  return text || fallback;
}
