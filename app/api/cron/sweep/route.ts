/**
 * Automated Tombstone Sweep Cron Route.
 * Periodically probes older announcements in Firestore and marks expired/404 listings
 * as inactive so users never see stale listings.
 */

import { NextResponse } from 'next/server';
import { runTombstoneSweep } from '@/lib/verification/tombstoneSweep';

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

    const sweepResult = await runTombstoneSweep({ limit });

    return NextResponse.json({
      success: true,
      message: 'Tombstone sweep completed successfully',
      ...sweepResult,
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
