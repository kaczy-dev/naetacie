import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApifyClient } from '@/lib/scraper/apify/apifyClient';
import type { ApifyRawJobItem } from '@/lib/scraper/apify/types';

describe('Apify Integration Layer', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('correctly reports configuration status based on token', () => {
    const unconfigured = new ApifyClient('');
    expect(unconfigured.isConfigured()).toBe(false);

    const configured = new ApifyClient('apify_api_test_token_123');
    expect(configured.isConfigured()).toBe(true);
  });

  it('throws error on runActor if token is not configured', async () => {
    const client = new ApifyClient('');
    await expect(client.runActor('actor-id')).rejects.toThrow(/APIFY_API_TOKEN missing/);
  });

  it('sends correct residential proxy configuration and headers on runActor', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'run-123',
          actId: 'my-actor',
          status: 'RUNNING',
          startedAt: new Date().toISOString(),
          defaultDatasetId: 'dataset-456',
          defaultKeyValueStoreId: 'kvs-789',
        },
      }),
    });
    global.fetch = mockFetch;

    const client = new ApifyClient('token-xyz');
    const res = await client.runActor('my-actor', { search: 'murarz Szczecin' });

    expect(res.data.id).toBe('run-123');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('https://api.apify.com/v2/acts/my-actor/runs');
    expect(calledUrl).toContain('token=token-xyz');

    const body = JSON.parse(calledOptions.body);
    expect(body.search).toBe('murarz Szczecin');
    expect(body.proxyConfiguration).toEqual({
      useApifyProxy: true,
      apifyProxyCountry: 'PL',
    });
  });

  it('fetches dataset items cleanly with getDatasetItems', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { title: 'Murarz Szczecin', salary: '7000 zł' },
      ],
    });
    global.fetch = mockFetch;

    const client = new ApifyClient('token-xyz');
    const items = await client.getDatasetItems('dataset-abc', { limit: 50 });

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ title: 'Murarz Szczecin', salary: '7000 zł' });

    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('/datasets/dataset-abc/items');
    expect(calledUrl).toContain('clean=true');
  });

  it('normalizes arbitrary Apify items into ScrapedAd format', () => {
    const client = new ApifyClient('test-token');
    const raw: ApifyRawJobItem = {
      title: 'Cieśla szalunkowy Szczecin Pogodno',
      description: 'Zatrudnimy cieślę. Stawka 35 zł/h netto. Tel: 501 234 567. Szczecin',
      url: 'https://www.olx.pl/d/oferta/ciesla-szczecin-ID123.html',
      salary: '35 zł/h',
      phone: '501234567',
      location: 'Szczecin Pogodno',
      company: 'Budimex SA',
      sourcePortal: 'olx',
    };

    const normalized = client.normalizeItem(raw, 'olx');
    expect(normalized).not.toBeNull();
    expect(normalized?.title).toBe('Cieśla szalunkowy Szczecin Pogodno');
    expect(normalized?.source_portal).toBe('olx');
    expect(normalized?.price).toBe('35 zł/h');
    expect(normalized?.phone).toBe('501234567');
    expect(normalized?.company).toBe('Budimex SA');
    expect(normalized?.category).toBe('budowa');
  });
});
