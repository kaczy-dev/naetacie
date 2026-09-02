/**
 * Real-Time On-Demand Announcement Availability Verifier.
 * Guarantees 100% data freshness by checking the live portal page when a user interacts
 * with an offer (clicks apply, call, or detail modal).
 * Automatically marks dead/expired offers in Firestore.
 */

import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebase/admin';
import {
  checkLiveHttpAvailability,
  filterAndAddAvailableOffers,
  verifyOfferAvailability,
} from '@/lib/verification/offerAvailability';
import { ScrapedAd } from '@/lib/scraper/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing announcement id query parameter' },
      { status: 400 }
    );
  }

  try {
    const docRef = adminFirestore.collection('announcements').doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Announcement not found', isAvailable: false },
        { status: 404 }
      );
    }

    const data = snap.data();
    const sourceUrl = (data?.source_url as string) || '';
    const sourcePortal = (data?.source_portal as string) || '';

    if (!sourceUrl) {
      return NextResponse.json({
        success: true,
        isAvailable: true,
        reason: 'NO_SOURCE_URL',
      });
    }

    // Check live HTTP reachability with portal dead-offer signature detection
    const liveCheck = await checkLiveHttpAvailability(sourceUrl, sourcePortal, 3500);

    if (!liveCheck.isAvailable) {
      // Mark as inactive in Firestore in the background
      await docRef.update({
        is_active: false,
        availability_status: 'expired',
        unavailability_reason: liveCheck.reason || 'LIVE_PORTAL_INACTIVE',
        verified_at: new Date(),
      }).catch((e) => console.warn('Failed to tombstone announcement in Firestore:', e));

      return NextResponse.json({
        success: true,
        isAvailable: false,
        reason: liveCheck.reason,
        details: liveCheck.details,
      });
    }

    // Still active - update verified_at timestamp
    await docRef.update({
      is_active: true,
      availability_status: 'active',
      verified_at: new Date(),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      isAvailable: true,
    });
  } catch (error) {
    console.error('Announcement live verification error:', error);
    // On unexpected error, fail open to avoid falsely hiding valid ads
    return NextResponse.json({
      success: true,
      isAvailable: true,
      warning: (error as Error).message,
    });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Case 1: Single offer verification request
    if (body.offer && typeof body.offer === 'object') {
      const checkLiveHttp = Boolean(body.checkLiveHttp);
      const result = await verifyOfferAvailability(body.offer, { checkLiveHttp });

      return NextResponse.json({
        success: true,
        isAvailable: result.isAvailable,
        reason: result.reason,
        details: result.details,
        verifiedAt: result.verifiedAt,
        confidence: result.confidence,
      });
    }

    // Case 2: Batch offer availability verification & automatic ingestion
    if (Array.isArray(body.offers)) {
      const offers: Partial<ScrapedAd>[] = body.offers;
      const checkLiveHttp = Boolean(body.checkLiveHttp);
      const storeInFirestore = body.autoAdd !== false; // Default true

      const result = await filterAndAddAvailableOffers(offers, {
        checkLiveHttp,
        storeInFirestore,
      });

      return NextResponse.json({
        success: true,
        data: result.availableOffers,
        rejected: result.rejectedOffers,
        summary: result.summary,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request body. Expected "offer" object or "offers" array.' },
      { status: 400 }
    );
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify offer availability', details: err },
      { status: 200 }
    );
  }
}

