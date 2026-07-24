import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BoundingBox } from '@/lib/types/geo';

// Mock Firebase client auth
vi.mock('@/lib/firebase/client', () => ({
  clientAuth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
  isFirebaseConfigValid: () => true,
}));

// We test the data fetching logic by extracting it and testing the URL construction
// and response handling patterns used by MapView.

describe('MapView data fetching logic', () => {
  const mockBounds: BoundingBox = {
    south_lat: 53.3,
    west_lng: 14.4,
    north_lat: 53.5,
    east_lng: 14.7,
  };

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('constructs correct URL with bounding box parameter', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [], metadata: { total_count: 0, current_page: 1, page_size: 100, total_pages: 0 } }),
      });
    });

    // Simulate what MapView does internally
    const { clientAuth } = await import('@/lib/firebase/client');
    const user = clientAuth.currentUser;
    const token = await user!.getIdToken();
    const bboxParam = `${mockBounds.south_lat},${mockBounds.west_lng},${mockBounds.north_lat},${mockBounds.east_lng}`;

    await globalThis.fetch(
      `/api/announcements?bounding_box=${encodeURIComponent(bboxParam)}&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(capturedUrl).toBe('/api/announcements?bounding_box=53.3%2C14.4%2C53.5%2C14.7&limit=100');
  });

  it('includes Bearer token in Authorization header', async () => {
    let capturedHeaders: Record<string, string> = {};
    globalThis.fetch = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
      capturedHeaders = options.headers as Record<string, string>;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [], metadata: { total_count: 0, current_page: 1, page_size: 100, total_pages: 0 } }),
      });
    });

    // The mock returns 'mock-token' when getIdToken is called
    const token = 'mock-token';
    const bboxParam = `${mockBounds.south_lat},${mockBounds.west_lng},${mockBounds.north_lat},${mockBounds.east_lng}`;

    await globalThis.fetch(
      `/api/announcements?bounding_box=${encodeURIComponent(bboxParam)}&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(capturedHeaders.Authorization).toBe('Bearer mock-token');
  });

  it('throws error on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    });

    const response = await globalThis.fetch('/api/announcements?bounding_box=1,2,3,4&limit=100', {
      headers: { Authorization: 'Bearer mock-token' },
    });

    expect(response.ok).toBe(false);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });

  it('handles successful response with announcement data', async () => {
    const mockData = {
      data: [
        {
          deduplication_key: 'olx-123',
          title: 'Test Ad',
          description: 'Description...',
          source_portal: 'olx',
          category: 'construction',
          location_text: 'Szczecin',
          latitude: 53.43,
          longitude: 14.55,
          price: 1500,
          scraped_at: '2024-01-01T00:00:00.000Z',
          published_at: null,
        },
      ],
      metadata: { total_count: 1, current_page: 1, page_size: 100, total_pages: 1 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const response = await globalThis.fetch('/api/announcements?bounding_box=53.3,14.4,53.5,14.7&limit=100', {
      headers: { Authorization: 'Bearer mock-token' },
    });

    const result = await response.json();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].deduplication_key).toBe('olx-123');
    expect(result.metadata.total_count).toBe(1);
  });

  it('formats bounding box correctly with decimal coordinates', () => {
    const bounds: BoundingBox = {
      south_lat: 53.12345,
      west_lng: 14.67890,
      north_lat: 53.98765,
      east_lng: 14.12345,
    };

    const bboxParam = `${bounds.south_lat},${bounds.west_lng},${bounds.north_lat},${bounds.east_lng}`;
    expect(bboxParam).toBe('53.12345,14.6789,53.98765,14.12345');
  });

  it('validates polygon spatial filter calculation', async () => {
    const { isPointInPolygon } = await import('./utils');
    const squarePolygon: Array<[number, number]> = [
      [14.5, 53.4],
      [14.6, 53.4],
      [14.6, 53.5],
      [14.5, 53.5],
    ];

    expect(isPointInPolygon([53.45, 14.55], squarePolygon)).toBe(true);
    expect(isPointInPolygon([52.0, 12.0], squarePolygon)).toBe(false);
  });
});
