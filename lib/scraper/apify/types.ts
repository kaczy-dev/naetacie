/**
 * Apify Integration Types for Multi-Portal Job Aggregator.
 * Defines schemas for Apify Actor runs, dataset items, webhook payloads,
 * and residential proxy configuration for Polish job portals.
 */

import { SourcePortal, ScrapedAd } from '../types';

export interface ApifyProxyConfig {
  useApifyProxy?: boolean;
  apifyProxyGroups?: string[];
  apifyProxyCountry?: string; // e.g. 'PL' for Poland residential/datacenter
}

export interface ApifyActorRunOptions {
  actorId: string;
  token?: string;
  input?: Record<string, unknown>;
  memoryMbytes?: number;
  timeoutSecs?: number;
  waitForFinish?: boolean;
}

export interface ApifyActorRunResponse {
  data: {
    id: string;
    actId: string;
    status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED';
    startedAt: string;
    finishedAt?: string;
    defaultDatasetId: string;
    defaultKeyValueStoreId: string;
  };
}

export interface ApifyWebhookPayload {
  userId?: string;
  createdAt?: string;
  eventType?: 'ACTOR.RUN.SUCCEEDED' | 'ACTOR.RUN.FAILED' | 'ACTOR.RUN.ABORTED' | 'ACTOR.RUN.TIMED_OUT';
  eventData?: {
    actorId?: string;
    actorRunId?: string;
  };
  resource?: {
    id?: string;
    actId?: string;
    status?: string;
    defaultDatasetId?: string;
  };
  // Optional direct items payload if Apify Actor is configured to push dataset directly
  items?: Record<string, unknown>[];
}

export interface ApifyRawJobItem {
  id?: string | number;
  url?: string;
  sourceUrl?: string;
  link?: string;
  title?: string;
  jobTitle?: string;
  description?: string;
  content?: string;
  company?: string;
  companyName?: string;
  location?: string;
  locationText?: string;
  city?: string;
  salary?: string;
  salaryText?: string;
  price?: string | number;
  phone?: string;
  phoneNumber?: string;
  publishedAt?: string;
  createdAt?: string;
  date?: string;
  portal?: string;
  sourcePortal?: SourcePortal;
  employmentType?: string;
  contractType?: string;
  photos?: string[];
  images?: string[];
}
