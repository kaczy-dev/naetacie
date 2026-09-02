/**
 * Apify REST API Client & Actor Orchestrator.
 * Connects to Apify Cloud to run scraping actors through Polish residential proxies
 * to reliably bypass Cloudflare, DataDome, and IP rate limits on OLX, Pracuj, and Indeed.
 */

import { ScrapedAd, SourcePortal } from '../types';
import { hashId, inferCategory, cleanText } from '../network';
import { extractPhoneNumber } from '@/lib/ai/freeJobExtractor';
import { parseStructuredSalary } from '../universalExtractor';
import {
  ApifyActorRunOptions,
  ApifyActorRunResponse,
  ApifyRawJobItem,
} from './types';

const APIFY_API_BASE = 'https://api.apify.com/v2';

export class ApifyClient {
  private readonly token: string | null;

  constructor(token?: string) {
    this.token = token || process.env.APIFY_API_TOKEN || null;
  }

  public isConfigured(): boolean {
    return Boolean(this.token && this.token.trim().length > 0);
  }

  /**
   * Triggers an Apify Actor run.
   * If `waitForFinish` is true, polls or waits up to `timeoutSecs`.
   */
  public async runActor(
    actorId: string,
    input: Record<string, unknown> = {},
    options: Omit<ApifyActorRunOptions, 'actorId' | 'input'> = {}
  ): Promise<ApifyActorRunResponse> {
    if (!this.token) {
      throw new Error('Apify API token is not configured (APIFY_API_TOKEN missing)');
    }

    const {
      memoryMbytes = 1024,
      timeoutSecs = 120,
      waitForFinish = false,
    } = options;

    const queryParams = new URLSearchParams({
      token: this.token,
      memory: String(memoryMbytes),
      timeout: String(timeoutSecs),
      ...(waitForFinish ? { waitForFinish: String(timeoutSecs) } : {}),
    });

    const url = `${APIFY_API_BASE}/acts/${encodeURIComponent(actorId)}/runs?${queryParams.toString()}`;

    // Default Polish residential proxy configuration if none specified
    const payload = {
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyCountry: 'PL',
      },
      ...input,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Apify Actor run failed [${res.status}]: ${errorText}`);
    }

    return (await res.json()) as ApifyActorRunResponse;
  }

  /**
   * Fetches dataset items by dataset ID.
   */
  public async getDatasetItems<T = Record<string, unknown>>(
    datasetId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<T[]> {
    if (!this.token) {
      throw new Error('Apify API token is not configured (APIFY_API_TOKEN missing)');
    }

    const { limit = 100, offset = 0 } = options;
    const queryParams = new URLSearchParams({
      token: this.token,
      limit: String(limit),
      offset: String(offset),
      clean: 'true',
      format: 'json',
    });

    const url = `${APIFY_API_BASE}/datasets/${encodeURIComponent(datasetId)}/items?${queryParams.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch Apify dataset [${res.status}]: ${errorText}`);
    }

    return (await res.json()) as T[];
  }

  /**
   * Normalizes arbitrary job items from Apify into our system's `ScrapedAd` type.
   */
  public normalizeItem(raw: ApifyRawJobItem, fallbackPortal: SourcePortal = 'olx'): ScrapedAd | null {
    const title = (raw.title || raw.jobTitle || '').trim();
    if (!title) return null;

    const rawUrl = raw.url || raw.sourceUrl || raw.link || '';
    const portal = (raw.sourcePortal || raw.portal || fallbackPortal) as SourcePortal;
    const sourceUrl = rawUrl || `https://www.google.com/search?q=${encodeURIComponent(title + ' Szczecin')}`;

    const rawDesc = raw.description || raw.content || '';
    const description = rawDesc
      ? cleanText(rawDesc).slice(0, 500)
      : cleanText(`${title} - Oferta pracy budowlanej w Szczecinie.`).slice(0, 300);

    const locationText = raw.location || raw.locationText || raw.city || 'Szczecin';
    const salaryRaw = raw.salary || raw.salaryText || (raw.price ? String(raw.price) : null);
    const salaryParsed = salaryRaw ? parseStructuredSalary(salaryRaw) : null;
    const salaryRange = salaryParsed ? salaryParsed.salaryRange : null;
    const phone = raw.phone || raw.phoneNumber || extractPhoneNumber(`${title} ${description}`);
    const publishedAt = raw.publishedAt || raw.createdAt || raw.date || new Date().toISOString();

    const id = raw.id ? String(raw.id) : hashId(sourceUrl || `${portal}-${title}`, portal);

    return {
      id,
      title,
      description,
      source_url: sourceUrl,
      source_portal: portal,
      category: inferCategory(title, description),
      location_text: locationText.toLowerCase().includes('szczecin')
        ? locationText
        : `Szczecin, ${locationText}`,
      latitude: null,
      longitude: null,
      price: salaryRaw,
      salary_range: salaryRange,
      phone,
      photos: raw.photos || raw.images || null,
      scraped_at: new Date().toISOString(),
      published_at: publishedAt,
      company: raw.company || raw.companyName || null,
      employment_type: raw.employmentType || 'Pełny etat',
      contract_type: raw.contractType || null,
    };
  }
}

/** Global singleton client */
export const defaultApifyClient = new ApifyClient();
