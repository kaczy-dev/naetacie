/**
 * Firecrawl REST API Client.
 * Connects to Firecrawl to perform structured, LLM-driven web scraping
 * that immune to CSS selector breakages and handles complex JavaScript pages.
 */

import {
  FirecrawlScrapeOptions,
  FirecrawlScrapeResponse,
  FirecrawlJobExtract,
  CONSTRUCTION_JOB_EXTRACT_SCHEMA,
} from './types';
import { ScrapedAd, SourcePortal } from '../types';
import { hashId, inferCategory, cleanText } from '../network';
import { extractPhoneNumber } from '@/lib/ai/freeJobExtractor';
import { parseStructuredSalary } from '../universalExtractor';

export class FirecrawlClient {
  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || null;
    this.baseUrl =
      baseUrl || process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev/v1';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Scrapes a URL using Firecrawl API v1.
   */
  public async scrape<T = Record<string, unknown>>(
    url: string,
    options: FirecrawlScrapeOptions = {}
  ): Promise<FirecrawlScrapeResponse<T>> {
    if (!this.apiKey) {
      throw new Error('Firecrawl API key is not configured (FIRECRAWL_API_KEY missing)');
    }

    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/scrape`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: options.formats || ['markdown', 'extract'],
        onlyMainContent: options.onlyMainContent ?? true,
        waitFor: options.waitFor ?? 1000,
        timeout: options.timeout ?? 30000,
        extract: options.extract,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `Firecrawl API error [${res.status}]: ${errText}`,
      };
    }

    return (await res.json()) as FirecrawlScrapeResponse<T>;
  }

  /**
   * Directly extracts structured construction job parameters from an ad URL
   * using Firecrawl's AI extraction schema.
   */
  public async extractJobListing(
    url: string,
    sourcePortal: SourcePortal = 'oferteo'
  ): Promise<ScrapedAd | null> {
    if (!this.isConfigured()) return null;

    try {
      const response = await this.scrape<FirecrawlJobExtract>(url, {
        formats: ['extract', 'markdown'],
        extract: {
          schema: CONSTRUCTION_JOB_EXTRACT_SCHEMA,
          prompt:
            'Extract construction job or renovation order information accurately from this page in Polish.',
        },
      });

      if (!response.success || !response.data?.extract) {
        return null;
      }

      const extracted = response.data.extract;
      const title = cleanText(extracted.title || response.data.metadata?.title || '');
      if (!title) return null;

      const rawDesc = cleanText(extracted.description || response.data.markdown || '');
      const description = rawDesc.slice(0, 500);

      const locationText = extracted.district
        ? `Szczecin, ${extracted.district}`
        : extracted.location || 'Szczecin';

      const salaryRaw = extracted.salary || null;
      const phone =
        extracted.phone ||
        extractPhoneNumber(`${title} ${description}`) ||
        null;

      return {
        id: hashId(url, sourcePortal),
        title,
        description,
        source_url: url,
        source_portal: sourcePortal,
        category: extracted.category || inferCategory(title, description),
        location_text: locationText.toLowerCase().includes('szczecin')
          ? locationText
          : `Szczecin, ${locationText}`,
        district: extracted.district || null,
        latitude: null,
        longitude: null,
        price: salaryRaw,
        salary_range: salaryRaw ? parseStructuredSalary(salaryRaw).salaryRange : null,
        phone,
        scraped_at: new Date().toISOString(),
        published_at: extracted.datePublished || new Date().toISOString(),
        company: extracted.company || null,
        employment_type: extracted.employmentType || 'Zlecenie / B2B',
      };
    } catch (err) {
      console.warn(`Firecrawl extractJobListing failed for ${url}:`, (err as Error).message);
      return null;
    }
  }
}

/** Global singleton Firecrawl client */
export const defaultFirecrawlClient = new FirecrawlClient();
