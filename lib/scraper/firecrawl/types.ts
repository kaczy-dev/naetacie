/**
 * Firecrawl Scraper Types for Multi-Portal Job Aggregator.
 * Defines schemas for Firecrawl API v1 requests, structured LLM extraction,
 * markdown page crawls, and standardized construction job schemas.
 */

import { ScrapedAd, SourcePortal } from '../types';

export interface FirecrawlScrapeOptions {
  formats?: Array<'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'extract'>;
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  headers?: Record<string, string>;
  waitFor?: number;
  mobile?: boolean;
  timeout?: number;
  extract?: {
    schema?: Record<string, unknown>;
    systemPrompt?: string;
    prompt?: string;
  };
}

export interface FirecrawlScrapeResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    links?: string[];
    extract?: T;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL?: string;
      statusCode?: number;
      error?: string;
    };
  };
  error?: string;
}

export interface FirecrawlJobExtract {
  title?: string;
  description?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  location?: string;
  district?: string;
  phone?: string;
  company?: string;
  datePublished?: string;
  category?: 'budowa' | 'instalacje' | 'wykończenia';
  employmentType?: string;
  contractType?: string;
  skillsOrTools?: string[];
  isAvailable?: boolean;
}

export const CONSTRUCTION_JOB_EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Tytuł ogłoszenia lub zlecenia budowlanego' },
    description: { type: 'string', description: 'Szczegółowy opis zlecenia, zakres prac lub wymagania' },
    salary: { type: 'string', description: 'Wynagrodzenie lub budżet, np. 5000-8000 zł, 40 zł/h' },
    location: { type: 'string', description: 'Miasto lub dzielnica w Szczecinie / okolicach' },
    district: { type: 'string', description: 'Dzielnica Szczecina np. Pogodno, Gumieńce, Prawobrzeże' },
    phone: { type: 'string', description: 'Numer telefonu kontaktowego jeśli dostępny' },
    company: { type: 'string', description: 'Nazwa firmy lub zleceniodawcy' },
    datePublished: { type: 'string', description: 'Data publikacji w formacie ISO lub tekstowa' },
    category: {
      type: 'string',
      enum: ['budowa', 'instalacje', 'wykończenia'],
      description: 'Dopasowana kategoria budowlana',
    },
    employmentType: { type: 'string', description: 'Typ umowy np. B2B, zlecenie, o pracę' },
    isAvailable: { type: 'boolean', description: 'Czy ogłoszenie jest nadal aktualne' },
  },
  required: ['title'],
};
