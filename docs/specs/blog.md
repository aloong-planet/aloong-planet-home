# Blog

> Related: [features](../features/blog.md) · [visitor line](visitor-counter.md)

## Problem Statement
Aloong wants to publish long, figure-heavy explainers, starting with an analysis of DeepSeek's Super-agent article, show recent writing on the homepage, list every post on a Blog page that reads differently from the homepage's text list, and have every later post look the same without restyling each one.

## Solution
Publish posts as HTML bodies listed in one manifest. Each post also brings a cover image. The build turns them into static post pages with a shared layout and table of contents, the full list on the Blog page as covers with the newest post leading, and the newest entries in the homepage's first screen. The build refuses a post that has no cover, or that would bring its own fonts, dark appearance, or global styles.

## User Stories

### blog::US-001 Find recent posts on the homepage

As a visitor landing on the homepage, I see recent writing beside the portrait and can open it, so I find out what Aloong writes about without leaving the first screen.

- blog::US-001/AC-01: On a window wider than 700px, the area left of the portrait group shows a text list of posts with no visible list title. Each entry shows the date, a title of at most two lines, and a summary of at most two lines; overflow ends in an ellipsis.
- blog::US-001/AC-02: Activating anywhere on an entry opens that post. Hovering an entry underlines its title.
- blog::US-001/AC-03: "全部文章" beneath the list opens the Blog page.
- blog::US-001/AC-04: The list shows the newest 4 posts. With fewer than 4 published it shows all of them.
- blog::US-001/AC-05: The list is at most 440px wide and has equal space to the window's left edge and to the dog; each space is at least 32px, and the list narrows rather than giving up that space.
- blog::US-001/AC-06: The list, whatever its length, is vertically centered between the navigation bar and the bottom of the visible first screen. When it is taller than that area, it starts 24px below the navigation bar and continues past the fold instead of sliding under the bar.
- blog::US-001/AC-07: On a window 700px wide or narrower, the list follows the portrait group and comes before Apps, at the full content width.

### blog::US-002 Browse all posts

As a reader, I can see everything published, each post with its cover, so older posts stay reachable once they leave the homepage and the list reads differently from the homepage's text list.

- blog::US-002/AC-01: The Blog page lists every published post, newest first, each with its cover, date, title, and summary. Titles and summaries show in full. It shows no layout-example notice or example entries.
- blog::US-002/AC-02: Activating anywhere on a post's card opens that post. Hovering a card underlines its title and lifts its cover 4px; with reduced motion the cover stays still. Keyboard focus draws a visible ring around the whole card.
- blog::US-002/AC-03: The page header is one line of small text above the posts. The heading 「Blog」 is 12px, in capitals with 2px letter spacing. The introduction 「关于技术、作品，以及创造的过程。把值得留下的想法，慢慢写下来。」 follows on the same baseline, at 12px in muted text. The header starts 48px below the navigation, or 32px on windows 700px wide or narrower, and leaves 40px before the posts. Where the line does not fit, the introduction wraps under the heading.
- blog::US-002/AC-04: On windows wider than 700px, the newest post leads across the full content width. Its text takes the left third and its cover the right two thirds, 40px apart, and the two are vertically centered on each other. The text is the date, a 26px title, and a 14px summary. Posts with the same date follow blog::REQ-002/AC-04.
- blog::US-002/AC-05: On windows wider than 700px, the other posts follow the lead two to a row, 40px apart. Each card shows its cover on top, then the date, a 20px title, and a 13px summary. Cards in a row align at the top, and a post left over sits alone in the left column.
- blog::US-002/AC-06: On windows 700px wide or narrower, the posts stack in one column with the newest first. Each shows its cover above its text, and the newest post's title is 22px and its summary 13px.
- blog::US-002/AC-07: Every cover shows at 2.35:1, the shape of a WeChat cover, with a thin border and rounded corners so a white cover keeps its edge. A cover of another shape is scaled to fill the frame, centered, and its overflowing edges are cut off. Covers are decorative and carry no text alternative, since the title beside each names the post.

### blog::US-003 Read a post

As a reader, I can read a long post comfortably and move around it quickly.

- blog::US-003/AC-01: A post page keeps the site's light surfaces, fonts, and top navigation, with the Blog item marked as the current section.
- blog::US-003/AC-02: The post content, figures included, is at most 1000px wide. On windows 1280px and wider it sits beside the contents and leaves whitespace to its right.
- blog::US-003/AC-03: On wide windows the post title is 48px, section headings are 26px, the opening sentence is 20px, and body text is 15.5px. Narrower windows scale headings down to at least 32px, 21px, and 17px; body text stays 15.5px.
- blog::US-003/AC-04: On windows 1280px and wider, the contents stay fixed beside the article while it scrolls and mark the current section.
- blog::US-003/AC-05: On windows narrower than 1280px, the contents appear as a two-column block directly under the title block, ordered down the first column and then the second.
- blog::US-003/AC-06: Following a link to a section lands on it immediately with no scroll animation, with the section heading clear of the navigation bar. This applies to the contents, links inside the post, and addresses that include a section.
- blog::US-003/AC-07: After reaching a section near the page end that cannot reach the reading line, by a contents link, an address, or browser back or forward, the contents mark that section. Scrolling to the page end without following a link marks the last entry.
- blog::US-003/AC-08: Links to other sites open in a new tab; links within the post stay in the page.
- blog::US-003/AC-09: "全部文章" at the end of the post opens the Blog page.

## Functional Requirements

### blog::REQ-001 First post (direct acceptance)

《Super-agent 架构图解》 is published at `/blog/super-agent-architecture` and dated 2026-11-05. Its byline reads "Aloong · 2026-11-05 · 解读 DeepSeek Harness 团队《Super-agent 设计探索》", linking the source article. A line beneath reads "原文发表于 2026-10-31，是架构探讨，不是产品发布。下文的「文章」「作者」都指这篇原文。". Its summary reads "DeepSeek 提出的 Super-agent 架构怎么运转？跟一条事件走完全程，再对照公开原型，看哪些已经实现。". All sections, figures, and sources of the source artifact are kept, including the event playback, the article/prototype view switch, and the chart values on hover.

### blog::REQ-002 Publishing a post

- blog::REQ-002/AC-01: Adding a manifest entry, an HTML body, and a cover produces the post page, a Blog card, and, when it is among the newest 4, a homepage entry, with no change to page templates.
- blog::REQ-002/AC-02: A post may add its own stylesheet and script for figures it alone uses. A post that has neither still builds and loads no extra files.
- blog::REQ-002/AC-03: Post pages and lists are complete in the built HTML, so they need no client-side request to show their text.
- blog::REQ-002/AC-04: Posts with the same date keep their manifest order.

### blog::REQ-003 Shared look applies to every post

- blog::REQ-003/AC-01: A post with no stylesheet of its own gets the layout, type sizes, contents, jump behavior, and the shared styles for tables, figures with captions, notes, lists, and its sources block.
- blog::REQ-003/AC-02: The contents are generated from the post's sections. Each entry defaults to the section heading up to its first full-width colon, unless the section names a shorter label. A post with no such sections shows no contents.
- blog::REQ-003/AC-03: Changing the shared stylesheet changes every post on the next build, with no edit to any post.

### blog::REQ-004 The build refuses what would break the shared look

Each case stops the build with a message naming the post and the problem; nothing is deployed.

- blog::REQ-004/AC-01: A body that is a whole page or brings its own resources: a doctype, `html`, `head`, `body`, `title`, `meta`, `link`, `style`, or `script` element, or an `h1`.
- blog::REQ-004/AC-02: A post stylesheet that loads or declares fonts or external resources: `@import`, `@font-face`, or a remote `url()` or `image-set()`.
- blog::REQ-004/AC-03: A post stylesheet with a dark appearance: `prefers-color-scheme`, `color-scheme`, `light-dark()`, or `data-theme`.
- blog::REQ-004/AC-04: A post stylesheet rule whose selector is not scoped inside the post's own class (including one that reaches its siblings), that names no class or id of the post's own beyond it and so styles base elements (such as `.post-x p` or `.post-x a[href]`), or that uses `:is()` or `:where()`, which can hide a base element beside a class. A stylesheet may also not nest rules, or use an at-rule other than `@media`, `@supports`, `@container`, and `@keyframes`.
- blog::REQ-004/AC-05: A rule on the post's own class that sets anything other than custom properties, or a custom property that redefines a shared token.
- blog::REQ-004/AC-06: A font declaration in a post stylesheet whose family is anything but one shared font token.
- blog::REQ-004/AC-07: A manifest problem: no posts, a missing or empty field, a slug that is not lowercase words joined by hyphens, a date that is not a real `YYYY-MM-DD` date, a duplicate slug, or a listed body file that does not exist.
- blog::REQ-004/AC-08: A listed post with no cover image.

### blog::REQ-005 Post covers

- blog::REQ-005/AC-01: Every published post has a cover image, shown with the post on the Blog page.
- blog::REQ-005/AC-02: A post republished from a WeChat article uses that article's cover.
- blog::REQ-005/AC-03: 《Super-agent 架构图解》, which has no WeChat article, uses a still image of its architecture map as its cover, shown whole and centered on white.

## Quality Requirements

### blog::QR-001 Homepage list fits the first screen

Applies to: the homepage list with 4 entries, at the window sizes below, measured from the top of the first screen to the bottom of "全部文章".

- blog::QR-001/AC-01: At 1440×790 and larger windows, the whole list shows within the first screen with every title and summary at two lines.
- blog::QR-001/AC-02: At 1366×650, the whole list shows within the first screen when entries mix one-line and two-line text. With every entry at two lines, the fourth entry may be cut by at most 20px.

## Constraints

### blog::CON-001 No new dependencies (direct acceptance)

Applies to: the post format and the build. Posts are HTML only, with no Markdown step, and the blog adds no package dependency.

### blog::CON-002 One appearance, no web fonts (direct acceptance)

Applies to: every blog page. Pages use the site's fixed light appearance and single language, and request no web fonts.

### blog::CON-003 Static delivery (direct acceptance)

Applies to: every blog page. Blog pages are static assets and invoke no function; [visitor-counter::CON-001](visitor-counter.md) still governs function routing.

## Failure modes and boundaries

Homepage list:
- One published post: the single entry and "全部文章" are centered, and the first entry moves up as posts are added (blog::US-001/AC-04, AC-06).
- More than 4 published: the older ones leave the homepage and remain on the Blog page (blog::US-001/AC-04, blog::US-002/AC-01).
- Over-long title or summary: cut to two lines with an ellipsis on the homepage, shown in full on the Blog page (blog::US-001/AC-01, blog::US-002/AC-01).
- A short window where the first screen is shorter than the 720px hero: the list centers in what is visible, not in the hero (blog::US-001/AC-06).
- A window taller than the 950px hero: the list centers in the hero and stays level with the portrait group (blog::US-001/AC-06).
- The narrowest two-column window: the list never covers the dog's hit area, the portrait, or the introduction (blog::US-001/AC-05).
- Keyboard: each entry is one focusable link with a visible focus ring, and the visible heading order stays h1 then h2.

Blog page:
- One published post: the lead shows alone, with no cards below it (blog::US-002/AC-04).
- An even number of posts leaves one card alone in the left column of the last row (blog::US-002/AC-05).
- A lead with a long title or summary has text taller than its cover; the two stay centered on each other (blog::US-002/AC-04).
- Two posts with the same newest date: the one listed first in the manifest leads (blog::REQ-002/AC-04).
- A cover whose shape is not 2.35:1 is published as it is and shown centered and cropped to fill its frame; the build does not refuse it (blog::US-002/AC-07).
- A cover that fails to load leaves its frame at the same size on the light ground; the date, title, summary, and link still work (blog::US-002/AC-07).
- A post without a cover never reaches the page, because the build refuses it (blog::REQ-004/AC-08).
- Keyboard: each card is one focusable link with a visible focus ring, and the visible heading order stays h1 then h2 (blog::US-002/AC-02).
- The narrowest phone window: the header wraps and the page never scrolls sideways (blog::US-002/AC-03, AC-06).

Post page:
- Opening an address with a section, reloading, and browser back or forward all land on the section, with no animation (blog::US-003/AC-06).
- A contents link clicked while already at the page end still moves the mark (blog::US-003/AC-07).
- Scripting unavailable: the text, static figures, and contents links keep working; the current-section mark, top navigation, and post-specific interaction do not appear, and nothing else breaks.
- A post's own script throws: the post text and the contents keep working, because the shared script does not depend on it.
- Figures wider than a phone scroll inside their own box; the page itself never scrolls sideways.
- Contents taller than a short window scroll inside their own column.
- Two equal `id`s in a body are the author's error: the first wins, as in any HTML page. No check is added.

Build and publishing:
- Publishing no posts at all fails the build rather than showing an unprototyped empty page (blog::REQ-004/AC-07).
- A stylesheet, script, or cover file with no manifest entry is ignored and is not deployed.
- A title or summary containing HTML characters is shown as text, never parsed as markup.
- A removed post's address shows the [not-found page](not-found.md) with status 404, like any address the site does not have. No redirect is kept.
- Deployment checks request the homepage, the Blog page, every post page, and the shared stylesheet and script on all public hosts, and each must answer with status 200 and its own expected text, so neither the not-found page nor another page passes for it. Every cover the Blog page shows must answer with status 200 and an image content type.

Content a post brings in:
- Other-site links, including scheme-relative ones, open a new tab with no referrer. Site links and in-page links stay in the tab. A link that already names a target keeps it, and a link that names its own `rel` keeps that instead of gaining no-referrer.
- Link, section, and contents-label attributes may use double quotes, single quotes, or none. A section id may be non-ASCII.
- Post bodies come from the repository and are trusted, so no sanitizing is applied. They cannot load scripts or styles from the body; those come only from the post's own files.
- The post's own script runs on that post's page only, and its stylesheet applies only inside the post's own class.

Existing features:
- The homepage list stays a text list with no covers (blog::US-001/AC-01).
- Homepage portrait, dog interaction, visitor line, Apps cards, and the visitor API behave as before, apart from the narrow-screen spacing that makes room for the list and the [visitor line wording](visitor-counter.md).
- The homepage footer has no Blog link: the list's "全部文章" and the top navigation lead to the Blog page.
- The homepage's Apps and About links keep their smooth scroll; only post pages drop it.

## Implementation Decisions

- A build step reads the manifest and post files, validates them, writes one static page per post, and fills marked slots in the homepage and Blog templates. Rendering at build time keeps pages static and readable without scripting.
- Post pages load the site stylesheet, then a shared article stylesheet and a shared article script that only post pages use, then the post's own files if it has them. Site-wide smooth scrolling is overridden in the shared article stylesheet, because the browser gives no control over its duration.
- A post's own styles are written under a `post-<slug>` class placed on the post's content, leaving the title block and contents outside its reach. The validation reads the shared tokens from the site and article stylesheets, so a token added there is protected automatically. It reads stylesheet structure with strings emptied, and allows named at-rules and font values rather than refusing named ones, because refusing named forms kept leaving others open.
- The post sections appear in the contents through `section` or `footer` elements with an `id`. An optional `data-toc` attribute supplies a shorter label; it is the only way a `footer` joins the contents.
- Each post's cover is a WebP file named after the post and kept with the post's other files, reduced to web size before it is added; a cover under another name or format counts as missing. The build checks that it exists and copies it, but converts nothing, so no image dependency is added (blog::CON-001). The Blog page writes the lead and the cards into the built page like the other lists. Each cover frame keeps its 2.35:1 shape before its image loads, so nothing shifts as covers arrive, and covers below the lead load lazily.
- The homepage list's width runs from the window edge to the dog, which sits at a fixed offset from the portrait group's center. Auto margins center the list so that it stops at the top when too tall.
- Contents are generated once at build time and the current-section mark is a small script; the mark is `aria-current`.
- Status marks in a post are drawn in its stylesheet. Typed symbols are not used as icons.

## Testing Decisions

A good test here builds a real site from fixture posts in a temporary folder and asserts on the written pages and on the build's refusals, without looking inside the build step. That covers the Blog page's order, with the newest post leading and every post carrying its cover, and the refusal of a post with no cover. The seams are the blog build module's exported build function, the build and deployment-check scripts run as processes in a temporary folder, and the visitor client's exported display function with a stubbed network. Deployment checks are tested against the real site and local servers that answer an address the site does not have with the not-found page and status 404, as the host does; the `SMOKE_DEADLINE_MS` environment variable shortens their retry window so a failing test ends in seconds, and nothing in deployment sets it. Existing precedent is `tests/deploy.test.mjs` and `tests/visitor-client.test.mjs`.

Layout, type sizes, hover, scrolling, and interactive figures are checked in a real browser against the built site at the window sizes this spec names; per the project capabilities the browser suite is not enabled, so these are recorded runs, not automated tests.

## Out of Scope

Markdown or any other post format; drafts and scheduled publishing (a listed post is published); tags, search, pagination, comments; RSS, sitemap, and social preview tags; post-owned image files other than the cover; dark appearance and other languages; redirects for removed posts.
