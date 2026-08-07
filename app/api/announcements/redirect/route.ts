/**
 * Real-Time Direct Offer Redirect & Live Link Resolver API.
 * Guarantees clicking "OTWÓRZ" ALWAYS takes the user to an active live job offer or its healed portal equivalent.
 */

import { NextResponse } from 'next/server';
import { healAnnouncementLink } from '@/lib/verification/linkHealer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const rawUrl = url.searchParams.get('url');
  const portal = url.searchParams.get('portal');
  const title = url.searchParams.get('title');
  const id = url.searchParams.get('id');

  try {
    const healed = await healAnnouncementLink({
      source_url: rawUrl,
      source_portal: portal,
      title,
      id: id || undefined,
    });

    return NextResponse.redirect(healed.url, { status: 307 });
  } catch (e) {
    console.warn('Real-time redirect heal fallback:', (e as Error).message);
    const fallbackUrl = `https://www.olx.pl/praca/szczecin/?search%5Bq%5D=${encodeURIComponent(title || 'budowlana')}`;
    return NextResponse.redirect(fallbackUrl, { status: 307 });
  }
}
