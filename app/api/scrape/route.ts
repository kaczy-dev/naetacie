/**
 * Multi-Portal On-Demand Job Scraper API Route.
 * Extracts live construction job postings across OLX, Pracuj.pl, and Indeed.
 */

import { NextResponse } from 'next/server';
import { runMultiPortalScrape } from '@/lib/scraper/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '60', 10), 100);
  const customQuery = url.searchParams.get('query') || undefined;
  const portalsParam = url.searchParams.get('portals');

  let portals: ('olx' | 'pracuj' | 'indeed')[] = ['olx', 'pracuj', 'indeed'];
  if (portalsParam) {
    const parsed = portalsParam.split(',').map((p) => p.trim().toLowerCase());
    portals = parsed.filter((p): p is 'olx' | 'pracuj' | 'indeed' =>
      ['olx', 'pracuj', 'indeed'].includes(p)
    );
    if (portals.length === 0) portals = ['olx', 'pracuj', 'indeed'];
  }

  try {
    const response = await runMultiPortalScrape({
      query: customQuery,
      limit,
      portals,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Multi-portal scrape API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Scraping failed',
        data: [],
        metadata: {
          totalScraped: 0,
          storedInFirestore: 0,
          scrapedAt: new Date().toISOString(),
          breakdown: { olx: 0, pracuj: 0, indeed: 0 },
          queries: customQuery ? [customQuery] : [],
        },
      },
      { status: 500 }
    );
  }
}
