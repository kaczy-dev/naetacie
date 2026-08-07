/**
 * Autonomous Background Cron Scraper Route.
 * Triggers background scheduled multi-portal ingestion every 6 or 12 hours.
 * Secured with CRON_SECRET authorization header for Vercel Cron / Cloud Scheduler.
 */

import { NextResponse } from 'next/server';
import { runMultiPortalScrape } from '@/lib/scraper/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s maximum duration for background cron execution

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Protect background endpoint in production
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const result = await runMultiPortalScrape({
      limit: 80,
      portals: ['olx', 'pracuj', 'indeed'],
    });

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Background cron job scraping completed successfully',
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
