import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './route';

// Mock dependencies
vi.mock('@/lib/auth/server', () => ({
  verifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminFirestore: {
    collection: vi.fn(),
  },
}));

vi.mock('@/lib/validation/input', () => ({
  validateAndSanitize: vi.fn(),
}));

import { verifyIdToken } from '@/lib/auth/server';
import { adminFirestore } from '@/lib/firebase/admin';
import { validateAndSanitize } from '@/lib/validation/input';

const mockVerifyIdToken = vi.mocked(verifyIdToken);
const mockFirestore = vi.mocked(adminFirestore);
const mockValidateAndSanitize = vi.mocked(validateAndSanitize);

function createRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe('GET /api/announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: input validation passes
    mockValidateAndSanitize.mockReturnValue({ valid: true, errors: [], sanitized: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication (Guest Mode)', () => {
    const setupGuestMocks = (announcements: unknown[] = []) => {
      const scrapedAt = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours ago

      const mockDocs = announcements.length > 0
        ? announcements.map((a: any, i) => ({
            id: a.deduplication_key || `key-${i}`,
            data: () => ({
              title: a.title || `Title ${i}`,
              description: a.description || `Description ${i}`,
              source_url: a.source_url || `http://example.com/${i}`,
              source_portal: a.source_portal || 'olx',
              category: a.category || 'construction',
              location_text: a.location_text || 'Szczecin',
              latitude: a.latitude ?? null,
              longitude: a.longitude ?? null,
              price: a.price ?? null,
              contact_info: a.contact_info ?? null,
              scraped_at: a.scraped_at || scrapedAt,
              published_at: a.published_at || null,
            }),
          }))
        : [];

      const mockSnapshot = { docs: mockDocs };
      const mockQueryGet = vi.fn().mockResolvedValue(mockSnapshot);
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnValue({
        where: mockWhere,
        get: mockQueryGet,
      });

      (mockFirestore.collection as ReturnType<typeof vi.fn>).mockImplementation(
        (name: string) => {
          if (name === 'users') {
            return { doc: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ exists: false }) }) };
          }
          return { orderBy: mockOrderBy };
        }
      );
    };

    it('returns 200 with free-tier data when Authorization header is missing', async () => {
      setupGuestMocks([]);

      const request = createRequest('http://localhost/api/announcements');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
      expect(body.metadata.total_count).toBe(0);
    });

    it('returns 200 with free-tier data when Authorization header does not start with Bearer', async () => {
      setupGuestMocks([]);

      const request = createRequest('http://localhost/api/announcements', {
        Authorization: 'Basic some-token',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
    });

    it('returns 200 with free-tier data when token verification fails (guest fallback)', async () => {
      mockVerifyIdToken.mockResolvedValue({
        success: false,
        error: { code: 'authentication_failed', message: 'Invalid token' },
      });
      setupGuestMocks([]);

      const request = createRequest('http://localhost/api/announcements', {
        Authorization: 'Bearer invalid-token',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
    });

    it('applies free-tier masking for guest users', async () => {
      const veryOldDate = new Date(Date.now() - 72 * 60 * 60 * 1000);
      setupGuestMocks([
        {
          deduplication_key: 'olx-1',
          title: 'Renovation job',
          description: 'A'.repeat(150),
          source_url: 'http://olx.pl/1',
          source_portal: 'olx',
          category: 'construction',
          location_text: 'Szczecin',
          latitude: 53.4,
          longitude: 14.5,
          price: 5000,
          contact_info: '555-1234',
          scraped_at: veryOldDate,
          published_at: null,
        },
      ]);

      const request = createRequest('http://localhost/api/announcements?page=1&limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      // Free tier: description truncated, no source_url, no contact_info
      expect(body.data[0].description).toBe('A'.repeat(100) + '...');
      expect(body.data[0].source_url).toBeUndefined();
      expect(body.data[0].contact_info).toBeUndefined();
    });
  });

  describe('Query parameter validation', () => {
    const setupFirestoreMockForValidation = () => {
      const mockSnapshot = { docs: [] };
      const mockQueryGet = vi.fn().mockResolvedValue(mockSnapshot);
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnValue({
        where: mockWhere,
        get: mockQueryGet,
      });

      (mockFirestore.collection as ReturnType<typeof vi.fn>).mockImplementation(
        () => ({ orderBy: mockOrderBy })
      );
    };

    it('returns 400 for invalid page parameter', async () => {
      setupFirestoreMockForValidation();

      const request = createRequest('http://localhost/api/announcements?page=-1');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('page');
    });

    it('returns 400 for invalid limit parameter', async () => {
      setupFirestoreMockForValidation();

      const request = createRequest('http://localhost/api/announcements?limit=200');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('limit');
    });

    it('returns 400 for invalid source_portal parameter', async () => {
      setupFirestoreMockForValidation();

      const request = createRequest('http://localhost/api/announcements?source_portal=invalid');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('source_portal');
    });
  });

  describe('User profile and authorization', () => {
    it('returns 200 with free tier when authenticated user profile does not exist', async () => {
      mockVerifyIdToken.mockResolvedValue({
        success: true,
        data: { uid: 'user-1', email: 'test@test.com' },
      });

      const mockSnapshot = { docs: [] };
      const mockQueryGet = vi.fn().mockResolvedValue(mockSnapshot);
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnValue({
        where: mockWhere,
        get: mockQueryGet,
      });

      const mockGet = vi.fn().mockResolvedValue({ exists: false });
      const mockDoc = vi.fn().mockReturnValue({ get: mockGet });
      const mockCollection = vi.fn().mockImplementation((name: string) => {
        if (name === 'users') {
          return { doc: mockDoc };
        }
        return { orderBy: mockOrderBy };
      });
      (mockFirestore.collection as ReturnType<typeof vi.fn>).mockImplementation(mockCollection);

      const request = createRequest('http://localhost/api/announcements', {
        Authorization: 'Bearer valid-token',
      });
      const response = await GET(request);

      // With resolveUserContext, non-existent user doc results in free tier (not 403)
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
    });
  });

  describe('Successful responses', () => {
    const setupMocks = (tier: 'free' | 'premium', announcements: unknown[] = []) => {
      mockVerifyIdToken.mockResolvedValue({
        success: true,
        data: { uid: 'user-1', email: 'test@test.com' },
      });

      const scrapedAt = new Date('2024-01-01T00:00:00Z');

      const mockDocs = announcements.length > 0
        ? announcements.map((a: any, i) => ({
            id: a.deduplication_key || `key-${i}`,
            data: () => ({
              title: a.title || `Title ${i}`,
              description: a.description || `Description ${i}`,
              source_url: a.source_url || `http://example.com/${i}`,
              source_portal: a.source_portal || 'olx',
              category: a.category || 'construction',
              location_text: a.location_text || 'Szczecin',
              latitude: a.latitude ?? null,
              longitude: a.longitude ?? null,
              price: a.price ?? null,
              contact_info: a.contact_info ?? null,
              scraped_at: a.scraped_at || scrapedAt,
              published_at: a.published_at || null,
            }),
          }))
        : [];

      const mockSnapshot = { docs: mockDocs };
      const mockQueryGet = vi.fn().mockResolvedValue(mockSnapshot);
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnValue({
        where: mockWhere,
        get: mockQueryGet,
      });

      const mockUserGet = vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ tier }),
      });
      const mockUserDoc = vi.fn().mockReturnValue({ get: mockUserGet });

      (mockFirestore.collection as ReturnType<typeof vi.fn>).mockImplementation(
        (name: string) => {
          if (name === 'users') {
            return { doc: mockUserDoc };
          }
          return { orderBy: mockOrderBy };
        }
      );
    };

    it('returns 200 with empty data when no announcements match', async () => {
      setupMocks('free', []);

      const request = createRequest('http://localhost/api/announcements', {
        Authorization: 'Bearer valid-token',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
      expect(body.metadata.total_count).toBe(0);
      expect(body.metadata.total_pages).toBe(0);
    });

    it('returns paginated announcements for premium user', async () => {
      const oldDate = new Date('2024-01-01T00:00:00Z');
      setupMocks('premium', [
        {
          deduplication_key: 'olx-1',
          title: 'Renovation job',
          description: 'Full description here',
          source_url: 'http://olx.pl/1',
          source_portal: 'olx',
          category: 'construction',
          location_text: 'Szczecin',
          latitude: 53.4,
          longitude: 14.5,
          price: 5000,
          contact_info: '555-1234',
          scraped_at: oldDate,
          published_at: oldDate,
        },
      ]);

      const request = createRequest('http://localhost/api/announcements?page=1&limit=20', {
        Authorization: 'Bearer valid-token',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].source_url).toBe('http://olx.pl/1');
      expect(body.data[0].contact_info).toBe('555-1234');
      expect(body.metadata.total_count).toBe(1);
      expect(body.metadata.current_page).toBe(1);
      expect(body.metadata.page_size).toBe(20);
    });

    it('applies tier masking for free user (filters old announcements only)', async () => {
      // This announcement is very old (>48h), so it should pass the free tier filter
      const veryOldDate = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours ago
      setupMocks('free', [
        {
          deduplication_key: 'olx-1',
          title: 'Renovation job',
          description: 'A'.repeat(150),
          source_url: 'http://olx.pl/1',
          source_portal: 'olx',
          category: 'construction',
          location_text: 'Szczecin',
          latitude: 53.4,
          longitude: 14.5,
          price: 5000,
          contact_info: '555-1234',
          scraped_at: veryOldDate,
          published_at: null,
        },
      ]);

      const request = createRequest('http://localhost/api/announcements?page=1&limit=20', {
        Authorization: 'Bearer valid-token',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      // Free tier: description truncated, no source_url, no contact_info
      expect(body.data[0].description).toBe('A'.repeat(100) + '...');
      expect(body.data[0].source_url).toBeUndefined();
      expect(body.data[0].contact_info).toBeUndefined();
    });

    it('filters by bounding_box spatial parameters', async () => {
      const oldDate = new Date(Date.now() - 72 * 60 * 60 * 1000);
      setupMocks('premium', [
        {
          deduplication_key: 'olx-1',
          title: 'Inside box',
          latitude: 53.4,
          longitude: 14.5,
          scraped_at: oldDate,
        },
        {
          deduplication_key: 'olx-2',
          title: 'Outside box',
          latitude: 55.0,
          longitude: 20.0,
          scraped_at: oldDate,
        },
        {
          deduplication_key: 'olx-3',
          title: 'Null coords',
          latitude: null,
          longitude: null,
          scraped_at: oldDate,
        },
      ]);

      // Bounding box that includes only the first announcement
      const bbox = '53.0,14.0,54.0,15.0';
      const request = createRequest(
        `http://localhost/api/announcements?bounding_box=${bbox}`,
        { Authorization: 'Bearer valid-token' }
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Inside box');
      expect(body.metadata.total_count).toBe(1);
    });

    it('returns correct pagination metadata', async () => {
      const oldDate = new Date(Date.now() - 72 * 60 * 60 * 1000);
      const manyAds = Array.from({ length: 25 }, (_, i) => ({
        deduplication_key: `key-${i}`,
        title: `Ad ${i}`,
        scraped_at: oldDate,
        latitude: 53.4,
        longitude: 14.5,
      }));
      setupMocks('premium', manyAds);

      const request = createRequest('http://localhost/api/announcements?page=2&limit=10', {
        Authorization: 'Bearer valid-token',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(10);
      expect(body.metadata.total_count).toBe(25);
      expect(body.metadata.current_page).toBe(2);
      expect(body.metadata.page_size).toBe(10);
      expect(body.metadata.total_pages).toBe(3);
    });
  });
});
