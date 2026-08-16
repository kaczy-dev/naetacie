/**
 * Shared Scraper Types for Multi-Portal Construction Job Aggregator.
 * Supports OLX, Pracuj.pl, Indeed, Jooble, and GoWork.
 */

export type SourcePortal = 'olx' | 'pracuj' | 'indeed' | 'jooble' | 'gowork' | 'oferteo' | 'fixly';
export type JobCategory = 'budowa' | 'instalacje' | 'wykończenia';

/**
 * Structured salary range for precise filtering and market analysis.
 */
export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: 'PLN' | 'EUR';
  type: 'monthly' | 'hourly' | 'daily' | 'project';
  isGross: boolean;
  raw: string;
}

export interface ScrapedAd {
  id: string;
  title: string;
  description: string;
  source_url: string;
  source_portal: SourcePortal;
  category: JobCategory;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  price: string | null;
  salary_range?: SalaryRange | null;
  phone?: string | null;
  scraped_at: string;
  published_at: string | null;
  company: string | null;
  employment_type: string | null;
  experience_level?: string | null;
  work_schedule?: string | null;
  contract_type?: string | null;
}

export interface PortalScraperOptions {
  query?: string;
  limit?: number;
  offset?: number;
  deepScrape?: boolean;
  maxDeepPages?: number;
}

export interface PortalScraperResult {
  portal: SourcePortal;
  ads: ScrapedAd[];
  error?: string;
  durationMs: number;
}

/**
 * Extended construction trade search keywords.
 * Includes traditional trades and modern specializations.
 */
export const SEARCH_TRADES = [
  'murarz',
  'elektryk',
  'hydraulik',
  'malarz',
  'dekarz',
  'brukarz',
  'monter instalacji',
  'pracownik budowlany',
  'spawacz',
  'cieśla',
  'blacharz',
  'izolator',
  'operator dźwigu',
  'kierownik budowy',
  'geodeta',
  'stolarz',
] as const;
