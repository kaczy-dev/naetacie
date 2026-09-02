/**
 * Universal Semantic HTML & Structured Metadata Extractor for Web Scrapers.
 *
 * Provides a unified extraction layer combining:
 * 1. Schema.org JSON-LD (JobPosting, Offer, Product, LocalBusiness)
 * 2. Embedded SSR State (__NEXT_DATA__, __PRERENDERED_STATE__, __INITIAL_STATE__)
 * 3. OpenGraph / Twitter metadata tags
 * 4. Microdata & Semantic HTML Fallback
 */

import { cleanHtml, cleanText, decodeHtmlEntities } from './network';
import { SalaryRange } from './types';

export interface UniversalJobMetadata {
  title: string;
  description: string;
  company: string | null;
  location: string | null;
  url: string | null;
  price: string | null;
  salaryRange: SalaryRange | null;
  employmentType: string | null;
  datePublished: string | null;
  image: string | null;
  rawJsonLd?: Record<string, unknown>;
}

/**
 * Parses Schema.org baseSalary / priceSpecification object into structured SalaryRange and text.
 */
export function parseStructuredSalary(salaryObj: unknown): { priceText: string | null; salaryRange: SalaryRange | null } {
  if (!salaryObj || typeof salaryObj !== 'object') return { priceText: null, salaryRange: null };

  const s = salaryObj as Record<string, unknown>;
  const val = s.value ?? s.price ?? s.amount;
  const currency = String(s.currency || s.priceCurrency || (typeof val === 'object' && val ? (val as Record<string, unknown>).currency : null) || 'PLN').toUpperCase() as 'PLN' | 'EUR';
  
  const nestedUnit = typeof val === 'object' && val !== null ? (val as Record<string, unknown>).unitText || (val as Record<string, unknown>).unitCode : null;
  const unitText = String(s.unitText || s.unitCode || nestedUnit || 'MONTH').toUpperCase();
  const isHourly = unitText.includes('HOUR') || unitText === 'HUR';
  const salaryType = isHourly ? 'hourly' : 'monthly';

  let min: number | null = null;
  let max: number | null = null;

  if (typeof val === 'object' && val !== null) {
    const qVal = val as Record<string, unknown>;
    min = qVal.minValue != null ? Number(qVal.minValue) : qVal.value != null ? Number(qVal.value) : null;
    max = qVal.maxValue != null ? Number(qVal.maxValue) : min;
  } else if (typeof val === 'number' || typeof val === 'string') {
    const num = Number(val);
    if (Number.isFinite(num) && num > 0) {
      min = num;
      max = num;
    }
  }

  if (s.minValue != null) min = Number(s.minValue);
  if (s.maxValue != null) max = Number(s.maxValue);

  if (min == null && max == null) return { priceText: null, salaryRange: null };

  const curSymbol = currency === 'EUR' ? '€' : 'zł';
  const unitSuffix = isHourly ? '/h' : '/mies.';
  const priceText =
    min != null && max != null && min !== max
      ? `${min}–${max} ${curSymbol}${unitSuffix}`
      : `${min ?? max} ${curSymbol}${unitSuffix}`;

  return {
    priceText,
    salaryRange: {
      min,
      max,
      currency: currency === 'EUR' ? 'EUR' : 'PLN',
      type: salaryType,
      isGross: true,
      raw: priceText,
    },
  };
}

/**
 * Extracts and recursively normalizes all Schema.org JSON-LD job postings or offers from HTML.
 */
export function extractJsonLdJobs(html: string): UniversalJobMetadata[] {
  const results: UniversalJobMetadata[] = [];
  const scriptRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const rawJson = match[1].trim();
      if (!rawJson) continue;

      const parsed = JSON.parse(rawJson);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const root of items) {
        const nodes: Record<string, unknown>[] = root['@graph']
          ? Array.isArray(root['@graph'])
            ? root['@graph']
            : [root['@graph']]
          : [root];

        for (const item of nodes) {
          if (!item || typeof item !== 'object') continue;

          const type = String(item['@type'] || '');
          if (
            type === 'JobPosting' ||
            type === 'Offer' ||
            type === 'Product' ||
            type === 'Service' ||
            type === 'LocalBusiness'
          ) {
            const title = String(item.title || item.name || item.headline || '').trim();
            if (!title) continue;

            const descRaw = String(item.description || item.articleBody || '');
            const description = cleanHtml(descRaw);

            // Organization / Employer
            let company: string | null = null;
            if (item.hiringOrganization && typeof item.hiringOrganization === 'object') {
              company = String((item.hiringOrganization as Record<string, unknown>).name || '') || null;
            } else if (item.author && typeof item.author === 'object') {
              company = String((item.author as Record<string, unknown>).name || '') || null;
            }

            // Location
            let location: string | null = null;
            const jobLoc = item.jobLocation || item.address || item.areaServed;
            if (jobLoc && typeof jobLoc === 'object') {
              const locObj = jobLoc as Record<string, unknown>;
              const addr = locObj.address && typeof locObj.address === 'object' ? (locObj.address as Record<string, unknown>) : locObj;
              location = String(addr.addressLocality || addr.addressRegion || addr.name || '') || null;
            }

            // Salary / Price
            const offer = item.offers ? (Array.isArray(item.offers) ? item.offers[0] : item.offers) : item;
            const salaryCandidate = item.baseSalary || offer?.priceSpecification || offer?.price;
            const { priceText, salaryRange } = parseStructuredSalary(salaryCandidate);

            // Image
            let image: string | null = null;
            if (item.image) {
              image = Array.isArray(item.image) ? String(item.image[0]) : String(item.image);
            }

            // Employment Type
            let employmentType: string | null = null;
            if (item.employmentType) {
              employmentType = Array.isArray(item.employmentType)
                ? item.employmentType.join(', ')
                : String(item.employmentType);
            }

            const datePublished = String(item.datePosted || item.validFrom || item.datePublished || '') || null;
            const url = String(item.url || offer?.url || '') || null;

            results.push({
              title: decodeHtmlEntities(title),
              description,
              company: company ? decodeHtmlEntities(company) : null,
              location: location ? decodeHtmlEntities(location) : null,
              url,
              price: priceText,
              salaryRange,
              employmentType,
              datePublished,
              image,
              rawJsonLd: item,
            });
          }
        }
      }
    } catch {
      // ignore JSON parse errors in malformed script tags
    }
  }

  return results;
}

/**
 * Extracts OpenGraph and Meta tags as fallback metadata.
 */
export function extractOpenGraphMetadata(html: string): Partial<UniversalJobMetadata> {
  const getTag = (prop: string): string | null => {
    const rx = new RegExp(`<meta\\s+[^>]*(?:property|name)=["'](?:og:|twitter:)?${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
    const m = html.match(rx);
    return m ? decodeHtmlEntities(m[1].trim()) : null;
  };

  const title = getTag('title');
  const description = getTag('description');
  const url = getTag('url');
  const image = getTag('image');
  const siteName = getTag('site_name');

  return {
    title: title || undefined,
    description: description ? cleanText(description) : undefined,
    url: url || undefined,
    image: image || undefined,
    company: siteName || undefined,
  };
}

/**
 * Extracts embedded Next.js or Nuxt.js SSR JSON state.
 */
export function extractNextDataState(html: string): Record<string, unknown> | null {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!match || !match[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}
