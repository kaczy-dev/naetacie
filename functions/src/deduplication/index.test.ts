import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'crypto';
import { generateDeduplicationKey, checkExists, batchCheckExists } from './index';
import type { ScrapedAd } from '@lib/types/announcement';

describe('generateDeduplicationKey', () => {
  it('returns portal-nativeId when nativeId is non-empty', () => {
    const ad: ScrapedAd = {
      nativeId: '12345',
      title: 'Test Ad',
      description: 'Description',
      sourceUrl: 'https://olx.pl/12345',
      sourcePortal: 'olx',
      category: 'construction',
      locationText: 'Szczecin',
      price: 100,
      contactInfo: null,
      publishedAt: new Date('2024-01-15T10:00:00Z'),
    };

    expect(generateDeduplicationKey(ad)).toBe('olx-12345');
  });

  it('returns portal-nativeId for oferteo portal', () => {
    const ad: ScrapedAd = {
      nativeId: 'abc-999',
      title: 'Remont',
      description: 'Opis',
      sourceUrl: 'https://oferteo.pl/abc-999',
      sourcePortal: 'oferteo',
      category: 'renovation',
      locationText: 'Szczecin',
      price: null,
      contactInfo: null,
      publishedAt: null,
    };

    expect(generateDeduplicationKey(ad)).toBe('oferteo-abc-999');
  });

  it('returns SHA-256 hash when nativeId is null', () => {
    const ad: ScrapedAd = {
      nativeId: null,
      title: 'Test Ad',
      description: 'Description',
      sourceUrl: 'https://fixly.pl/ad',
      sourcePortal: 'fixly',
      category: 'construction',
      locationText: 'Szczecin',
      price: 200,
      contactInfo: 'test@example.com',
      publishedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const expectedContent = `Test Ad|2024-01-15T10:00:00.000Z|Description`;
    const expectedHash = createHash('sha256').update(expectedContent).digest('hex');

    expect(generateDeduplicationKey(ad)).toBe(expectedHash);
  });

  it('returns SHA-256 hash when nativeId is empty string', () => {
    const ad: ScrapedAd = {
      nativeId: '',
      title: 'Another Ad',
      description: 'Some description',
      sourceUrl: 'https://olx.pl/ad',
      sourcePortal: 'olx',
      category: 'construction',
      locationText: 'Szczecin',
      price: null,
      contactInfo: null,
      publishedAt: null,
    };

    const expectedContent = `Another Ad||Some description`;
    const expectedHash = createHash('sha256').update(expectedContent).digest('hex');

    expect(generateDeduplicationKey(ad)).toBe(expectedHash);
  });

  it('uses empty string for publishedAt when it is null in hash mode', () => {
    const ad: ScrapedAd = {
      nativeId: null,
      title: 'Title',
      description: 'Desc',
      sourceUrl: 'https://olx.pl/ad',
      sourcePortal: 'olx',
      category: 'construction',
      locationText: 'Szczecin',
      price: null,
      contactInfo: null,
      publishedAt: null,
    };

    const expectedContent = `Title||Desc`;
    const expectedHash = createHash('sha256').update(expectedContent).digest('hex');

    expect(generateDeduplicationKey(ad)).toBe(expectedHash);
  });

  it('is deterministic - same input produces same output', () => {
    const ad: ScrapedAd = {
      nativeId: null,
      title: 'Deterministic',
      description: 'Test',
      sourceUrl: 'https://olx.pl/ad',
      sourcePortal: 'olx',
      category: 'construction',
      locationText: 'Szczecin',
      price: 50,
      contactInfo: null,
      publishedAt: new Date('2024-06-01T00:00:00Z'),
    };

    const key1 = generateDeduplicationKey(ad);
    const key2 = generateDeduplicationKey(ad);

    expect(key1).toBe(key2);
  });
});

describe('checkExists', () => {
  it('returns true when document exists', async () => {
    const mockFirestore = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ exists: true }),
        }),
      }),
    } as unknown as import('firebase-admin/firestore').Firestore;

    const result = await checkExists(mockFirestore, 'olx-12345');
    expect(result).toBe(true);
    expect(mockFirestore.collection).toHaveBeenCalledWith('announcements');
  });

  it('returns false when document does not exist', async () => {
    const mockFirestore = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ exists: false }),
        }),
      }),
    } as unknown as import('firebase-admin/firestore').Firestore;

    const result = await checkExists(mockFirestore, 'nonexistent-key');
    expect(result).toBe(false);
  });
});

describe('batchCheckExists', () => {
  it('returns empty map for empty keys array', async () => {
    const mockFirestore = {
      getAll: vi.fn(),
    } as unknown as import('firebase-admin/firestore').Firestore;

    const result = await batchCheckExists(mockFirestore, []);
    expect(result).toEqual(new Map());
    expect(mockFirestore.getAll).not.toHaveBeenCalled();
  });

  it('returns existence map for multiple keys', async () => {
    const mockFirestore = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockImplementation((key: string) => ({ id: key })),
      }),
      getAll: vi.fn().mockResolvedValue([
        { exists: true },
        { exists: false },
        { exists: true },
      ]),
    } as unknown as import('firebase-admin/firestore').Firestore;

    const keys = ['key-1', 'key-2', 'key-3'];
    const result = await batchCheckExists(mockFirestore, keys);

    expect(result.get('key-1')).toBe(true);
    expect(result.get('key-2')).toBe(false);
    expect(result.get('key-3')).toBe(true);
    expect(result.size).toBe(3);
  });
});
