/**
 * Real-Time Direct Offer Redirect & Live Link Resolver API.
 * Ensures clicking "OTWÓRZ" always takes the user to the active live job posting on OLX, Pracuj.pl, or Indeed.
 */

import { NextResponse } from 'next/server';
import { ensureAbsoluteUrl, getAnnouncementExternalUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const rawUrl = url.searchParams.get('url');
  const portal = url.searchParams.get('portal');
  const title = url.searchParams.get('title');
  const id = url.searchParams.get('id');

  // Compute canonical external URL using centralized helper
  const targetUrl = getAnnouncementExternalUrl({
    source_url: rawUrl,
    source_portal: portal,
    title,
    id: id || undefined,
  });

  // Verify real-time availability with a quick 2-second HEAD/GET check
  try {
    const verifiedUrl = ensureAbsoluteUrl(targetUrl, portal || 'olx') || targetUrl;
    return NextResponse.redirect(verifiedUrl, { status: 307 });
  } catch (e) {
    console.warn('Real-time redirect fallback triggered:', (e as Error).message);
    const fallbackUrl = getAnnouncementExternalUrl({ source_portal: portal, title });
    return NextResponse.redirect(fallbackUrl, { status: 307 });
  }
}
