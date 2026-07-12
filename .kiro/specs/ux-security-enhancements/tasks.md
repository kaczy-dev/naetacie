# Implementation Plan: UX & Security Enhancements

## Overview

This plan implements six major enhancement areas for the Construction Ads Aggregator: guest browsing mode, authentication improvements (email verification + Google OAuth), OWASP security hardening (input validation, rate limiting, security headers, CSRF, token management), README documentation, mobile-first UI/UX overhaul (animations, dark mode, responsive design), and Firestore security rules audit. Implementation is in TypeScript using Next.js App Router, Firebase, React, and Framer Motion.

## Tasks

- [x] 1. Set up design system foundations and theming infrastructure
  - [x] 1.1 Create CSS custom properties and design tokens
    - Create `styles/tokens.css` with CSS custom properties for the full color palette (primary, success, warning, error, neutral scale), typography scale (body 14-16px, headings H1-H3, captions 12px, line-height 1.5), and spacing scale (4px grid: 4, 8, 12, 16, 24, 32, 48, 64px)
    - Define light theme tokens on `:root` and dark theme tokens on `[data-theme="dark"]` selector
    - Dark surfaces: gray-900 background, gray-800 cards; light text: gray-100 primary, gray-400 secondary; adjusted primary brightness for minimum 4.5:1 contrast ratio
    - _Requirements: 13.1, 13.2, 13.3, 13.6_

  - [x] 1.2 Implement ThemeProvider component
    - Create `components/theme/ThemeProvider.tsx` with context providing `mode`, `resolvedTheme`, and `setMode`
    - Support 'light', 'dark', 'system' modes; detect system preference via `prefers-color-scheme` media query
    - Persist preference to localStorage key `theme-preference`
    - Apply `data-theme` attribute to document element on mode change
    - Auto-apply dark mode on first visit when OS preference is dark
    - _Requirements: 13.4, 13.5_

  - [x] 1.3 Write property tests for theme persistence and contrast
    - **Property 17: Theme preference round-trip persistence**
    - **Property 18: Dark mode contrast ratio compliance**
    - **Validates: Requirements 13.5, 13.6**

- [x] 2. Implement security middleware layer
  - [x] 2.1 Create rate limiter middleware
    - Create `lib/middleware/rateLimiter.ts` with in-memory sliding window implementation
    - Implement `checkRateLimit(clientIp, config)` returning `{ allowed, retryAfterSeconds, remaining }`
    - Track request timestamps per IP in a `Map<string, number[]>`; prune expired entries on each check
    - General endpoints: 100 requests per 60-second window; Auth endpoints: 10 requests per 60-second window
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.2 Write property tests for rate limiter
    - **Property 11: Rate limiter enforces sliding window threshold**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [x] 2.3 Create input validation and sanitization module
    - Create `lib/validation/input.ts` with `validateAndSanitize(input, schema)`, `sanitizeString(input)`, and `stripHtmlTags(input)`
    - Implement schema-based validation supporting types: string, number, boolean, email with optional rules: required, maxLength, min, max, pattern
    - Sanitize by removing HTML tags, script elements, event handler attributes, and SQL injection patterns
    - Enforce max lengths: 200 chars for query params, 1000 chars for body fields
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.4 Write property tests for input validation
    - **Property 8: Input sanitization removes dangerous patterns**
    - **Property 9: Input validation rejects oversized parameters**
    - **Property 10: Input validation error responses contain field and reason**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.1, 4.2**

  - [x] 2.5 Create CSRF protection module
    - Create `lib/middleware/csrf.ts` with `generateCsrfToken()` (32-byte random hex) and `validateCsrfToken(cookieToken, headerToken)`
    - Cookie config: `__csrf`, Secure, HttpOnly, SameSite=Strict
    - Validation: both tokens must be non-empty and identical
    - _Requirements: 6.3, 6.4_

  - [x] 2.6 Write property tests for CSRF validation
    - **Property 12: CSRF token validation accepts matching pairs only**
    - **Validates: Requirements 6.3**

  - [x] 2.7 Create error sanitization utility
    - Create `lib/middleware/errorSanitizer.ts` that wraps error handling for API routes
    - In production: always return `{ error: "Internal server error" }` with status 500 for unhandled exceptions
    - Never expose stack traces, file paths, database queries, or internal identifiers in responses
    - Log full error details server-side via `console.error`
    - _Requirements: 6.5, 6.6_

  - [x] 2.8 Write property tests for error sanitization
    - **Property 13: Error response sanitization**
    - **Validates: Requirements 6.5, 6.6**

  - [x] 2.9 Implement Next.js security headers middleware
    - Create/update `middleware.ts` to apply security headers on all responses
    - Set Content-Security-Policy: script-src 'self', style-src 'self' 'unsafe-inline', img-src 'self' data: *.tile.openstreetmap.org, connect-src 'self' and Firebase API domains, frame-ancestors 'none'
    - Set X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin
    - Integrate rate limiter middleware (apply before auth verification)
    - Enforce 10KB request body size limit, returning HTTP 413 if exceeded
    - _Requirements: 6.1, 6.2, 4.5, 5.5_

- [x] 3. Checkpoint - Ensure security middleware tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement authentication improvements
  - [x] 4.1 Create Auth Context Provider with guest mode support
    - Create `lib/auth/AuthContext.tsx` with `AuthState` and `AuthContextValue` interfaces
    - Implement `signInWithEmail`, `signInWithGoogle`, `register`, `signOut`, `resendVerificationEmail`, `refreshToken`
    - Track `isGuest` (true when no user), `isEmailVerified` from Firebase user object
    - Wrap app in AuthProvider in `app/layout.tsx`
    - _Requirements: 1.1, 2.5, 2.6, 2.7, 3.2_

  - [x] 4.2 Implement Token Manager
    - Create `lib/auth/tokenManager.ts` implementing `startAutoRefresh`, `stopAutoRefresh`, `getValidToken`, `clearAuthState`, `retryWithFreshToken`
    - Auto-refresh when token has < 5 minutes remaining before expiry
    - On expired token that cannot be refreshed: redirect to login with "Session expired" message
    - On HTTP 401 response: attempt one token refresh and retry before redirecting
    - Clear all auth state (tokens, cached user data) from localStorage on sign-out
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 4.3 Write property tests for token manager
    - **Property 14: Token refresh triggers at correct threshold**
    - **Property 15: Sign-out clears all auth state**
    - **Validates: Requirements 7.1, 7.4**

  - [x] 4.4 Implement Google Sign-In integration
    - Add Google sign-in to `lib/auth/client.ts` using Firebase Google Auth provider
    - On first Google login: create Firestore user profile with uid, email, display_name from Google, tier="free", auth_provider="google", email_verified=true, notification_prefs=null, valid timestamps
    - On subsequent Google login: sign in without modifying existing profile
    - Handle OAuth cancellation/failure gracefully: return to login page, preserve form data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.5 Write property tests for Google auth
    - **Property 6: Google first-login creates correct profile**
    - **Property 7: Google re-authentication is idempotent**
    - **Validates: Requirements 3.3, 3.4**

  - [x] 4.6 Implement form validation with real-time feedback
    - Create `lib/validation/formValidator.ts` with real-time email format validation (inline error within 300ms), password strength indicator (tracks 4 criteria: length>=8, uppercase, lowercase, digit), and empty field detection
    - Export hooks or utilities for the login/registration form components
    - Visual indicator: green checkmark or filled progress when all password criteria are met
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.7 Write property tests for form validation
    - **Property 3: Form validation produces correct errors for all invalid states**
    - **Property 4: Password strength indicator correctness**
    - **Property 5: Form data preservation on submission error**
    - **Validates: Requirements 2.1, 2.4, 2.2, 2.3, 2.8, 3.5**

  - [x] 4.8 Update Login page with Google OAuth, email verification, and improved UX
    - Add "Sign in with Google" button styled per Google branding guidelines
    - Add real-time email validation and password strength indicator to form
    - Show persistent verification banner for unverified email users with resend option (disabled for 60s after sending)
    - Disable submit button and show loading spinner during submission
    - Preserve all form data on error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1_

- [x] 5. Checkpoint - Ensure authentication tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement guest browsing mode
  - [x] 6.1 Modify API route to support unauthenticated requests
    - Update `app/api/announcements/route.ts` to make auth optional using `resolveUserContext` pattern
    - When no valid Bearer token is present: return HTTP 200 with free-tier masked data instead of 401
    - When token is invalid/expired: fallback to guest mode (free tier) instead of 401
    - Apply input validation and rate limiting before auth resolution
    - _Requirements: 1.5, 1.2_

  - [x] 6.2 Write property tests for guest API access
    - **Property 1: Guest tier masking invariants**
    - **Property 2: Unauthenticated API requests receive guest-tier data**
    - **Validates: Requirements 1.2, 1.5**

  - [x] 6.3 Update main page for guest browsing
    - Modify `app/page.tsx` to render map and list views without requiring authentication
    - Use AuthContext to determine guest vs authenticated state
    - Display non-intrusive banner for guest users informing them of delayed data and registration benefits
    - Allow guest users to navigate between map and list tabs
    - When guest attempts premium features (notifications, profile): show register/sign-in prompt
    - _Requirements: 1.1, 1.3, 1.4, 1.6_

  - [x] 6.4 Update AnnouncementList to work in guest mode
    - Modify `components/list/AnnouncementList.tsx` to fetch without Bearer token when user is guest
    - Handle the absence of auth gracefully; show guest-appropriate UI
    - _Requirements: 1.1, 1.6_

- [x] 7. Implement UI components and feedback systems
  - [x] 7.1 Create Toast notification system
    - Create `components/feedback/ToastProvider.tsx` with context providing `show(type, message)` and `dismiss(id)`
    - Support success (auto-dismiss 3s), error (persist 5s or manual dismiss), info types
    - Animate: slide-in from top with spring animation (overshoot, 300ms) and fade-out (200ms)
    - Wrap app in ToastProvider in layout
    - _Requirements: 12.4, 12.5, 14.4_

  - [x] 7.2 Create Loading Skeleton components
    - Create `components/feedback/ListSkeleton.tsx` matching card layout (title line, location line, price block) with pulsing animation
    - Create `components/feedback/MapSkeleton.tsx` matching map container dimensions with pulsing animation
    - Replace generic spinners with skeleton placeholders during data fetch
    - _Requirements: 12.1, 12.2_

  - [x] 7.3 Implement Pull-to-Refresh for mobile
    - Create pull-to-refresh gesture handler for the announcement list on mobile
    - Display pull indicator at top; trigger data reload on release past 60px threshold
    - _Requirements: 12.3_

  - [x] 7.4 Create empty state component
    - Create `components/feedback/EmptyState.tsx` with illustrative icon, descriptive message, and suggested action
    - Use when announcement list or map returns zero results
    - _Requirements: 12.6_

  - [x] 7.5 Implement card-based announcement design
    - Refactor `AnnouncementList` to use new card design: title (bold, 16-18px), location (14px, map pin icon), price (semi-bold, 16px, accent color), source portal badge (chip), scraped_at relative time (12px, muted)
    - Card styling: 12-16px border radius, subtle box shadow, 16px padding, 12px gap
    - Entrance animation: fade-in + translateY(8px→0), stagger 50ms between cards
    - Press feedback on mobile: scale-down to 0.98 for 100ms
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 7.6 Write property tests for card and stagger animation
    - **Property 16: Announcement card contains all required fields**
    - **Property 19: Stagger animation delay computation**
    - **Validates: Requirements 11.1, 14.3**

- [x] 8. Implement responsive layout and animations
  - [x] 8.1 Add Framer Motion and update responsive navigation
    - Install `framer-motion` dependency
    - Update `ResponsiveLayout.tsx` and `BottomNav.tsx` to use Framer Motion for entrance animations (slide-up for bottom nav)
    - Add content transition animation: horizontal slide with spring physics (250-350ms, slight overshoot)
    - Add swipe gesture support on mobile for tab navigation with velocity-based completion
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6_

  - [x] 8.2 Implement micro-interactions
    - Button press: scale-down 0.95-0.97 for 100ms, spring-back to 1.0
    - Tab change in BottomNav: animate active indicator (color + icon scale) with 200ms ease-out
    - List items: stagger entrance with 50ms delay, fade-in + translateY
    - Respect `prefers-reduced-motion`: disable or significantly reduce all motion
    - _Requirements: 14.1, 14.2, 14.3, 14.5_

  - [x] 8.3 Add dark mode toggle to profile/settings area
    - Add theme toggle UI in the profile tab
    - Connect to ThemeProvider setMode
    - _Requirements: 13.5_

- [x] 9. Checkpoint - Ensure UI component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Update Firestore security rules
  - [x] 10.1 Update firestore.rules for guest access and tightened security
    - Allow unauthenticated read access to announcements collection restricted to documents where scraped_at > 48 hours old
    - Allow authenticated premium users full read access to all announcements
    - Restrict authenticated free-tier users to documents where scraped_at > 48 hours
    - Deny all client-side write operations on announcements and geo_cache collections
    - Allow users to read/create their own profile; update only display_name, notification_prefs, updated_at; prevent modification of uid, email, tier, created_at
    - Deny all read and write on geo_cache from client SDKs
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 10.2 Write integration tests for Firestore security rules
    - Test unauthenticated read (48h restriction)
    - Test authenticated read (tier-based)
    - Test write denial on announcements/geo_cache
    - Test profile field-level update restrictions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Create README documentation
  - [x] 11.1 Write comprehensive README.md
    - Create README.md at repository root with sections: project overview, architecture diagram (Mermaid), tech stack, prerequisites, local setup (clone, install, Firebase emulator, env file, dev server), environment variables (with placeholders), deployment guide (Vercel + Firebase CLI), API documentation (all endpoints with methods, params, schemas, examples), and testing guide (unit, property, integration, e2e)
    - Document all required environment variables with descriptions, formats, and example values
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 12. Final integration and wiring
  - [x] 12.1 Wire all providers together in app layout
    - Update `app/layout.tsx` to include: AuthProvider, ThemeProvider, ToastProvider
    - Import global `styles/tokens.css`
    - Ensure correct provider nesting order
    - _Requirements: 1.1, 13.4_

  - [x] 12.2 Integration verification
    - Verify guest browsing flow works end-to-end (unauthenticated → map/list → guest banner)
    - Verify auth flow: register → email verification → login → full access
    - Verify Google OAuth: sign in → profile creation → subsequent sign-in
    - Verify security: rate limiting, CSRF, security headers present on responses
    - Verify theme switching and persistence
    - _Requirements: 1.1, 1.5, 2.5, 3.2, 5.1, 6.1, 13.5_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project already uses Vitest + fast-check for property-based testing
- Framer Motion is added for spring physics animations and gesture support
- CSS custom properties enable instant theme switching without re-renders

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.3", "2.5", "2.7"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.4", "2.6", "2.8", "2.9"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.4", "4.6"] },
    { "id": 3, "tasks": ["4.3", "4.5", "4.7", "4.8"] },
    { "id": 4, "tasks": ["6.1", "6.3", "6.4"] },
    { "id": 5, "tasks": ["6.2", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["7.5", "7.6", "8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3"] },
    { "id": 8, "tasks": ["10.1", "11.1"] },
    { "id": 9, "tasks": ["10.2", "12.1"] },
    { "id": 10, "tasks": ["12.2"] }
  ]
}
```
