/**
 * Real-Time Direct Offer Redirect & Live Link Resolver API.
 * Guarantees clicking "OTWÓRZ" ALWAYS takes the user to an active live job offer or its healed portal equivalent.
 */

import { NextResponse } from 'next/server';
import { healAnnouncementLink } from '@/lib/verification/linkHealer';
import { adminFirestore } from '@/lib/firebase/admin';
import { resolveOlxLink } from '@/lib/olx/olxLinkResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  let rawUrl = url.searchParams.get('url');
  const portal = url.searchParams.get('portal');
  const title = url.searchParams.get('title');
  const id = url.searchParams.get('id');

  try {
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
          if (data?.source_url) {
            rawUrl = data.source_url;
          }
        }
      } catch {
        /* ignore firestore lookup timeout/error */
      }
    }

    const healed = await healAnnouncementLink({
      source_url: rawUrl,
      source_portal: portal,
      title,
      id: id || undefined,
    });

    return NextResponse.redirect(healed.url, { status: 307 });
  } catch (e) {
    console.warn('Real-time redirect fallback:', (e as Error).message);
    const resolvedFallback = resolveOlxLink({ title, id, source_url: rawUrl, source_portal: portal });
    return NextResponse.redirect(resolvedFallback.url, { status: 307 });
  }
}
