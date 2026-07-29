/**
 * Shared Scraper Types for Multi-Portal Construction Job Aggregator.
 * Supports OLX, Pracuj.pl, and Indeed.
 */

export type SourcePortal = 'olx' | 'pracuj' | 'indeed';
export type JobCategory = 'budowa' | 'instalacje' | 'wykończenia';

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
  scraped_at: string;
  published_at: string | null;
  company: string | null;
  employment_type: string | null;
}

export interface PortalScraperOptions {
  query?: string;
  limit?: number;
  offset?: number;
}

export interface PortalScraperResult {
  portal: SourcePortal;
  ads: ScrapedAd[];
  error?: string;
  durationMs: number;
}

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
] as const;
