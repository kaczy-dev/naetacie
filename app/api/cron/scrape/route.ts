/**
 * Autonomous Background Cron Scraper Route 2.0.
 * Triggers background scheduled multi-portal ingestion every 6 or 12 hours.
 * Secured with CRON_SECRET authorization header for Vercel Cron / Cloud Scheduler.
 */

import { NextResponse } from 'next/server';
import { runMultiPortalScrape, SupportedPortal } from '@/lib/scraper/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s maximum duration for background cron execution

const CRON_DEFAULT_PORTALS: SupportedPortal[] = [
  'olx',
  'pracuj',
  'indeed',
  'jooble',
  'gowork',
  'oferteo',
  'fixly',
];

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Protect background endpoint in production
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
    }
  } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const result = await runMultiPortalScrape({
      limit: 100,
      portals: CRON_DEFAULT_PORTALS,
    });

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Background cron job multi-portal scraping completed successfully',
      executionTimeMs,
      metadata: result.metadata,
      storedCount: result.data.length,
    });
  } catch (error) {
    console.error('Background Cron Scraper Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
