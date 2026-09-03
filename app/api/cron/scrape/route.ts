/**
 * Autonomous Background Cron Scraper Route 2.0.
 * Triggers background scheduled multi-portal ingestion every 6 or 12 hours.
 * Secured with CRON_SECRET authorization header for Vercel Cron / Cloud Scheduler.
 */

import { NextResponse } from 'next/server';
import { runMultiPortalScrape, SupportedPortal } from '@/lib/scraper/engine';
import { getAdaptiveScheduleStatus } from '@/lib/scraper/adaptiveScheduler';
import { runTombstoneSweep, TombstoneSweepResult } from '@/lib/verification/tombstoneSweep';

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
  'bip_szczecin',
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
    const url = new URL(request.url);
    const shouldSweep = url.searchParams.get('sweep') !== 'false'; // Default to true
    const startTime = Date.now();
    const scheduleStatus = getAdaptiveScheduleStatus();

    // 1. Scrape latest offers across portals
    const result = await runMultiPortalScrape({
      limit: scheduleStatus.recommendedBatchLimit,
      portals: CRON_DEFAULT_PORTALS,
    });

    // 2. Run tombstone sweep to clean up 404s/expired offers in the same daily run
    let sweepResult: TombstoneSweepResult | null = null;
    if (shouldSweep) {
      try {
        sweepResult = await runTombstoneSweep({ limit: 25, httpTimeoutMs: 2500 });
      } catch (sweepErr) {
        console.warn('Cron sweep non-fatal failure:', (sweepErr as Error).message);
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Background cron job completed successfully',
      executionTimeMs,
      adaptiveSchedule: {
        phase: scheduleStatus.phase,
        phaseLabel: scheduleStatus.phaseLabelPl,
        isPeakHour: scheduleStatus.isPeakHour,
        batchLimitUsed: scheduleStatus.recommendedBatchLimit,
      },
      metadata: result.metadata,
      storedCount: result.data.length,
      tombstoneSweep: sweepResult,
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
