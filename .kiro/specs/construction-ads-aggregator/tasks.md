# Implementation Plan: Construction Ads Aggregator

## Overview

This plan implements a production SaaS MVP for scraping, geocoding, and visualizing construction/renovation ads from the Szczecin area (50km radius). The implementation follows a bottom-up approach: shared types and utilities first, then core backend services (scraping, geocoding, deduplication), followed by the API layer, and finally the frontend components. Each task builds incrementally on previous work, with property-based tests integrated alongside implementation.

**Tech Stack:** Next.js (App Router, TypeScript) on Vercel, Firebase Cloud Functions v2 (Node.js), Firestore, Firebase Auth, Playwright + Stealth, React-Leaflet, Nodemailer, Vitest + fast-check.

## Tasks

- [x] 1. Set up project structure, shared types, and testing framework
  - [x] 1.1 Initialize project structure and configuration
    - Create directory structure: `functions/src/{scraper,deduplication,geocoding,notifications,batch}`, `app/api/announcements/`, `lib/validation/`, `components/map/`, `components/list/`, `components/navigation/`
    - Configure `tsconfig.json` for both Next.js frontend and Firebase Functions
    - Set up `vitest.config.ts` with coverage thresholds (lines: 80%, branches: 75%, functions: 80%)
    - Add `fast-check` as a dev dependency for property-based testing
    - Configure ESLint and Prettier for consistent code style
    - _Requirements: 11.1, 12.1_

  - [x] 1.2 Define shared TypeScript interfaces and data models
    - Create `lib/types/announcement.ts` with `Announcement`, `MaskedAnnouncement`, `ScrapedAd`, `SourcePortal` types
    - Create `lib/types/user.ts` with `UserProfile`, `NotificationPreferences` types
    - Create `lib/types/geo.ts` with `GeoCacheEntry`, `GeocodingResult`, `BoundingBox` types
    - Create `lib/types/api.ts` with `AnnouncementQueryParams`, `PaginatedResponse` types
    - Create `functions/src/scraper/types.ts` with `ScraperConfig`, `ScrapingResult`, `ScrapingError`, `PortalScraper` interfaces
    - _Requirements: 2.5, 8.1, 8.8, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 1.3 Set up Firestore configuration and indexes
    - Create `firestore.rules` enforcing tier-based data access (free users cannot read source_url, contact_info, or announcements newer than 48h)
    - Create `firestore.indexes.json` with composite indexes: (source_portal ASC, scraped_at DESC), (scraped_at DESC, source_portal ASC), (latitude ASC, longitude ASC, scraped_at DESC)
    - Configure Firebase project with Blaze plan settings
    - _Requirements: 5.4, 11.2, 11.3, 11.6_

- [x] 2. Implement deduplication service and batch writer
  - [x] 2.1 Implement deduplication key generation
    - Create `functions/src/deduplication/index.ts` with `generateDeduplicationKey` function
    - If native ID is non-empty: return `${sourcePortal}-${nativeId}`
    - If native ID is null/empty: return SHA-256 hex of `${title}|${publishedAt}|${description}`
    - Export `checkExists` and `batchCheckExists` for Firestore existence lookups
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Write property test for deduplication key generation
    - **Property 1: Deduplication key generation determinism**
    - Use fast-check arbitraries for portal names, native IDs, title/date/description strings
    - Verify determinism (same input → same output) and correct format for both branches
    - **Validates: Requirements 2.1, 2.2**

  - [x] 2.3 Implement batch write splitting utility
    - Create `functions/src/batch/index.ts` with `splitIntoBatches<T>(documents: T[], maxBatchSize: number): T[][]`
    - Default maxBatchSize of 500 documents per Firestore batch commit
    - Preserve document order across batches
    - _Requirements: 12.2_

  - [x] 2.4 Write property test for batch write splitting
    - **Property 13: Batch write splitting**
    - Verify: `Math.ceil(N / 500)` batches produced, each ≤ 500 items, total items preserved, order preserved
    - **Validates: Requirements 12.2**

- [x] 3. Implement geocoding service
  - [x] 3.1 Implement location text normalization
    - Create `functions/src/geocoding/normalize.ts` with `normalizeLocationText(text: string): string`
    - Steps: trim → collapse consecutive whitespace to single space → lowercase → truncate to 1500 bytes
    - _Requirements: 3.2, 11.4_

  - [x] 3.2 Write property test for location text normalization
    - **Property 2: Location text normalization is idempotent and case-insensitive**
    - Verify idempotency: `normalize(normalize(s)) === normalize(s)`
    - Verify case-insensitivity: strings differing only in case produce same output
    - Verify output ≤ 1500 bytes, trimmed, no consecutive whitespace
    - **Validates: Requirements 3.2, 11.4**

  - [x] 3.3 Implement Nominatim query builder and rate limiter
    - Create `functions/src/geocoding/nominatim.ts` with `buildNominatimQuery(trimmedText: string): string`
    - Implement `NominatimRateLimiter` class with 1000ms minimum interval between requests
    - Implement `query(text: string)` method returning `{ lat, lng }` or null
    - _Requirements: 3.4, 3.5_

  - [x] 3.4 Write property test for Nominatim query construction
    - **Property 3: Nominatim query construction appends geographic context**
    - Verify: for any trimmed non-empty text, output equals `${text}, Szczecin, Poland`
    - **Validates: Requirements 3.4**

  - [x] 3.5 Implement geocoding resolution with cache
    - Create `functions/src/geocoding/index.ts` with `resolveLocation(locationText, firestore): Promise<GeocodingResult>`
    - Check Geo_Cache first (case-insensitive, exact match after normalization)
    - On cache miss: query Nominatim, store result (positive or negative) in Geo_Cache
    - Handle empty/whitespace location_text by skipping geocoding entirely
    - Handle negative cache entries (null coords) as cache hits
    - Respect 30-day TTL — re-fetch stale entries
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 11.6_

- [x] 4. Checkpoint - Core utilities verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement scraper engine
  - [x] 5.1 Implement scraper configuration and User-Agent rotation
    - Create `functions/src/scraper/config.ts` with `ScraperConfig` defaults (6h cron, 500 max ads, 2-5s delay, 3 retries, 2s base delay, 2x multiplier)
    - Create `functions/src/scraper/user-agents.ts` with at least 5 User-Agent strings and rotation logic (different UA per request)
    - _Requirements: 1.1, 1.4_

  - [x] 5.2 Implement exponential backoff retry logic
    - Create `functions/src/scraper/retry.ts` with retry function using exponential backoff
    - Base delay 2000ms, multiplier 2, max 3 attempts (delays: 2000, 4000, 8000ms)
    - On all retries exhausted: log error with portal name, timestamp, failure reason to Cloud Logging and continue to next portal
    - _Requirements: 1.6, 1.7_

  - [x] 5.3 Write property test for exponential backoff calculation
    - **Property 14: Exponential backoff calculation**
    - Verify: for attempt n ∈ {0,1,2}, delay = 2000 * 2^n ms
    - **Validates: Requirements 1.6**

  - [x] 5.4 Implement OLX portal scraper
    - Create `functions/src/scraper/portals/olx.ts` implementing `PortalScraper` interface
    - Use playwright-extra with stealth plugin for browsing
    - Navigate to OLX Construction/Renovation category for Szczecin + 50km
    - Parse ad listings: extract title, description, price, location, contact info, native ID, URL
    - Limit to 500 ads per run
    - Introduce random delay 2-5s between page requests
    - _Requirements: 1.2, 1.3, 1.5_

  - [x] 5.5 Implement Oferteo portal scraper
    - Create `functions/src/scraper/portals/oferteo.ts` implementing `PortalScraper` interface
    - Same structure as OLX scraper adapted for Oferteo HTML structure
    - _Requirements: 1.2, 1.3, 1.5_

  - [x] 5.6 Implement Fixly portal scraper
    - Create `functions/src/scraper/portals/fixly.ts` implementing `PortalScraper` interface
    - Same structure as OLX scraper adapted for Fixly HTML structure
    - _Requirements: 1.2, 1.3, 1.5_

  - [x] 5.7 Implement scheduled scraper orchestrator
    - Create `functions/src/scraper/index.ts` with `scheduledScraper` Firebase Cloud Function v2
    - Configure as Scheduled Function with cron `0 */6 * * *`, timeout 540s, memory 1GiB
    - Orchestrate: for each portal → scrape → deduplicate → geocode → batch write to Firestore
    - Log summary on completion: ads scraped per portal, failed portals count
    - If a portal fails after retries, continue with remaining portals
    - Use `splitIntoBatches` for Firestore writes (groups of up to 500)
    - _Requirements: 1.1, 1.7, 1.8, 2.3, 2.4, 2.5, 2.6, 2.7, 12.2_

- [x] 6. Checkpoint - Scraper engine verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement password validation and authentication
  - [x] 7.1 Implement password validation
    - Create `lib/validation/password.ts` with `validatePassword(password: string)` function
    - Rules: ≥ 8 chars, at least one uppercase, one lowercase, one digit
    - Return `{ valid: true }` or `{ valid: false, reasons: string[] }`
    - _Requirements: 4.4_

  - [x] 7.2 Write property test for password validation
    - **Property 4: Password validation correctness**
    - Generate arbitrary strings; verify valid=true iff length≥8 AND has uppercase AND has lowercase AND has digit
    - **Validates: Requirements 4.4**

  - [x] 7.3 Implement Firebase Authentication integration
    - Create `lib/auth/index.ts` with registration and login flows using Firebase Authentication
    - On registration: create user profile in Firestore `users` collection with uid, email, display_name (max 100 chars), tier="free", created_at, updated_at
    - Implement ID token verification utility for API routes
    - Handle errors: existing email, invalid credentials (generic message), service unavailable
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7_

- [x] 8. Implement API layer with tier-based access control
  - [x] 8.1 Implement query parameter validation
    - Create `app/api/announcements/validate.ts` with `validateQueryParams` function
    - Validate: page ≥ 1, limit 1-100, bounding_box format (4 comma-separated decimals), source_portal one of olx/oferteo/fixly
    - Return parsed params on success or error description on failure
    - _Requirements: 8.1, 8.4_

  - [x] 8.2 Write property test for query parameter validation
    - **Property 10: Query parameter validation**
    - Generate arbitrary objects with random types/values; verify correct accept/reject decisions
    - **Validates: Requirements 8.4**

  - [x] 8.3 Implement tier-based announcement masking
    - Create `app/api/announcements/masking.ts` with `applyTierMasking(announcements, tier, currentTime)` function
    - Free tier: filter to scraped_at > 48h old, truncate description (100 chars + "..."), omit source_url and contact_info
    - Premium tier: return all announcements with full data
    - _Requirements: 5.1, 5.2, 5.3, 8.6, 8.7_

  - [x] 8.4 Write property tests for tier-based filtering and masking
    - **Property 5: Tier-based time filtering**
    - Verify: free tier returns only ads older than 48h; premium returns all; free ⊆ premium
    - **Property 6: Free-tier description masking**
    - Verify: descriptions > 100 chars truncated + "..."; ≤ 100 chars unchanged; no source_url/contact_info
    - **Validates: Requirements 5.1, 5.2, 5.3, 8.6, 8.7**

  - [x] 8.5 Implement pagination calculation
    - Create `app/api/announcements/pagination.ts` with `calculatePagination(totalCount, page, pageSize)` function
    - Return: total_pages = ceil(total_count / page_size), current_page, page_size
    - Handle total_count = 0 → total_pages = 0
    - _Requirements: 8.8_

  - [x] 8.6 Write property test for pagination metadata
    - **Property 11: Pagination metadata calculation**
    - Verify: total_pages = Math.ceil(total_count / page_size), correct current_page and page_size
    - **Validates: Requirements 8.8**

  - [x] 8.7 Implement /api/announcements GET endpoint
    - Create `app/api/announcements/route.ts` as Next.js API route
    - Verify Firebase ID token from Authorization header (Bearer format)
    - Return 401 for invalid/missing token, 400 for invalid params
    - Query user profile for tier determination
    - Implement in-memory cache with 60-second TTL for Firestore reads
    - Apply tier masking and pagination
    - Return paginated JSON response with data array and metadata object
    - Support bounding_box spatial filtering
    - _Requirements: 5.5, 5.6, 5.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 12.3, 12.4, 12.5_

- [x] 9. Implement notification processor
  - [x] 9.1 Implement haversine distance and radius check
    - Create `functions/src/notifications/distance.ts` with `haversineDistanceKm(lat1, lng1, lat2, lng2)` function
    - Create `isWithinRadius(announcement, prefs)` function using haversine result against radius
    - _Requirements: 6.1_

  - [x] 9.2 Write property test for haversine distance and radius check
    - **Property 7: Haversine distance and radius check**
    - Verify: isWithinRadius ↔ haversineDistanceKm ≤ R; commutativity; zero distance for same point
    - **Validates: Requirements 6.1**

  - [x] 9.3 Implement notification consolidation and email sending
    - Create `functions/src/notifications/consolidate.ts` with `consolidateForEmail(announcements)` → max 10, first 10 preserving order
    - Create `functions/src/notifications/email.ts` with `sendNotificationEmail` using Nodemailer
    - Email body includes: announcement title, location_text, and price for each matching ad
    - On delivery failure: log error, do not retry
    - _Requirements: 6.2, 6.3, 6.4, 6.6_

  - [x] 9.4 Write property test for notification consolidation
    - **Property 8: Notification consolidation respects maximum**
    - Verify: output length = min(input.length, 10); items are first 10 from input; order preserved
    - **Validates: Requirements 6.6**

  - [x] 9.5 Implement notification trigger on new announcements
    - Create `functions/src/notifications/index.ts` with notification processor
    - On new announcement stored: find premium users with configured notification radius
    - Check if announcement coordinates are within each user's radius
    - Consolidate matching announcements within 5-minute window
    - Send within 5 minutes of storage; skip users without notification_prefs configured
    - _Requirements: 6.1, 6.5_

- [x] 10. Checkpoint - Backend fully implemented
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement interactive map component
  - [x] 11.1 Implement Map component with React-Leaflet
    - Create `components/map/MapComponent.tsx` as a client component
    - Render OpenStreetMap tile layer centered on Szczecin (53.4285, 14.5528), default zoom 10
    - Display only announcements with non-null latitude AND longitude as markers
    - Implement marker clustering with count display using react-leaflet-markercluster
    - On marker click: show popup with title, location_text, price (or "Price not listed" if null), link to detail view
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 11.2 Write property test for map marker coordinate filtering
    - **Property 9: Map marker coordinate filtering**
    - Verify: rendered markers only include announcements with non-null lat AND non-null lng
    - **Validates: Requirements 7.2**

  - [x] 11.3 Implement map data fetching and viewport tracking
    - On mount: fetch announcements from /api/announcements with current map bounding box
    - On pan/zoom (viewport change): re-fetch announcements for new bounding box
    - Display loading indicator while fetching
    - Display error message with retry option on API failure or no data
    - _Requirements: 7.5, 7.6, 7.7, 7.8_

- [x] 12. Implement announcement list view
  - [x] 12.1 Implement list view with infinite scroll
    - Create `components/list/AnnouncementList.tsx` displaying cards sorted by scraped_at descending
    - Each card shows: title, location_text, price, source_portal badge, scraped_at date
    - Implement infinite scroll: load next 20 announcements on scroll to bottom
    - Show loading indicator below last card during page load
    - Show end-of-list message when no more announcements available
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 12.2 Write property test for announcement list sort order
    - **Property 12: Announcement list sort order**
    - Verify: for all consecutive pairs, a[i].scraped_at >= a[i+1].scraped_at
    - **Validates: Requirements 10.1**

  - [x] 12.3 Implement announcement detail view with tier restrictions
    - Create `components/list/AnnouncementDetail.tsx` showing all accessible fields per user tier
    - For free users: show lock icon on masked fields with tappable prompt to Premium upgrade screen
    - For empty results: display empty-state message
    - _Requirements: 10.5, 10.6, 10.7_

- [x] 13. Implement mobile-first UI and navigation
  - [x] 13.1 Implement Bottom Navigation Bar
    - Create `components/navigation/BottomNav.tsx` with tabs: Map, List, Notifications, Profile
    - Touch targets at least 44x44 CSS pixels
    - Fixed position at bottom of viewport
    - Visually distinguish active tab from inactive tabs
    - Apply CSS transitions (200-300ms) on tab switches
    - Reserve bottom spacing so content is not obscured by the nav bar
    - _Requirements: 9.1, 9.2, 9.4, 9.6_

  - [x] 13.2 Implement responsive layout with adaptive navigation
    - At viewport ≤ 768px: show Bottom_Navigation_Bar as primary navigation
    - At viewport > 768px: show side navigation panel instead
    - Ensure no horizontal scrolling for viewports 320px to 1440px
    - Visually distinguish active section in both layouts
    - _Requirements: 9.3, 9.4, 9.5_

- [x] 14. Checkpoint - Frontend fully implemented
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Integration wiring and final verification
  - [x] 15.1 Wire scraper to notification processor
    - After batch writing new announcements in the scraper orchestrator, trigger the notification processor for newly stored ads
    - Ensure notifications are sent within 5 minutes of storage
    - _Requirements: 6.1_

  - [x] 15.2 Wire frontend pages and navigation routes
    - Connect Map, List, Notifications, and Profile tabs to their respective page components
    - Wire login/registration flow with Firebase Auth and redirect to main app on success
    - Connect announcement detail view navigation from both map popups and list cards
    - _Requirements: 7.4, 9.1, 10.5_

  - [x] 15.3 Write integration tests for end-to-end flows
    - Test scraper → deduplication → geocoding → Firestore write flow with Firebase Emulator
    - Test API endpoint request lifecycle with auth and tier-based filtering
    - Test geocoding cache hit/miss flows
    - _Requirements: 1.1, 2.3, 3.1, 8.2, 8.5_

- [x] 16. Final checkpoint - All tests pass and system is wired
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The scraper portal implementations (5.4, 5.5, 5.6) will need HTML fixture files from actual portal pages for testing — these should be captured manually during development
- Firestore Security Rules (task 1.3) work in conjunction with server-side API enforcement (task 8.7) for defense-in-depth access control
- The in-memory cache (task 8.7) is a simple Map with TTL, suitable for serverless since each invocation has fresh state — it helps within a single request lifecycle for repeated reads

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.3", "3.1", "7.1"] },
    { "id": 3, "tasks": ["2.2", "2.4", "3.2", "3.3", "7.2"] },
    { "id": 4, "tasks": ["3.4", "3.5", "5.1", "7.3"] },
    { "id": 5, "tasks": ["5.2", "5.4", "5.5", "5.6", "8.1", "8.3", "8.5"] },
    { "id": 6, "tasks": ["5.3", "5.7", "8.2", "8.4", "8.6"] },
    { "id": 7, "tasks": ["8.7", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3"] },
    { "id": 9, "tasks": ["9.4", "9.5"] },
    { "id": 10, "tasks": ["11.1"] },
    { "id": 11, "tasks": ["11.2", "11.3", "12.1"] },
    { "id": 12, "tasks": ["12.2", "12.3", "13.1"] },
    { "id": 13, "tasks": ["13.2"] },
    { "id": 14, "tasks": ["15.1", "15.2"] },
    { "id": 15, "tasks": ["15.3"] }
  ]
}
```
