import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { verifyIdToken } from '@/lib/auth/server';
import { adminFirestore } from '@/lib/firebase/admin';
import { validateAndSanitize } from '@/lib/validation/input';
import type { Announcement } from '@/lib/types/announcement';
import type { PaginatedResponse } from '@/lib/types/api';
import type { MaskedAnnouncement } from '@/lib/types/announcement';

import { validateQueryParams } from './validate';
import { applyTierMasking } from './masking';
import { calculatePagination } from './pagination';

// --- User Context Resolution ---

interface UserContext {
  tier: 'free' | 'premium';
  isGuest: boolean;
  uid: string | null;
}

/**
 * Resolves the user context from the request.
 * - No token or invalid token → guest mode (free tier)
 * - Valid token → look up user profile for tier
 */
async function resolveUserContext(request: Request): Promise<UserContext> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { tier: 'free', isGuest: true, uid: null };
  }

  const token = authHeader.slice(7);
  const result = await verifyIdToken(token);

  if (!result.success) {
    return { tier: 'free', isGuest: true, uid: null };
  }

  const userDoc = await adminFirestore.collection('users').doc(result.data.uid).get();
  const tier = userDoc.exists && userDoc.data()?.tier === 'premium' ? 'premium' : 'free';

  return { tier, isGuest: false, uid: result.data.uid };
}

// --- Input Validation Schema for Query Params ---

const QUERY_PARAMS_SCHEMA = {
  page: { type: 'string' as const, maxLength: 10 },
  limit: { type: 'string' as const, maxLength: 10 },
  source_portal: { type: 'string' as const, maxLength: 20 },
  bounding_box: { type: 'string' as const, maxLength: 100 },
};

// --- In-Memory Cache ---

interface CacheEntry {
  data: PaginatedResponse<MaskedAnnouncement>;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Build a cache key from query params and user tier.
 */
function buildCacheKey(params: Record<string, string>, tier: string): string {
  const sortedEntries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  return `${tier}:${sortedEntries.map(([k, v]) => `${k}=${v}`).join('&')}`;
}

/**
 * GET /api/announcements
 *
 * Returns paginated, tier-masked announcements.
 * Supports both authenticated and unauthenticated (guest) requests.
 * - Authenticated users get tier-based access (free or premium).
 * - Guests (no token or invalid token) get free-tier masked data.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    // 1. Validate and sanitize query params (before auth resolution)
    const url = new URL(request.url);
    const rawParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const inputValidation = validateAndSanitize(rawParams, QUERY_PARAMS_SCHEMA, 'query');
    if (!inputValidation.valid) {
      const firstError = inputValidation.errors[0];
      return NextResponse.json(
        { error: `${firstError.field}: ${firstError.reason}` },
        { status: 400 }
      );
    }

    // 2. Validate query params with domain-specific rules
    const validation = validateQueryParams(rawParams);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { parsed: queryParams } = validation;

    // 3. Resolve user context (optional auth — no 401 returned)
    const { tier } = await resolveUserContext(request);

    // 4. Check in-memory cache
    const cacheKey = buildCacheKey(rawParams, tier);
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data);
    }

    // Cache miss or expired — discard stale entry
    if (cached) {
      cache.delete(cacheKey);
    }

    // 5. Query Firestore announcements collection with filters
    let query = adminFirestore.collection('announcements')
      .orderBy('scraped_at', 'desc');

    // Apply source_portal filter
    if (queryParams.source_portal) {
      query = query.where('source_portal', '==', queryParams.source_portal);
    }

    // Execute query to get all matching documents (for bounding_box filtering and total count)
    const snapshot = await query.get();

    // Convert Firestore documents to Announcement objects
    let announcements: Announcement[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        deduplication_key: doc.id,
        title: data.title,
        description: data.description,
        source_url: data.source_url,
        source_portal: data.source_portal,
        category: data.category,
        location_text: data.location_text,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        price: data.price ?? null,
        contact_info: data.contact_info ?? null,
        scraped_at: data.scraped_at?.toDate ? data.scraped_at.toDate() : new Date(data.scraped_at),
        published_at: data.published_at?.toDate
          ? data.published_at.toDate()
          : data.published_at
            ? new Date(data.published_at)
            : null,
      };
    });

    // Apply bounding_box spatial filtering
    if (queryParams.bounding_box) {
      const { south_lat, west_lng, north_lat, east_lng } = queryParams.bounding_box;
      announcements = announcements.filter((a) => {
        if (a.latitude === null || a.longitude === null) return false;
        return (
          a.latitude >= south_lat &&
          a.latitude <= north_lat &&
          a.longitude >= west_lng &&
          a.longitude <= east_lng
        );
      });
    }

    // 6. Apply tier masking
    const currentTime = new Date();
    const maskedAnnouncements = applyTierMasking(announcements, tier, currentTime);

    // 7. Calculate pagination
    const totalCount = maskedAnnouncements.length;
    const metadata = calculatePagination(totalCount, queryParams.page, queryParams.limit);

    // Slice results for current page
    const startIndex = (queryParams.page - 1) * queryParams.limit;
    const endIndex = startIndex + queryParams.limit;
    const pageData = maskedAnnouncements.slice(startIndex, endIndex);

    // 8. Build response and store in cache
    const response: PaginatedResponse<MaskedAnnouncement> = {
      data: pageData,
      metadata,
    };

    cache.set(cacheKey, {
      data: response,
      expiresAt: now + CACHE_TTL_MS,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/announcements:', error);

    // If Firestore is unavailable (no credentials), return empty results gracefully
    const firebaseError = error as { code?: string | number; message?: string };
    if (
      firebaseError.code === 'app/no-credential' ||
      firebaseError.message?.includes('Could not load the default credentials') ||
      firebaseError.code === 7 || // PERMISSION_DENIED
      String(firebaseError.code) === '7' ||
      firebaseError.message?.includes('Missing or insufficient permissions')
    ) {
      return NextResponse.json({
        data: [],
        metadata: {
          currentPage: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
