/**
 * API Route: POST /api/announcements/verify
 *
 * Verifies job offer availability and automatically ingests only active & available offers into Firestore.
 * Supports batch processing and live HTTP reachability checks.
 */

import { NextResponse } from 'next/server';
import { filterAndAddAvailableOffers, verifyOfferAvailability } from '@/lib/verification/offerAvailability';
import { ScrapedAd } from '@/lib/scraper/types';

export const dynamic = 'force-dynamic';

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
      { status: 500 }
    );
  }
}
