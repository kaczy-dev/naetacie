# Requirements Document

## Introduction

Production SaaS MVP for aggregating, scraping, and visualizing construction/renovation advertisements from Szczecin and its surrounding area (50km radius). The system collects ads from multiple Polish portals (OLX, Oferteo, Fixly), deduplicates them, geocodes locations, and presents them on an interactive map with a freemium monetization model.

**Architecture Overview:**
- Frontend & Client API: Next.js (App Router, Server Actions, TypeScript) on Vercel
- Core Backend & Scraper Engine: Modular monolith in Nest.js/Node.js as Firebase Cloud Functions (v2, Blaze plan)
- Database & Auth: Firebase Suite (Authentication, Firestore, Cloud Messaging)

## Glossary

- **Aggregator**: The complete SaaS system responsible for scraping, storing, and displaying construction/renovation ads
- **Scraper_Engine**: The Firebase Cloud Function (v2) module running Playwright/Puppeteer that fetches ads from source portals
- **Announcement**: A single construction/renovation advertisement scraped from a source portal, stored in Firestore
- **Source_Portal**: An external website from which ads are scraped (OLX, Oferteo, Fixly)
- **Geo_Cache**: A Firestore collection storing previously geocoded address-to-coordinate mappings to avoid redundant Nominatim API calls
- **Nominatim_API**: The free OpenStreetMap geocoding service used to convert addresses to geographic coordinates
- **Free_User**: An authenticated user on the free tier with restricted access (48-hour delay, masked details)
- **Premium_User**: An authenticated user on the premium tier with full real-time access and notifications
- **Deduplication_Key**: A unique identifier for each announcement derived from source portal ID or SHA-256 hash of title+date+description
- **Map_Component**: The React-Leaflet client component displaying announcements on OpenStreetMap
- **Marker_Cluster**: A group of map markers aggregated visually when zoomed out for performance and readability
- **Security_Rules**: Firebase Security Rules enforcing data access control based on user tier
- **Stealth_Plugin**: The playwright-extra stealth plugin that emulates human browsing behavior to avoid bot detection
- **Exponential_Backoff**: A retry strategy where wait time increases exponentially between consecutive failed attempts
- **Bottom_Navigation_Bar**: A mobile-friendly fixed navigation component at the bottom of the viewport

## Requirements

### Requirement 1: Scheduled Ad Scraping

**User Story:** As a system operator, I want the Aggregator to automatically scrape construction/renovation ads from source portals on a schedule, so that the database stays up-to-date without manual intervention.

#### Acceptance Criteria

1. THE Scraper_Engine SHALL execute as a Firebase Cloud Function (v2) triggered by a Scheduled Function (Cron) at a configurable interval with a default of every 6 hours and a minimum allowed interval of 1 hour
2. WHEN the scheduled trigger fires, THE Scraper_Engine SHALL scrape ads from the Construction/Renovation category on OLX, Oferteo, and Fixly for Szczecin and a 50 km radius, processing up to a maximum of 500 ads per Source_Portal per run
3. THE Scraper_Engine SHALL use playwright-extra with the Stealth_Plugin to emulate human browsing behavior during scraping
4. THE Scraper_Engine SHALL rotate User-Agent strings from a predefined list of at least 5 entries, selecting a different User-Agent string on each request
5. WHEN scraping a page, THE Scraper_Engine SHALL introduce a random delay between 2 and 5 seconds between consecutive page requests
6. IF a scraping request fails, THEN THE Scraper_Engine SHALL retry using Exponential_Backoff starting with a base delay of 2 seconds and a multiplier of 2, with a maximum of 3 retry attempts
7. IF all retry attempts for a single Source_Portal fail, THEN THE Scraper_Engine SHALL log the error to Firebase Cloud Logging with the Source_Portal name, timestamp, and failure reason, and continue scraping remaining Source_Portals
8. WHEN the Scraper_Engine completes a scheduled run, THE Scraper_Engine SHALL log a summary indicating the number of ads scraped per Source_Portal and the count of failed Source_Portals

### Requirement 2: Announcement Deduplication and Storage

**User Story:** As a system operator, I want each scraped ad to be uniquely identified and deduplicated, so that Firestore write costs are minimized and data integrity is maintained.

#### Acceptance Criteria

1. WHEN an ad is scraped from a Source_Portal, THE Scraper_Engine SHALL generate a Deduplication_Key using the source portal's native ad ID (prefixed with the portal name, e.g., "olx-123456") when the native ID is a non-empty string
2. IF a source portal native ID is not available or is empty, THEN THE Scraper_Engine SHALL generate a Deduplication_Key as a SHA-256 hash of the concatenation of title, a pipe delimiter "|", date, a pipe delimiter "|", and description
3. WHEN storing an Announcement, THE Scraper_Engine SHALL check Firestore for an existing document with the same Deduplication_Key as the document ID
4. IF an Announcement with the same Deduplication_Key already exists, THEN THE Scraper_Engine SHALL skip the write operation
5. IF an Announcement with the same Deduplication_Key does not exist, THEN THE Scraper_Engine SHALL create a new document in the announcements collection with fields: deduplication_key, title, description, source_url, source_portal, category, location_text, latitude, longitude, price, contact_info, scraped_at, published_at
6. THE Aggregator SHALL store announcements in Firestore with composite indexes on (source_portal, scraped_at) and (location_text, scraped_at) for efficient querying
7. IF Firestore is unreachable during the deduplication check, THEN THE Scraper_Engine SHALL skip the Announcement, log the error, and continue processing remaining ads

### Requirement 3: Geolocation and Caching

**User Story:** As a system operator, I want scraped ad locations to be geocoded into coordinates with aggressive caching, so that ads can be displayed on a map without exceeding Nominatim API rate limits.

#### Acceptance Criteria

1. WHEN an Announcement has a non-empty, non-whitespace-only location_text field, THE Aggregator SHALL attempt to resolve it to latitude and longitude coordinates
2. WHEN resolving a location, THE Aggregator SHALL first query the Geo_Cache collection in Firestore for an existing entry where the stored location_text is an exact, case-insensitive match of the input location_text after trimming leading and trailing whitespace
3. IF a matching entry exists in Geo_Cache, THEN THE Aggregator SHALL use the cached latitude and longitude without calling Nominatim_API
4. IF no matching entry exists in Geo_Cache, THEN THE Aggregator SHALL query Nominatim_API with the trimmed location_text appended with ", Szczecin, Poland" for context
5. WHEN querying Nominatim_API, THE Aggregator SHALL respect a rate limit of 1 request per second by waiting at least 1000 milliseconds between consecutive requests
6. WHEN Nominatim_API returns a successful response, THE Aggregator SHALL store the trimmed location_text, latitude, longitude, and resolved_at timestamp in the Geo_Cache collection
7. IF Nominatim_API returns an error or no result, THEN THE Aggregator SHALL log a warning, store the trimmed location_text with a null latitude and null longitude in the Geo_Cache collection as a negative cache entry, and store the Announcement without coordinates
8. IF the Announcement has an empty or whitespace-only location_text field, THEN THE Aggregator SHALL store the Announcement without coordinates and SHALL NOT query Geo_Cache or Nominatim_API
9. IF a negative cache entry (null coordinates) exists in Geo_Cache for a given location_text, THEN THE Aggregator SHALL treat it as a cache hit and store the Announcement without coordinates, without calling Nominatim_API

### Requirement 4: User Authentication

**User Story:** As a user, I want to create an account and log in, so that I can access construction/renovation ads based on my subscription tier.

#### Acceptance Criteria

1. THE Aggregator SHALL use Firebase Authentication for user registration and login
2. WHEN a user registers with a valid email and password, THE Aggregator SHALL create a user profile document in Firestore with fields: uid, email, display_name (maximum 100 characters), tier (default: "free"), created_at, updated_at
3. WHEN a user authenticates with valid credentials, THE Aggregator SHALL issue a Firebase ID token for subsequent API requests
4. THE Aggregator SHALL support email/password authentication as the primary login method, requiring passwords to be at least 8 characters long and containing at least one uppercase letter, one lowercase letter, and one digit
5. IF a user attempts to register with an email that is already associated with an existing account or provides invalid registration data, THEN THE Aggregator SHALL reject the registration and return an error message indicating the reason for failure
6. IF a user attempts to authenticate with invalid credentials, THEN THE Aggregator SHALL reject the login attempt and return an error message indicating that authentication failed without revealing whether the email or password was incorrect
7. IF a user submits a registration or login request and the authentication service is unavailable, THEN THE Aggregator SHALL return an error message indicating the service is temporarily unavailable and preserve any user-entered data on the client side

### Requirement 5: Freemium Data Access Control

**User Story:** As a product owner, I want Free_Users to have restricted access and Premium_Users to have full access, so that the platform can monetize through a subscription model.

#### Acceptance Criteria

1. WHEN a Free_User requests announcements, THE Aggregator SHALL return only Announcements where scraped_at is older than 48 hours from the current server timestamp, excluding any Announcements newer than 48 hours from the response entirely
2. WHEN a Free_User requests announcements, THE Aggregator SHALL mask the description field (show first 100 characters followed by "..." if the description exceeds 100 characters, or show the full description unmodified if it is 100 characters or fewer) and omit the source_url and contact_info fields from the response
3. WHEN a Premium_User requests announcements, THE Aggregator SHALL return all Announcements regardless of scraped_at age, including full description, source_url, and contact_info fields
4. THE Aggregator SHALL enforce data access restrictions through Firebase Security_Rules on the Firestore announcements collection
5. THE Aggregator SHALL also enforce access restrictions server-side in the Next.js API endpoint by verifying the Firebase ID token and checking the user's tier field
6. IF the Firebase ID token is missing, invalid, or the user's tier field is not present, THEN THE Aggregator SHALL reject the request with an error response indicating authentication or authorization failure and SHALL NOT return any announcement data
7. IF a Free_User constructs a direct query attempting to bypass field restrictions or the 48-hour delay, THEN THE Aggregator SHALL enforce the same restrictions at both the Firebase Security_Rules and the server-side API layer, returning only permitted data

### Requirement 6: Premium Notifications

**User Story:** As a Premium_User, I want to receive email notifications when new matching construction/renovation ads are detected, so that I can act quickly on fresh opportunities.

#### Acceptance Criteria

1. WHEN a new Announcement is stored and its location_text or coordinates fall within a Premium_User's saved notification radius (between 1 km and 50 km from a user-specified center point), THE Aggregator SHALL send an email notification to that Premium_User's registered email address within 5 minutes of storage
2. THE Aggregator SHALL send email notifications using Nodemailer with a configurable SMTP transport
3. WHEN sending a notification, THE Aggregator SHALL include the Announcement title, location_text, and price in the email body
4. IF email delivery fails, THEN THE Aggregator SHALL log the error and not retry notification delivery for that specific Announcement
5. WHEN a Premium_User has not configured a notification radius, THE Aggregator SHALL not send notifications to that user
6. IF multiple new Announcements match a Premium_User's preferences within a 5-minute window, THEN THE Aggregator SHALL send a single consolidated email listing up to 10 matching Announcements

### Requirement 7: Interactive Map Display

**User Story:** As a user, I want to see construction/renovation ads displayed on an interactive map centered on Szczecin, so that I can visually browse opportunities by location.

#### Acceptance Criteria

1. THE Map_Component SHALL render an OpenStreetMap tile layer using React-Leaflet centered on Szczecin (53.4285, 14.5528) with a default zoom level of 10
2. THE Map_Component SHALL display only Announcements that have non-null latitude and longitude coordinates as markers on the map
3. WHEN multiple markers are within the same cluster radius at the current zoom level, THE Map_Component SHALL group them into a Marker_Cluster displaying the count of grouped announcements
4. WHEN a user clicks a marker, THE Map_Component SHALL display a popup containing the Announcement title, location_text, price (or "Price not listed" if price is null), and a link to the detail view
5. WHEN the Map_Component mounts, THE Map_Component SHALL request announcement data from the Next.js API endpoint at /api/announcements with the current map bounding box as a query parameter
6. WHILE the Map_Component is fetching announcement data, THE Map_Component SHALL display a loading indicator overlaid on the map
7. IF the API request to /api/announcements fails or returns no data, THEN THE Map_Component SHALL display an error message indicating the data could not be loaded and provide a retry option
8. WHEN the user pans or zooms the map such that the viewport bounding box changes, THE Map_Component SHALL request updated announcement data for the new bounding box from /api/announcements

### Requirement 8: Announcements API Endpoint

**User Story:** As a frontend developer, I want a secure API endpoint that returns filtered and access-controlled announcement data, so that the frontend can display data appropriate to the user's tier.

#### Acceptance Criteria

1. THE Aggregator SHALL expose a GET endpoint at /api/announcements that accepts query parameters: page (integer, minimum 1), limit (integer, minimum 1, maximum 100), source_portal (one of: "olx", "oferteo", "fixly"), and bounding_box (four comma-separated decimal values: south_lat,west_lng,north_lat,east_lng representing the geographic viewport)
2. WHEN a request is received, THE Aggregator SHALL verify the Firebase ID token from the Authorization header in the format "Bearer <token>"
3. IF the token is invalid or missing, THEN THE Aggregator SHALL return HTTP 401 Unauthorized with a JSON body containing an error field indicating the authentication failure reason
4. IF any query parameter fails validation (page < 1, limit < 1, limit > 100, invalid bounding_box format, or unrecognized source_portal value), THEN THE Aggregator SHALL return HTTP 400 Bad Request with a JSON body containing an error field indicating which parameter is invalid
5. WHEN the token is valid, THE Aggregator SHALL query the user's profile to determine the tier (free or premium)
6. WHEN the tier is "free", THE Aggregator SHALL filter results to Announcements where scraped_at is older than 48 hours, truncate the description field to the first 100 characters followed by "...", and omit the source_url and contact_info fields from the response
7. WHEN the tier is "premium", THE Aggregator SHALL return full unmasked Announcement data including description, source_url, and contact_info with no time restriction
8. THE Aggregator SHALL support pagination with a default page size of 20 and a maximum page size of 100, returning a JSON response containing a data array of Announcement objects and a metadata object with fields: total_count, current_page, page_size, and total_pages
9. IF no Announcements match the provided filters, THEN THE Aggregator SHALL return HTTP 200 with an empty data array and total_count of 0

### Requirement 9: Mobile-First UI with Navigation

**User Story:** As a mobile user, I want a beautiful and responsive interface with smooth navigation, so that I can browse construction ads comfortably on my phone.

#### Acceptance Criteria

1. THE Aggregator SHALL render a fixed Bottom_Navigation_Bar with tabs for: Map, List, Notifications, and Profile, where each tab touch target is at least 44x44 CSS pixels
2. WHEN the user switches tabs or navigates between pages, THE Aggregator SHALL apply a CSS transition with a duration between 200ms and 300ms
3. THE Aggregator SHALL implement a responsive layout that displays all content without horizontal scrolling for viewport widths from 320px to 1440px
4. WHILE the viewport width is 768px or less, THE Aggregator SHALL display the Bottom_Navigation_Bar as the primary navigation element and visually distinguish the currently active tab from inactive tabs
5. WHILE the viewport width is greater than 768px, THE Aggregator SHALL display a side navigation panel instead of the Bottom_Navigation_Bar and visually distinguish the currently active section from inactive sections
6. THE Aggregator SHALL ensure that no page content is obscured by or overlaps with the fixed Bottom_Navigation_Bar by reserving spacing equal to the navigation bar height at the bottom of the scrollable content area

### Requirement 10: Announcement List View

**User Story:** As a user, I want to browse construction/renovation ads in a scrollable list with key details visible, so that I can quickly scan available opportunities.

#### Acceptance Criteria

1. THE Aggregator SHALL display announcements in a vertically scrollable list, sorted by scraped_at descending (newest first), with each card showing: title, location_text, price, source_portal badge, and scraped_at date
2. WHEN the user scrolls to the bottom of the list, THE Aggregator SHALL load the next page of 20 announcements and append them to the existing list
3. WHEN a next page is being loaded, THE Aggregator SHALL display a loading indicator below the last visible card until the new page is rendered
4. IF there are no more announcements to load, THEN THE Aggregator SHALL hide the loading indicator and display an end-of-list message indicating all results have been shown
5. WHEN a user taps an announcement card, THE Aggregator SHALL navigate to a detail view showing all accessible fields based on the user's tier as defined by the freemium access rules
6. IF the user is a Free_User, THEN THE Aggregator SHALL display a lock icon on each masked field alongside a tappable prompt that navigates to the Premium upgrade screen
7. IF the announcements collection returns zero results for the current query, THEN THE Aggregator SHALL display an empty-state message indicating no announcements are available

### Requirement 11: Firestore Data Architecture

**User Story:** As a system architect, I want a well-structured Firestore schema with proper indexing, so that queries are efficient and costs are minimized.

#### Acceptance Criteria

1. THE Aggregator SHALL organize Firestore into three root collections: announcements, users, and geo_cache
2. THE Aggregator SHALL store each Announcement document with the Deduplication_Key as the document ID
3. THE Aggregator SHALL create composite indexes on the announcements collection for queries: (source_portal ASC, scraped_at DESC), (scraped_at DESC, source_portal ASC), and (latitude ASC, longitude ASC, scraped_at DESC)
4. THE Aggregator SHALL store each geo_cache document with a normalized location_text (lowercase, trimmed, with consecutive whitespace collapsed to a single space) as the document ID, truncated to a maximum of 1500 bytes
5. THE Aggregator SHALL store each user document with the Firebase Authentication UID as the document ID
6. THE Aggregator SHALL set a TTL of 30 days on geo_cache entries after which the entry is considered stale and SHALL be re-fetched from Nominatim_API on next access

### Requirement 12: Cost Optimization

**User Story:** As a product owner, I want the system to minimize operational costs by using only free APIs and optimizing Firestore operations, so that the MVP runs sustainably on the Firebase Blaze plan.

#### Acceptance Criteria

1. THE Aggregator SHALL use only free-tier or no-cost APIs for all external service integrations (OpenStreetMap tiles, Nominatim geocoding)
2. WHEN the Scraper_Engine has multiple Announcements to write within a single scraping run, THE Scraper_Engine SHALL batch Firestore write operations into groups of up to 500 documents per batch commit
3. THE Aggregator SHALL implement an in-memory cache in the API layer for Firestore read results with a time-to-live (TTL) of 60 seconds, applied to the /api/announcements endpoint responses
4. WHEN the Geo_Cache contains a matching entry, THE Aggregator SHALL avoid any external API call for geocoding
5. IF cached data in the API layer exceeds its TTL, THEN THE Aggregator SHALL discard the cached entry and fetch fresh data from Firestore on the next request
