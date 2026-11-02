# Anonymous visitor ordinal

## Problem Statement
Refreshing the homepage must not create a second independent visitor.

## Solution
Identify an anonymous browser with a first-party, one-year cookie and allocate a stable ordinal in Cloudflare D1. Pages Functions handles the API on the Free plan.

## Functional Requirements
### visitor-counter::REQ-001 First visit (direct acceptance)
A browser with accepted cookies receives one positive ordinal and the homepage displays “你是第 N 位访客”.
### visitor-counter::REQ-002 Returning visit (direct acceptance)
Refreshes, later visits and new tabs with the same cookie return the original ordinal without adding a visitor.
### visitor-counter::REQ-003 Concurrent requests (direct acceptance)
Requests with the same identifier create at most one record; different identifiers get distinct ordinals. Supported browsers serialize initial cookie setup across tabs using Web Locks.
### visitor-counter::REQ-004 New identity (direct acceptance)
A different browser, expired/cleared cookie, or fresh private session receives a new identity. No attempt is made to identify a natural person across devices.
### visitor-counter::REQ-005 Failure (direct acceptance)
Unavailable storage, blocked cookies, invalid responses or a request timeout leave the ordinal line empty and keep the rest of the homepage usable. Do not fabricate or cache an ordinal across identities.
### visitor-counter::REQ-006 Domain handling (direct acceptance)
The public apex and www hostname share the identity cookie. The published canonical homepage is the apex hostname. Local state is isolated from production; preview deployments have no production binding and require a separate preview database. Production deployment pages.dev aliases use production data with host-only cookies; they are not preview deployments.

## Constraints
### visitor-counter::CON-001 Free plan (direct acceptance)
Do not enable a paid subscription. Restrict function invocation to the visitor API; static resources remain static.
### visitor-counter::CON-002 Minimal data (direct acceptance)
Persist only a random identifier, ordinal and first-visit timestamp. Do not persist IP addresses, fingerprints or user agents.

## Failure modes and boundaries
- First GET only establishes the cookie, without allocating a record. POST requires a cookie roundtrip; cookie-blocked browsers are not counted on every reload (REQ-005).
- Client retries and competing POST requests use the same database uniqueness boundary (REQ-003).
- Database writes and the readback happen in one transactional batch, preventing partial registration from becoming a second identity on retry (REQ-002/003).
- API responses bypass caches; a CDN must not serve one visitor's number to another (REQ-001/004).
- Unsupported methods and cross-origin requests are rejected before writes. Invalid identifiers are replaced through cookie setup.
- Without Web Locks, ordinary refreshes still deduplicate; simultaneous first-ever cookie-less tabs cannot be guaranteed to share an identity. No invasive fallback fingerprinting.
- Cookie removal loses the browser identity; old records remain part of the accumulated total (REQ-004).
- Bot filtering is not a guarantee of real people. This is an anonymous browser counter, not an audited human census.
- Navigation, Apps cards, Blog and dog interaction remain unchanged.

## Implementation Decisions
Use a random HttpOnly cookie, Secure on HTTPS, SameSite=Lax, one year lifetime; exact apex/www host allowlist controls the shared cookie domain. The API returns only the ordinal, never the identifier. A database unique constraint protects identities, and insertion occurs only if absent. No per-refresh write or access log.

## Testing Decisions
Exercise the exported Pages handler with real SQLite-backed SQL, plus an HTTP integration check on the actual local Cloudflare D1 runtime. Test cookie establishment, repeated visits, concurrency, separate identities, malformed cookies, forbidden origins, quota failure and no-cache headers. Browser checks cover real refresh and another tab, rendering and static-page fallback. SQL fixture shape follows installed D1 types and SQLite migration behavior; HTTP inputs use standard Request/Cookie headers.

## Out of Scope
Download statistics migration, cross-device identification, login, per-visit logs, analytics dashboard, real-time total pushes, paid products, portrait changes.
