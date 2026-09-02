/**
 * Automated Tombstone Sweep Cron Route.
 * Periodically probes older announcements in Firestore and marks expired/404 listings
 * as inactive so users never see stale listings.
 */

import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebase/admin';
import { checkLiveHttpAvailability } from '@/lib/verification/offerAvailability';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
    }
  } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 60);

    // Fetch active announcements sorted by verified_at or published_at
    const snapshot = await adminFirestore
      .collection('announcements')
      .where('is_active', '==', true)
      .limit(limit)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No active announcements to probe',
        probedCount: 0,
        expiredCount: 0,
      });
    }

    let expiredCount = 0;
    let activeCount = 0;
    const batch = adminFirestore.batch();

    // Probe sequentially or in small concurrency of 5 to avoid triggering rate limits
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const sourceUrl = (data.source_url as string) || '';
      const sourcePortal = (data.source_portal as string) || '';

      if (!sourceUrl) {
        continue;
      }

      try {
        const check = await checkLiveHttpAvailability(sourceUrl, sourcePortal, 3000);
        if (!check.isAvailable) {
          batch.update(doc.ref, {
            is_active: false,
            availability_status: 'expired',
            unavailability_reason: check.reason || 'LIVE_PORTAL_INACTIVE',
            verified_at: new Date(),
          });
          expiredCount++;
        } else {
          batch.update(doc.ref, {
            verified_at: new Date(),
          });
          activeCount++;
        }
      } catch {
        // On error, leave active
        activeCount++;
      }
    }

    if (expiredCount > 0 || activeCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: 'Tombstone sweep completed successfully',
      probedCount: snapshot.docs.length,
      expiredCount,
      activeCount,
    });
  } catch (error) {
    console.error('Tombstone sweep error:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
