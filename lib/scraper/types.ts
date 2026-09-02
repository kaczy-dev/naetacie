/**
 * Shared Scraper Types for Multi-Portal Construction Job Aggregator.
 * Supports OLX, Pracuj.pl, Indeed, Jooble, GoWork, Oferteo, and Fixly.
 */

export type SourcePortal =
  | 'olx'
  | 'pracuj'
  | 'indeed'
  | 'jooble'
  | 'gowork'
  | 'oferteo'
  | 'fixly'
  | 'bip_szczecin'
  | 'facebook_group';
export type JobCategory = 'budowa' | 'instalacje' | 'wykończenia';

export type ConstructionUnit =
  | 'monthly'
  | 'hourly'
  | 'daily'
  | 'project'
  | 'piecework'
  | 'm2'
  | 'mb'
  | 'point';

export type TaxRateMode = 'netto' | 'brutto' | 'b2b_netto' | 'na_reke';

export type EmployerClassification = 'direct_investor' | 'contractor' | 'agency';

/**
 * Structured salary range for precise filtering, sorting, and market analysis.
 * Enhanced for construction industry units (m², mb, punkt, dniówka, netto/brutto).
 */
export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: 'PLN' | 'EUR' | 'USD' | 'GBP';
  type: ConstructionUnit;
  isGross: boolean;
  raw: string;
  unitLabel?: string; // e.g. 'zł/m²', 'zł/mb', 'zł/punkt', 'zł/dzień'
  rateMode?: TaxRateMode;
  estimatedMonthlyEquivalent?: number | null;
  normalizedMonthlyMin?: number | null;
  normalizedMonthlyMax?: number | null;
}

export interface ScrapedAd {
  id: string;
  title: string;
  description: string;
  source_url: string;
  source_portal: SourcePortal;
  category: JobCategory;
  location_text: string;
  district?: string | null;
  latitude: number | null;
  longitude: number | null;
  price: string | null;
  salary_range?: SalaryRange | null;
  phone?: string | null;
  photos?: string[] | null;
  scraped_at: string;
  published_at: string | null;
  company: string | null;
  employer_type?: EmployerClassification | null;
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

export interface PortalScraperPlugin {
  readonly id: SourcePortal;
  readonly name: string;
  readonly defaultConcurrency?: number;
  scrape(options: PortalScraperOptions): Promise<ScrapedAd[]>;
}

/**
 * Extended construction trade search keywords.
 * Includes traditional trades, modern specializations, and heavy equipment.
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
  'glazurnik',
  'tynkarz',
  'zbrojarz',
  'operator koparki',
  'monter płyt g-k',
  'monter klimatyzacji',
  'monter pomp ciepła',
  'monter fotowoltaiki',
  'posadzkarz',
] as const;
