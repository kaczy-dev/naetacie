import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/webhooks/apify/route';
import { processApifyWebhook } from '@/lib/scraper/apify/webhookHandler';
import { ApifyClient } from '@/lib/scraper/apify/apifyClient';

describe('Apify Webhook Ingestion API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects requests with invalid webhook secret when APIFY_WEBHOOK_SECRET is set', async () => {
    process.env.APIFY_WEBHOOK_SECRET = 'super-secret-token';

    const req = new Request('http://localhost:3000/api/webhooks/apify', {
      method: 'POST',
      headers: {
        'x-apify-webhook-secret': 'wrong-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Unauthorized');
  });

  it('accepts valid secret via header and processes items', async () => {
    process.env.APIFY_WEBHOOK_SECRET = 'valid-secret-123';

    const req = new Request('http://localhost:3000/api/webhooks/apify', {
      method: 'POST',
      headers: {
        'x-apify-webhook-secret': 'valid-secret-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: 'ACTOR.RUN.SUCCEEDED',
        items: [
          {
            title: 'Malarz budowlany Szczecin Centrum',
            salary: '5000-6500 zł',
            location: 'Szczecin',
            sourcePortal: 'olx',
            url: 'https://www.olx.pl/d/oferta/malarz-centrum-ID999.html',
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalReceived).toBe(1);
    expect(json.data.totalValid).toBe(1);
  });

  it('ignores aborted or failed actor events', async () => {
    process.env.APIFY_WEBHOOK_SECRET = 'test';

    const req = new Request('http://localhost:3000/api/webhooks/apify', {
      method: 'POST',
      headers: {
        'x-apify-webhook-secret': 'test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: 'ACTOR.RUN.FAILED',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain('Ignored event type');
  });

  it('processes webhook payload with ApifyClient fetching dataset', async () => {
    const mockClient = new ApifyClient('token');
    vi.spyOn(mockClient, 'getDatasetItems').mockResolvedValue([
      {
        title: 'Tynkarz maszynowy Szczecin Gumieńce',
        description: 'Tynki gipsowe i cementowo-wapienne, stawka 40 zł/m2. Tel: 600300200',
        url: 'https://www.olx.pl/d/oferta/tynkarz-gumience-ID888.html',
        sourcePortal: 'olx',
      },
    ]);

    const result = await processApifyWebhook(
      {
        eventType: 'ACTOR.RUN.SUCCEEDED',
        resource: {
          defaultDatasetId: 'dataset-12345',
        },
      },
      mockClient
    );

    expect(result.success).toBe(true);
    expect(result.totalReceived).toBe(1);
    expect(result.totalValid).toBe(1);
  });
});
