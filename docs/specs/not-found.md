# Not-found page

> Related: [blog](blog.md) · [visitor total](visitor-counter.md) · [site languages](site-languages.md) · [site appearance](site-appearance.md)

## Problem Statement
A visitor who opens a mistyped link, or the address of a post that has been removed, sees the homepage with no sign that the page does not exist. Every address on the site answers with status 200, so nothing tells the visitor, a search engine, or a check that the page is missing.

## Solution
Any address the site does not have shows a not-found page with status 404. The page keeps the site's top navigation and shows the homepage's golden retriever with a puzzled, searching face, a large "404", a short explanation, and two buttons back to the homepage and the Blog.

## User Stories

### not-found::US-001 Find the way back from a missing page

As a visitor who opened an address the site does not have, I am told plainly that the page is not here and can go back to the homepage or the Blog in one step, so a broken link does not leave me confused.

- not-found::US-001/AC-01: The page shows the site's top navigation, then, in one centered column, the puzzled dog at 160px, "404", the heading "这一页走丢了", and the text "小狗找了一圈，没找到这个地址。" and "可能是链接打错了，或者页面已经搬走。" on two lines. On the English page the heading is "This page got lost" and the two lines are "The dog looked everywhere and couldn't find this address." and "The link may be mistyped, or the page may have moved." There is no footer.
- not-found::US-001/AC-02: "回首页" opens the homepage and "看看博客" opens the Blog page; on the English page they read "Back to home" and "Read the blog".
- not-found::US-001/AC-03: The two buttons sit side by side, 36px high with 6px rounded corners. The homepage button is solid in the site's ink colour with its text in the page colour, and lightens on hover; the Blog button is outlined in ink and fills with the site's tag colour on hover. Each shows the site's focus ring when focused by keyboard.
- not-found::US-001/AC-04: The browser tab reads "这一页走丢了 · Aloong Planet", or "This page got lost · Aloong Planet" on the English page.
- not-found::US-001/AC-05: At 1440×900 and at 390×844 the whole page fits in the first screen with nothing cut off and no sideways scrolling.

## Functional Requirements

### not-found::REQ-001 Unknown addresses answer with the not-found page (direct acceptance)

On every public host, every address that is neither a page or file of the site nor the visitor API answers with status 404 and the not-found page. This includes a removed post's address, nested paths, and missing files under the asset folder.

## Constraints

### not-found::CON-001 A missing page is not a visit (direct acceptance)

Applies to: the not-found page. It never registers a visitor and shows no visitor number.

## Failure modes and boundaries

Visitor paths:
- A mistyped address on the apex, www, or the Pages host: the not-found page with status 404 (not-found::REQ-001).
- A removed post's address: the not-found page; no redirect is kept ([blog](blog.md) keeps redirects for removed posts out of scope).
- A nested unknown path such as `/a/b/c/d`, or an unknown path under `/blog/` or `/api/`: the same page, with its styles, navigation, dog and buttons all working, because every reference on the page starts at the site root.
- An unknown address under `/blog/`: the navigation marks no section as current, as at any other unknown address.
- An unknown address with a query string or a hash: the not-found page; an existing page with a query string or a hash is unchanged.
- An existing address written with a trailing slash or `.html`, such as `/blog/` or `/blog.html`, still redirects to its plain address instead of showing the not-found page.
- Opening the page's own address `/404`, or `/en/404` for the English page, shows the page with status 200, and the address with `.html` redirects there; the host does this, and nothing on the site links to it.
- Browser back from the not-found page returns to the previous page; the buttons are plain links.
- Keyboard: the brand, navigation links, language switch and both buttons are reachable in order with a visible focus ring; the page has one heading.
- Scripting unavailable: the dog, text and both buttons work; the top navigation does not appear, as on the other pages.
- The dog image fails to load, or the browser cannot show WebP (Safari and iOS before 14): its alt text "歪着头找东西的金毛小狗", or "A golden retriever tilting its head, looking for something" on the English page, shows in the same 160px space and the layout does not move.
- A window shorter than the content, such as a phone in landscape: the page scrolls and nothing overlaps the navigation.

Search engines and checks:
- A missing address returns 404, so it is not indexed as a copy of the homepage. The page declares no canonical address.
- A blog page or homepage image missing after a deployment comes back as the not-found page with status 404, and the deployment checks fail on it.

Visitor registration follows not-found::CON-001 on the not-found page and [visitor-counter::REQ-001/AC-01](visitor-counter.md) on counted pages.

## Implementation Decisions

- Each language's page is a static page: the Chinese one at the root of the built site, the English one in its `/en/` folder. Cloudflare Pages serves the closest such page with status 404 for any path that is neither a static asset nor routed to a function; without one it treats the site as a single-page app and serves the homepage with status 200 (Cloudflare Pages documentation, "Not Found behavior" and "Single-page application (SPA) rendering").
- Every style, script, image and link on the page is addressed from the site root.
- The dog is a puzzled version of the homepage's sitting dog, shipped at 480px, three times its displayed size.
- Deployment checks request an address the site does not have, and one under `/en/`, on every public host, and require status 404 with the heading of the page in that language. The checks for blog pages, images and the dog's motion sheets read text and content types, so they tell a missing file from the not-found page.

## Testing Decisions

Tests stay at the seams the site already uses. The build script and the deployment-check script run as processes in a temporary folder. The deployment check runs against local servers that answer an address the site does not have the way the host does: with the not-found page and status 404. A case where a host still answers such an address with the homepage and status 200 must fail the check. Rules that read page markup are unit-tested on the real page, as the homepage image list is.

Layout, hover, focus and the two buttons are checked in a real browser at 1440×900 and 390×844. The project's browser suite does not check layout beyond a page's width, hover, focus or the buttons, so these are recorded runs. Status 404 for unknown and nested addresses is checked on the local Pages emulator before deployment and by the deployment checks on production.

## Out of Scope

Showing the requested address on the page; search or suggested posts; redirects for moved or removed posts; a separate not-found page for the Blog; a dog that wags on this page.
