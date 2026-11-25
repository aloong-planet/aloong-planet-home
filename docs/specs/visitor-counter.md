# Site-wide anonymous visitor total

## Problem Statement
Readers enter through different pages, and the site owner needs a cumulative audience count that excludes repeat visits from the same anonymous browser.

## Solution
Count anonymous browsers across the site and show the shared visitor total on the homepage, updating it while the reader stays there.

## Functional Requirements

### visitor-counter::REQ-001 Registration and display
- visitor-counter::REQ-001/AC-01: With scripting enabled, opening the homepage, Blog list or any published post registers a browser that accepts the identity cookie, including on its first visit to the site.
- visitor-counter::REQ-001/AC-02: The visitor line below the homepage introduction displays “本站累计访客 N 人” on the Chinese homepage, and "N visitors so far" on the English homepage, "1 visitor so far" when N is 1. N is written in the browser's own number format, whatever the page's language. N is the number of visitor records when the API reads the total, including those whose cookies have expired. Blog pages have no visible counter.

### visitor-counter::REQ-002 Returning visit (direct acceptance)
Refreshes, later visits, navigation between counted pages and new tabs with the same cookie do not add another visitor record. On arrival, the homepage displays the total from registration under visitor-counter::REQ-001/AC-02.

### visitor-counter::REQ-003 Concurrent requests
- visitor-counter::REQ-003/AC-01: Concurrent registrations with the same identifier create at most one record; different identifiers each add one record.
- visitor-counter::REQ-003/AC-02: Browsers supporting Web Locks coordinate initial identity setup across same-origin tabs.

### visitor-counter::REQ-004 New identity (direct acceptance)
A different browser, expired or cleared cookie, or fresh private session receives a new identity. No attempt is made to identify a natural person across devices.

### visitor-counter::REQ-005 Failure (direct acceptance)
Unavailable storage, blocked cookies, invalid totals or a timeout leave the homepage counter empty until the next successful registration or total read. Page content remains usable. Each registration attempt, including cookie setup, and each total read has a five-second deadline. A failed attempt preserves any valid identity cookie.

### visitor-counter::REQ-006 Domain handling
- visitor-counter::REQ-006/AC-01: The public apex and www hostname share the identity cookie. The published canonical homepage is the apex hostname.
- visitor-counter::REQ-006/AC-02: Local state is isolated from production. Preview deployments have no production binding and require a separate preview database. Production deployment pages.dev aliases use production data with host-only cookies.

### visitor-counter::REQ-007 Automatic refresh
- visitor-counter::REQ-007/AC-01: While the homepage is visible, it schedules the next update 30 seconds after the preceding attempt finishes. An update reads the total once registration succeeds. Until then, it retries registration.
- visitor-counter::REQ-007/AC-02: Hiding or leaving the homepage suspends updates. When it becomes visible again or is restored from browser history while visible, it requests an immediate update and resumes the schedule in visitor-counter::REQ-007/AC-01.
- visitor-counter::REQ-007/AC-03: Update requests run one at a time. An aborted response never supplies a displayed total. Blog pages do not poll.

### visitor-counter::REQ-008 Existing data (direct acceptance)
All existing records remain valid and contribute to the total. The counter preserves their identifiers, ordinals and first-visit timestamps. Historical visits that were never recorded cannot be reconstructed.

## Constraints

### visitor-counter::CON-001 Free plan (direct acceptance)
The counter runs on the free plan of Cloudflare Pages Functions and D1. Only `/api/visitor` invokes the function. Pages and assets are served statically.

### visitor-counter::CON-002 Minimal data (direct acceptance)
Persist only a random identifier, ordinal and first-visit timestamp. Do not persist IP addresses, fingerprints, user agents or per-visit logs.

### visitor-counter::CON-003 Request boundaries
- visitor-counter::CON-003/AC-01: Only registration with a valid identity cookie may add a visitor. Cookie setup and total reads allocate no visitor records.
- visitor-counter::CON-003/AC-02: Cross-origin requests and unsupported methods are rejected before database writes. API responses bypass browser and intermediary caches.

## Failure modes and boundaries
- Repeated registration after a lost response: visitor-counter::REQ-002 and visitor-counter::REQ-003/AC-01.
- Concurrent arrival while another browser reads the total: each response reports the total at its database read, with subsequent updates governed by visitor-counter::REQ-007.
- Hidden, restored or departed homepage: visitor-counter::REQ-007/AC-02 and visitor-counter::REQ-007/AC-03.
- Failed refresh or initial registration: visitor-counter::REQ-005.
- Without Web Locks, simultaneous first-ever cookie-less tabs cannot be guaranteed to share an identity. No fingerprinting fallback is used.
- Cookie removal follows visitor-counter::REQ-004 for the next registration and visitor-counter::REQ-008 for existing records.
- Bots that execute registration can be counted.
- Missing pages follow [not-found::CON-001](not-found.md).
- Scripting unavailable: page content stays usable, but registration and the visitor line are unavailable.

## Implementation Decisions
The identity is a random UUID v4 in the `aloong_visitor` cookie, with Path=/, HttpOnly, SameSite=Lax, a 31,536,000-second lifetime and Secure on HTTPS. Only the apex and www hosts set Domain=aloongplanet.com; other hosts use host-only cookies.

Persisted data is the D1 `visitors` table:

| Field | Type | Meaning |
|---|---|---|
| ordinal | INTEGER PRIMARY KEY AUTOINCREMENT | Immutable allocation number |
| visitor_id | TEXT NOT NULL UNIQUE | Anonymous browser identifier |
| first_seen_at | TEXT NOT NULL | Initial registration timestamp in UTC |

Rows in this format require no migration under visitor-counter::REQ-008.

`GET /api/visitor` sets the identity cookie if it is missing or invalid and returns `{ready:true}`. `POST /api/visitor` registers the cookie identity and returns `{ordinal,total}`. `GET /api/visitor?total=1` returns `{total}` and sends no cookie. Database writes follow visitor-counter::CON-003/AC-01. Totals are nonnegative safe integers. Registration returns positive safe integers for both fields. Invalid registration cookies return 428, forbidden requests 403, unsupported methods 405 and unavailable storage 503. The response body never includes the browser identifier.

## Out of Scope
Login, pageview counts, daily audience reports, a live-online-user count, an analytics dashboard paid products and server-pushed updates are outside this cumulative anonymous-browser counter. Other subdomain applications keep their own statistics.
