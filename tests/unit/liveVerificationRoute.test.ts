import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/announcements/verify/route';
import { adminFirestore } from '@/lib/firebase/admin';
import * as offerAvailModule from '@/lib/verification/offerAvailability';

describe('Real-Time Live Announcement Verifier API Route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when id param is missing', async () => {
    const req = new Request('http://localhost:3000/api/announcements/verify');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Missing announcement id');
  });

  it('returns 404 when announcement is not found in Firestore', async () => {
    vi.spyOn(adminFirestore, 'collection').mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
      }),
    } as any);

    const req = new Request('http://localhost:3000/api/announcements/verify?id=non-existent-id');
    const res = await GET(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.isAvailable).toBe(false);
  });

  it('verifies active offer and returns isAvailable: true', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(adminFirestore, 'collection').mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            source_url: 'https://www.olx.pl/d/oferta/live-offer-ID111.html',
            source_portal: 'olx',
          }),
        }),
        update: mockUpdate,
      }),
    } as any);

    vi.spyOn(offerAvailModule, 'checkLiveHttpAvailability').mockResolvedValue({
      isAvailable: true,
    });

    const req = new Request('http://localhost:3000/api/announcements/verify?id=valid-live-ad');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.isAvailable).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
        availability_status: 'active',
      })
    );
  });

  it('marks dead/expired offer as inactive in Firestore and returns isAvailable: false', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(adminFirestore, 'collection').mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            source_url: 'https://www.olx.pl/d/oferta/dead-offer-ID222.html',
            source_portal: 'olx',
          }),
        }),
        update: mockUpdate,
      }),
    } as any);

    vi.spyOn(offerAvailModule, 'checkLiveHttpAvailability').mockResolvedValue({
      isAvailable: false,
      reason: 'LIVE_PORTAL_INACTIVE',
      details: 'Page matched dead-offer pattern',
    });

    const req = new Request('http://localhost:3000/api/announcements/verify?id=dead-ad');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.isAvailable).toBe(false);
    expect(json.reason).toBe('LIVE_PORTAL_INACTIVE');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: false,
        availability_status: 'expired',
        unavailability_reason: 'LIVE_PORTAL_INACTIVE',
      })
    );
  });
});
