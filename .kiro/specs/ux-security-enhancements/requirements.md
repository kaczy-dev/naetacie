# Requirements Document

## Introduction

Enhancement suite for the Construction Ads Aggregator SaaS MVP covering six areas: guest browsing mode for unauthenticated users, authentication flow improvements with email verification and Google OAuth, OWASP Top 10 security hardening, comprehensive README documentation, and a complete mobile-first UI/UX overhaul with animations, dark mode, and responsive design. The project is a Next.js App Router application with Firebase (Auth, Firestore), React-Leaflet map, and CSS modules/inline styles.

## Glossary

- **Aggregator**: The complete Construction Ads Aggregator SaaS system
- **Guest_User**: An unauthenticated user who can browse announcements in read-only mode with free-tier restrictions (48-hour delay, masked fields)
- **Authenticated_User**: A user who has signed in via email/password or Google OAuth
- **Auth_Service**: The Firebase Authentication module handling user identity
- **API_Layer**: The Next.js API routes at /api/* serving announcement data
- **Rate_Limiter**: Middleware that tracks and limits request frequency per client IP or user
- **CSRF_Token**: A server-generated token used to prevent Cross-Site Request Forgery attacks
- **CSP_Header**: Content-Security-Policy HTTP header restricting resource loading origins
- **Input_Validator**: Server-side module that sanitizes and validates all API request parameters
- **Token_Manager**: Client-side module handling Firebase ID token refresh and expiry
- **Bottom_Navigation_Bar**: Mobile fixed navigation component at the bottom of the viewport
- **Side_Navigation**: Desktop navigation panel on the left side of the viewport
- **Loading_Skeleton**: A placeholder UI element that mimics content layout while data loads
- **Toast_Notification**: A brief, non-blocking message overlay that auto-dismisses after a timeout
- **Design_System**: The unified set of colors, typography, spacing, and component styles
- **Dark_Mode**: An alternate color scheme using dark backgrounds and light foregrounds
- **Micro_Interaction**: A small animation triggered by user actions (button press, tab switch, list item appear)
- **Pull_To_Refresh**: A mobile gesture where pulling down from the top of a scrollable area triggers data reload
- **Form_Validator**: Client-side module providing real-time validation feedback on form inputs
- **Email_Verification_Service**: Firebase Auth module that sends verification emails after registration

## Requirements

### Requirement 1: Guest Browsing Mode

**User Story:** As an unauthenticated visitor, I want to browse announcements on the map and list without creating an account, so that I can evaluate the platform before committing to registration.

#### Acceptance Criteria

1. WHEN an unauthenticated visitor navigates to the main page, THE Aggregator SHALL render the map and list views in read-only mode without requiring login or registration
2. WHEN a Guest_User views announcements, THE Aggregator SHALL apply the same data restrictions as the free tier: only Announcements where scraped_at is older than 48 hours, with description masked (first 100 characters followed by "..." if exceeding 100 characters), and source_url and contact_info fields omitted
3. WHEN a Guest_User attempts to access premium features (notifications, profile settings), THE Aggregator SHALL display a prompt directing the user to register or sign in
4. THE Aggregator SHALL display a non-intrusive banner or indicator informing Guest_Users that they are viewing delayed data and can register for full access
5. WHEN the API_Layer receives a request without a valid Firebase ID token, THE API_Layer SHALL treat the request as a guest request and return data with free-tier restrictions applied, instead of returning HTTP 401
6. THE Aggregator SHALL allow Guest_Users to navigate between the map and list tabs without authentication

### Requirement 2: Authentication Flow Improvements

**User Story:** As a user, I want a reliable and user-friendly login and registration experience with proper validation and email verification, so that I can securely access my account.

#### Acceptance Criteria

1. WHEN a user enters an email in the registration or login form, THE Form_Validator SHALL validate the email format in real-time and display an inline error message within 300ms if the format is invalid
2. WHEN a user types a password in the registration form, THE Form_Validator SHALL display a real-time password strength indicator showing which criteria are met: minimum 8 characters, at least one uppercase letter, at least one lowercase letter, and at least one digit
3. WHEN all password criteria are met, THE Form_Validator SHALL visually indicate the password is acceptable using a green checkmark or filled progress indicator
4. WHEN a required field is empty and the user attempts to submit the form, THE Form_Validator SHALL prevent submission and display inline error messages for each empty required field
5. WHEN a user successfully registers, THE Email_Verification_Service SHALL send a verification email to the registered email address within 60 seconds
6. WHEN a user who has not verified their email attempts to sign in, THE Aggregator SHALL allow sign-in but display a persistent banner prompting email verification with a resend option
7. WHEN the user clicks the resend verification email option, THE Email_Verification_Service SHALL send a new verification email and disable the resend button for 60 seconds to prevent abuse
8. IF the registration or login form submission results in an error, THEN THE Aggregator SHALL display the error message and preserve all user-entered form data without clearing fields
9. THE Aggregator SHALL disable the submit button and display a loading spinner during form submission to prevent duplicate submissions

### Requirement 3: Google Sign-In Integration

**User Story:** As a user, I want to sign in with my Google account, so that I can access the platform without creating a separate email/password credential.

#### Acceptance Criteria

1. THE Aggregator SHALL display a "Sign in with Google" button on the login and registration pages, styled according to Google's branding guidelines
2. WHEN a user clicks the "Sign in with Google" button, THE Auth_Service SHALL initiate the Google OAuth 2.0 authentication flow using Firebase Authentication's Google provider
3. WHEN a user authenticates via Google for the first time, THE Aggregator SHALL create a user profile document in Firestore with fields: uid, email (from Google account), display_name (from Google profile), tier (default: "free"), created_at, updated_at, and notification_prefs (null)
4. WHEN a user authenticates via Google and a user profile already exists for that uid, THE Aggregator SHALL sign the user in without modifying the existing profile
5. IF the Google OAuth flow fails or is cancelled by the user, THEN THE Aggregator SHALL display an error message and return the user to the login page without clearing any previously entered form data
6. WHEN a user is signed in via Google, THE Aggregator SHALL treat the user identically to email/password users for all tier-based access control and features

### Requirement 4: Input Validation and Sanitization

**User Story:** As a system operator, I want all API inputs validated and sanitized server-side, so that the system is protected against injection attacks and malformed data.

#### Acceptance Criteria

1. WHEN the API_Layer receives a request, THE Input_Validator SHALL validate all query parameters, request body fields, and URL path segments against their expected types, formats, and value ranges before processing
2. WHEN the Input_Validator detects an invalid parameter, THE API_Layer SHALL return HTTP 400 with a JSON error response containing the field name and a human-readable validation reason, without exposing internal implementation details
3. THE Input_Validator SHALL sanitize all string inputs by removing or escaping HTML entities, script tags, and SQL injection patterns before passing data to downstream services
4. THE Input_Validator SHALL enforce maximum length limits on all string parameters: 200 characters for query parameters, 1000 characters for individual body fields, and 10KB total request body size
5. IF a request body exceeds 10KB in size, THEN THE API_Layer SHALL reject the request with HTTP 413 Payload Too Large before parsing the body content

### Requirement 5: Rate Limiting

**User Story:** As a system operator, I want API endpoints protected by rate limiting, so that no single client can abuse the system or degrade service for other users.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL track request counts per client IP address using a sliding window of 60 seconds
2. WHEN a client exceeds 100 requests within the 60-second sliding window, THE Rate_Limiter SHALL reject subsequent requests with HTTP 429 Too Many Requests and include a Retry-After header indicating the number of seconds until the window resets
3. THE Rate_Limiter SHALL apply stricter limits to authentication endpoints (login, register): a maximum of 10 requests per IP address within a 60-second sliding window
4. WHEN a rate-limited request is rejected, THE API_Layer SHALL return a JSON body with an error field indicating that the rate limit has been exceeded
5. THE Rate_Limiter SHALL operate as middleware applied before authentication verification and request processing

### Requirement 6: Security Headers and Protections

**User Story:** As a system operator, I want security headers and protections applied to all responses, so that the application is hardened against common web vulnerabilities.

#### Acceptance Criteria

1. THE Aggregator SHALL include a Content-Security-Policy header on all HTML responses restricting: script-src to 'self' and required CDN domains, style-src to 'self' and 'unsafe-inline' (for CSS-in-JS), img-src to 'self', data:, and tile server domains (*.tile.openstreetmap.org), connect-src to 'self' and Firebase APIs
2. THE Aggregator SHALL include X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and Referrer-Policy: strict-origin-when-cross-origin headers on all responses
3. THE Aggregator SHALL implement CSRF protection for all state-mutating API requests (POST, PUT, DELETE) using a double-submit cookie pattern with a CSRF_Token
4. THE Aggregator SHALL set all authentication cookies with Secure, HttpOnly, SameSite=Strict attributes
5. THE Aggregator SHALL sanitize all error responses to exclude stack traces, internal file paths, database query details, or any implementation-specific information in production mode
6. IF an unhandled exception occurs in the API_Layer, THEN THE Aggregator SHALL log the full error details server-side and return a generic HTTP 500 response with message "Internal server error"

### Requirement 7: Authentication Token Management

**User Story:** As an authenticated user, I want my session to remain active seamlessly and expire securely when inactive, so that I have a smooth experience without security risks.

#### Acceptance Criteria

1. THE Token_Manager SHALL automatically refresh the Firebase ID token when the token has less than 5 minutes remaining before expiry
2. WHEN the Token_Manager detects the ID token has expired and cannot be refreshed (user signed out elsewhere, account disabled), THE Aggregator SHALL redirect the user to the login page and display a message indicating the session has expired
3. IF an API request receives an HTTP 401 response, THEN THE Token_Manager SHALL attempt one token refresh and retry the original request before redirecting to login
4. THE Token_Manager SHALL clear all authentication state (tokens, cached user data) from client storage upon sign-out

### Requirement 8: Firestore Security Rules Audit

**User Story:** As a system operator, I want Firestore security rules reviewed and tightened, so that no unauthorized data access is possible even if the client is compromised.

#### Acceptance Criteria

1. THE Security_Rules SHALL allow read access to the announcements collection for unauthenticated requests, restricted to documents where scraped_at is older than 48 hours (supporting guest mode)
2. THE Security_Rules SHALL allow read access to all announcements for authenticated users where the user's tier is "premium", and restrict authenticated free-tier users to documents where scraped_at is older than 48 hours
3. THE Security_Rules SHALL deny all client-side write operations (create, update, delete) on the announcements and geo_cache collections
4. THE Security_Rules SHALL allow users to read and create their own profile document (matching auth uid) and update only the display_name, notification_prefs, and updated_at fields while preventing modification of uid, email, tier, and created_at
5. THE Security_Rules SHALL deny all read and write operations on the geo_cache collection from client SDKs

### Requirement 9: README Documentation

**User Story:** As a developer, I want comprehensive README documentation, so that I can understand the project architecture, set it up locally, and deploy it.

#### Acceptance Criteria

1. THE Aggregator project SHALL include a README.md file at the repository root containing sections for: project overview, architecture diagram, tech stack, prerequisites, local setup instructions, environment variables, deployment guide, API documentation, and testing guide
2. THE README.md SHALL document all required environment variables with descriptions, expected formats, and example values (using placeholder values, not real secrets)
3. THE README.md SHALL include step-by-step local development setup instructions covering: cloning, dependency installation, Firebase emulator configuration, environment file setup, and development server startup
4. THE README.md SHALL document all API endpoints with their HTTP methods, URL paths, query parameters, request/response body schemas, and example responses
5. THE README.md SHALL include a deployment guide covering Vercel deployment for the frontend and Firebase CLI deployment for Cloud Functions and Firestore rules
6. THE README.md SHALL include a testing section documenting how to run unit tests, property-based tests, integration tests, and end-to-end tests

### Requirement 10: Mobile-First Responsive Layout

**User Story:** As a mobile user, I want a responsive interface that adapts to my device with native-feeling navigation, so that browsing construction ads feels natural on any screen size.

#### Acceptance Criteria

1. WHILE the viewport width is 768px or less, THE Aggregator SHALL display the Bottom_Navigation_Bar as the primary navigation with smooth slide-up entrance animation on page load
2. WHILE the viewport width is greater than 768px, THE Aggregator SHALL display the Side_Navigation panel with fluid width transitions when expanding or collapsing
3. THE Aggregator SHALL render all content without horizontal scrolling for viewport widths from 320px to 1440px and above
4. WHEN the user switches between tabs, THE Aggregator SHALL animate the content transition using a horizontal slide animation with spring physics (duration 250-350ms, slight overshoot for natural feel)
5. THE Aggregator SHALL support swipe gestures on mobile for navigating between adjacent tabs (map/list/notifications/profile) with velocity-based animation completion
6. WHEN a page transition occurs, THE Aggregator SHALL apply a fade-and-slide animation with a duration between 200ms and 300ms

### Requirement 11: Card-Based Announcement Design

**User Story:** As a user, I want announcement cards with clear visual hierarchy, so that I can quickly scan and understand available opportunities.

#### Acceptance Criteria

1. THE Aggregator SHALL display each announcement as a card component with: title (bold, 16-18px), location (regular, 14px with map pin icon), price (semi-bold, 16px, accent color), source portal badge (small chip), and scraped_at relative time (12px, muted color)
2. THE Aggregator SHALL apply consistent card styling: 12-16px border radius, subtle box shadow (0 2px 8px rgba(0,0,0,0.08)), 16px internal padding, and 12px gap between cards
3. WHEN a card appears in the viewport during scrolling, THE Aggregator SHALL animate the card entrance with a fade-in and slight upward slide (translateY 8px to 0) with staggered timing (50ms between consecutive cards)
4. WHEN a user presses a card on mobile, THE Aggregator SHALL provide haptic-style visual feedback using a scale-down animation (scale 0.98) with a duration of 100ms

### Requirement 12: Loading States and Feedback

**User Story:** As a user, I want clear loading indicators and feedback, so that I know the application is working and responsive to my actions.

#### Acceptance Criteria

1. WHILE data is being fetched for the announcement list, THE Aggregator SHALL display Loading_Skeleton placeholders that match the card layout dimensions (title line, location line, price block) instead of a generic spinner
2. WHILE data is being fetched for the map view, THE Aggregator SHALL display a skeleton overlay matching the map container dimensions with a pulsing animation
3. WHEN the user performs Pull_To_Refresh on mobile, THE Aggregator SHALL display a pull indicator at the top of the list and reload data from the API upon release past a 60px threshold
4. WHEN a user action succeeds (e.g., login, logout, settings saved), THE Aggregator SHALL display a Toast_Notification with a success message that auto-dismisses after 3 seconds
5. WHEN a user action fails (e.g., network error, validation failure), THE Aggregator SHALL display a Toast_Notification with an error message that persists until manually dismissed or for 5 seconds
6. IF the announcement list or map returns zero results, THEN THE Aggregator SHALL display an empty state with an illustrative icon, a descriptive message, and a suggested action (e.g., "Adjust your filters" or "Check back later")

### Requirement 13: Design System and Theming

**User Story:** As a user, I want a consistent visual design with dark mode support, so that the interface is pleasant to use in any lighting condition.

#### Acceptance Criteria

1. THE Design_System SHALL define a typography scale using a consistent ratio: body 14-16px, headings (H1: 24-28px, H2: 20-22px, H3: 16-18px), captions 12px, with a base line-height of 1.5
2. THE Design_System SHALL define a spacing scale based on a 4px grid: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
3. THE Design_System SHALL define a color palette with: primary (blue #2563eb), primary-dark (#1d4ed8), success (#16a34a), warning (#d97706), error (#dc2626), neutral scale (gray-50 through gray-900), and surface/background colors for both light and dark themes
4. WHEN the user's operating system preference is set to dark mode, THE Aggregator SHALL automatically apply the Dark_Mode color scheme on first visit
5. THE Aggregator SHALL provide a toggle in the profile/settings area to manually switch between light mode and dark mode, persisting the preference in localStorage
6. WHILE Dark_Mode is active, THE Aggregator SHALL use dark surface colors (gray-900 background, gray-800 cards), light text (gray-100 primary, gray-400 secondary), and adjusted primary color brightness for accessibility (minimum 4.5:1 contrast ratio for text)

### Requirement 14: Micro-Interactions and Animations

**User Story:** As a user, I want subtle animations and interactions throughout the interface, so that the application feels polished and responsive.

#### Acceptance Criteria

1. WHEN a user presses a button, THE Aggregator SHALL apply a scale-down micro-animation (scale 0.95-0.97) for 100ms followed by a spring-back to scale 1.0
2. WHEN the active tab changes in the Bottom_Navigation_Bar, THE Aggregator SHALL animate the active indicator (color change and icon scale) with a duration of 200ms using an ease-out timing function
3. WHEN list items appear during initial load or pagination, THE Aggregator SHALL stagger their entrance animations with a 50ms delay between consecutive items and a fade-in combined with translateY(8px) to translateY(0)
4. WHEN a Toast_Notification appears, THE Aggregator SHALL animate it sliding in from the top with a spring animation (overshoot, 300ms duration) and sliding out with a fade (200ms)
5. THE Aggregator SHALL ensure all animations respect the prefers-reduced-motion media query by disabling or significantly reducing motion when the user's system preference indicates reduced motion

