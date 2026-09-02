/**
 * Real-Time Direct Offer Redirect & Live Link Resolver API.
 * Guarantees clicking "OTWÓRZ" ALWAYS takes the user to an active live job offer or its healed portal equivalent.
 */

import { NextResponse } from 'next/server';
import { healAnnouncementLink } from '@/lib/verification/linkHealer';
import { adminFirestore } from '@/lib/firebase/admin';
import { resolveOlxLink } from '@/lib/olx/olxLinkResolver';

export const dynamic = 'force-dynamic';

const ALLOWED_REDIRECT_DOMAINS = [
  'olx.pl',
  'pracuj.pl',
  'indeed.com',
  'jooble.org',
  'gowork.pl',
  'oferteo.pl',
  'fixly.pl',
  'google.com',
];

function isSafeRedirectUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    return ALLOWED_REDIRECT_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  let rawUrl = url.searchParams.get('url');
  const portal = url.searchParams.get('portal');
  const title = url.searchParams.get('title');
  const id = url.searchParams.get('id');

  try {
    // If rawUrl is provided directly, validate against open redirect
    if (rawUrl && !isSafeRedirectUrl(rawUrl)) {
      rawUrl = null; // Discard untrusted URL and heal via title/portal search
    }

    // If source_url is omitted/masked, attempt to retrieve full source_url from Firestore by ID
    if ((!rawUrl || rawUrl.trim() === '') && id) {
      try {
        const docRef = adminFirestore.collection('announcements').doc(id);
        const docSnap = await Promise.race([
          docRef.get(),
          new Promise<null>((r) => setTimeout(() => r(null), 1000)),
        ]);
        if (docSnap && docSnap.exists) {
          const data = docSnap.data();
          if (data?.source_url && isSafeRedirectUrl(data.source_url)) {
            rawUrl = data.source_url;
          }
        }
      } catch {
        /* ignore firestore lookup timeout/error */
      }
    }

    const healed = await healAnnouncementLink(
      {
        source_url: rawUrl,
        source_portal: portal,
        title,
        id: id || undefined,
      },
      { checkLiveStatus: true }
    );

    const destination = isSafeRedirectUrl(healed.url) ? healed.url : 'https://www.olx.pl/d/praca/budowa-remonty/szczecin/';
    return NextResponse.redirect(destination, { status: 307 });
  } catch (e) {
    console.warn('Real-time redirect fallback:', (e as Error).message);
    const resolvedFallback = resolveOlxLink({ title, id: id ?? undefined, source_url: rawUrl ?? undefined, source_portal: portal ?? undefined });
    const destination = isSafeRedirectUrl(resolvedFallback.url) ? resolvedFallback.url : 'https://www.olx.pl/d/praca/budowa-remonty/szczecin/';
    return NextResponse.redirect(destination, { status: 307 });
  }
}
