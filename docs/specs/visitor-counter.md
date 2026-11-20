# Site-wide anonymous visitor total

> Pending: site-wide registration and automatic total refresh are implemented.

## Problem Statement
Readers enter through different pages, and the site owner needs a cumulative audience count that excludes repeat visits from the same anonymous browser.

## Solution
Count anonymous browsers across the site and show the shared visitor total on the homepage, updating it while the reader stays there.

## Functional Requirements

### visitor-counter::REQ-001 Registration and display
- visitor-counter::REQ-001/AC-01: Opening the homepage, Blog list or any published post registers a browser that accepts the identity cookie, even when it has never opened the homepage.
- visitor-counter::REQ-001/AC-02: The existing visitor line below the homepage introduction displays “本站累计访客 N 人”, formatting N with Chinese-locale thousands separators. N is the number of visitor records after registration, not the browser's ordinal or the highest allocated ordinal. Blog pages have no visible counter.

### visitor-counter::REQ-002 Returning visit (direct acceptance)
Refreshes, later visits, navigation between counted pages and new tabs with the same cookie do not add another visitor record. The homepage displays the latest shared total on arrival.

### visitor-counter::REQ-003 Concurrent requests
- visitor-counter::REQ-003/AC-01: Concurrent registrations with the same identifier create at most one record; different identifiers each add one record.
- visitor-counter::REQ-003/AC-02: Browsers supporting Web Locks coordinate initial identity setup across same-origin tabs.

### visitor-counter::REQ-004 New identity (direct acceptance)
A different browser, expired or cleared cookie, or fresh private session receives a new identity. No attempt is made to identify a natural person across devices.

### visitor-counter::REQ-005 Failure (direct acceptance)
Unavailable storage, blocked cookies, invalid responses or a request timeout leave the homepage counter empty and keep the page usable. A failed periodic read hides the counter until a successful read. Requests time out after five seconds; failures do not invent a total or replace a valid identity cookie.

### visitor-counter::REQ-006 Domain handling
- visitor-counter::REQ-006/AC-01: The public apex and www hostname share the identity cookie. The published canonical homepage is the apex hostname.
- visitor-counter::REQ-006/AC-02: Local state is isolated from production. Preview deployments have no production binding and require a separate preview database. Production deployment pages.dev aliases use production data with host-only cookies.

### visitor-counter::REQ-007 Automatic refresh
- visitor-counter::REQ-007/AC-01: While the homepage is visible, the counter requests the current total every 30 seconds without registering the browser again.
- visitor-counter::REQ-007/AC-02: Hidden pages suspend periodic reads. Becoming visible or returning through browser history immediately refreshes the total and resumes the visible-page schedule.
- visitor-counter::REQ-007/AC-03: Refresh requests do not overlap; an obsolete or cancelled response cannot overwrite a newer total. Leaving the page stops its refresh work. Pages without a visible counter do not poll.

### visitor-counter::REQ-008 Existing data (direct acceptance)
All existing visitor records, identifiers, ordinals and first-visit timestamps remain valid and contribute to the total. They are neither reset nor renumbered. Historical visits that were never recorded cannot be reconstructed.

## Constraints

### visitor-counter::CON-001 Free plan (direct acceptance)
Do not enable a paid subscription. Pages Functions and Cloudflare D1 serve the visitor API; page documents and static resources remain static.

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
- Cookie removal loses the browser identity; old records remain under visitor-counter::REQ-008.
- The count measures anonymous browsers rather than verified people; bots that execute registration can be counted.
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

Existing rows use the same format and are read without migration. The total is the record count, including records whose cookies have expired.

`GET /api/visitor` establishes a valid cookie and returns `{ready:true}`. `POST /api/visitor` registers the cookie identity and returns its `ordinal` together with `total`; ordinal remains available to already loaded clients. `GET /api/visitor?total=1` returns `{total}` without issuing cookies or writing visitor records. Totals are nonnegative safe integers; registration totals are positive. Invalid registration cookies return 428, forbidden requests 403, unsupported methods 405 and unavailable storage 503. The random identifier is never included in a JSON response.

## Out of Scope
Cross-device identification, login, pageview counts, daily audience reports, a live-online-user count and an analytics dashboard are outside this cumulative anonymous-browser counter. Server-pushed instantaneous updates and paid products are excluded. Other subdomain applications keep their own statistics.
