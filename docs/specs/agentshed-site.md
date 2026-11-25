# Agentshed's site

> Related: [ADR-0001](../adr/0001-app-websites-in-this-repository.md) · [app-sites](app-sites.md) ·
> Agentshed's [ADR-0050][ag-adr-0050] · [ADR-0031][ag-adr-0031] · [ADR-0055][ag-adr-0055] ·
> Agentshed's [mac-distribution][ag-mac-distribution] (the releases and the pointer it reads) ·
> Agentshed's [app-update][ag-app-update] (the update button its install steps mention)

## Problem Statement

People who have never seen the repository need a place that says what Agentshed is and lets them
download it. The README is written for people already on GitHub. Releases come in two kinds,
pre-releases and formal releases, and the R2 mirror holds formal releases only. So the page has to offer
whichever release exists, say plainly when that is a test version, and keep doing so release after
release without being edited. A visitor weighing an app they have
never heard of also looks for a sign that other people download it.

## Solution

A package of this repository, `apps/agentshed`, built with Astro and deployed by Cloudflare Pages at
`agentshed.aloongplanet.com`, in English (at `/`) and Chinese (at `/zh/`). It is
one long page: header, hero with the download, a scroll-linked features section, three
install steps, a download section and a footer. The visitor's browser decides what to offer. It reads
the R2 latest pointer for a formal release. Failing that, it reads GitHub's public releases API, which
gives the latest formal release if there is one and otherwise the newest pre-release. Failing both, it
offers GitHub's release list. A release therefore never needs a site change. The download section also says
how many times the app has been downloaded. The screenshots are real app screenshots.

## User Stories

### agentshed-site::US-001 Understand what Agentshed is and download it

As a visitor, I want to see at a glance what Agentshed does and get it in one click, so that I can try
it without reading the repository. What the download button offers is defined by agentshed-site::REQ-001 and
agentshed-site::REQ-002.

- agentshed-site::US-001/AC-01: The hero shows the app icon, the title, a one-paragraph description, the
  download button with the platform line "macOS 12 or later · Apple Silicon", and a walkthrough with captions in the page language.

### agentshed-site::US-002 Read the page in my language

As a visitor, I want the page in Chinese or English, so that I can read it comfortably.

- agentshed-site::US-002/AC-01: English is served at `/`, regardless of the browser language, and Chinese
  at `/zh/`. A toggle at the right of the header links directly between them.
- agentshed-site::US-002/AC-02: Both languages carry the same sections, the same download states and
  their own set of screenshots.
- agentshed-site::US-002/AC-03: Old `/en` and `/en/` links permanently redirect to `/`, preserving
  query parameters and page fragments, including when JavaScript is disabled.

### agentshed-site::US-003 See what the app shows

As a visitor, I want to see the app's main views next to a short description of each, so that I know
what I would get.

- agentshed-site::US-003/AC-01: The features section presents six steps in order — the overview, what
  each project has, what the agents remember, token usage and trends, sessions revisited, and search
  across projects — each with a screenshot of that view (agentshed-site::REQ-004, agentshed-site::REQ-005).
- agentshed-site::US-003/AC-02: The sessions step speaks of searching within the project, and the search
  step of searching what you asked across every project. The
  search step names no keyboard shortcut.

### agentshed-site::US-004 Know what installing involves

As a visitor, I want to know the install steps and what the first launch will show, so that the system
notice does not alarm me.

- agentshed-site::US-004/AC-01: Three steps: download the DMG for Apple Silicon; open it and drag
  Agentshed into Applications; open it. The third step says macOS will report that Apple checked it for
  malicious software and found none, that clicking Open is enough, and that when a new version comes
  out an update button appears at the bottom left of the app.

## Functional Requirements

### agentshed-site::REQ-001 Deciding what to offer

- agentshed-site::REQ-001/AC-01: If the visitor's browser reads the R2 latest pointer, the page shows the
  formal state from R2, with that pointer's version.
- agentshed-site::REQ-001/AC-02: If the pointer is absent or cannot be read (offline, blocked, malformed),
  the page reads GitHub's public releases API. It takes the latest formal release if there is one,
  shown in the formal state with every link on GitHub; otherwise it takes the newest pre-release, shown
  in the test state.
- agentshed-site::REQ-001/AC-03: If neither source can be read, or GitHub lists no release at all, the
  page shows the list state.
- agentshed-site::REQ-001/AC-04: The page as first served, before its script runs (and for a visitor
  without scripts), is in the list state.
- agentshed-site::REQ-001/AC-05: No release requires the site to be edited or redeployed.

### agentshed-site::REQ-002 What each state shows

- agentshed-site::REQ-002/AC-01: **Formal (from R2)**: the hero button reads "Download Agentshed <version>"
  and downloads the DMG from the download host. Beneath it are the platform line and a link, "See every
  version on GitHub". The download section reads "Current version <version>", and its row has two
  buttons: Download (the R2 DMG) and GitHub (the same DMG on GitHub).
- agentshed-site::REQ-002/AC-02: **Formal (from GitHub)**: the same as AC-01, except that every link goes
  to GitHub and the download row has the one Download button.
- agentshed-site::REQ-002/AC-03: **Test**: the hero button reads "Download pre-release version <version>" and
  leads to that pre-release's page on GitHub. Beneath it, the platform line carries a "Pre-release version"
  pill, followed by the note "No stable release yet. The pre-release version downloads from GitHub and may
  still be rough in places." The download section reads "Only a pre-release version so far: <version>", with
  the pill, and its one button reads "Download the pre-release version from GitHub".
- agentshed-site::REQ-002/AC-04: **List**: the hero button reads "Download Agentshed from GitHub" and leads
  to the release list. Beneath it is the platform line, with no pill and no version anywhere in the
  buttons. The download section reads "Version details can’t be loaded right now — download from
  GitHub", with one button, "Download from GitHub".
- agentshed-site::REQ-002/AC-05: Links to GitHub open in a new tab. The R2 download starts in place.
- agentshed-site::REQ-002/AC-06: The GitHub button of agentshed-site::REQ-002/AC-01 is a secondary button: the card
  ground with the strong line, and the accent border on the soft accent ground on hover.
- agentshed-site::REQ-002/AC-07: In the test state of agentshed-site::REQ-002/AC-03, the pill and the note use the
  app's warning pair.

### agentshed-site::REQ-003 Page structure (direct acceptance)

The header holds the brand (icon and name), the navigation (Features, Install, Download, GitHub; hidden
below the layout breakpoint of agentshed-site::REQ-004/AC-06) and the language toggle, and it stays at the top while scrolling. Below it come the hero,
the features section (title "One app, the whole picture", subtitle "It only reads the files your coding
agents leave on your Mac."), the install section, the download section, and a footer with GitHub,
Releases and the copyright line.

### agentshed-site::REQ-004 The pinned features section

- agentshed-site::REQ-004/AC-01: On a wide screen the section pins a showcase under the header while the
  page scrolls past it. A narrow column on the left shows the current step's number and the count of steps
  (as "03 / 06"), its title and its text; the step's screenshot stands large on the right in the window
  frame, whole under the header even in a short window. There are no progress dots and no hint to
  scroll.
- agentshed-site::REQ-004/AC-05: A step turns by cross-fading its text and its screenshot together, in
  place: nothing moves, and every step's text starts on the same line. Under reduced motion the switch
  is instant. Only the current step's text and screenshot are visible to the pointer and to assistive
  technology.
- agentshed-site::REQ-004/AC-06: The page's layout breakpoint is 760px: below it nothing is pinned. Each step's own screenshot sits under its
  text, with a clear gap before the next step's title.
- agentshed-site::REQ-004/AC-07: Switching language keeps the current step and the scroll position.
- agentshed-site::REQ-004/AC-08: The page scrolls as usual and nothing captures the wheel. A unit is 60% of
  the window's height. The showcase stays pinned for one unit of scrolling for each step after the first.
  The first step shows when the showcase pins, the second from half a unit of scrolling on, and each
  further step from a unit of scrolling after the one before it; scrolling back turns back. Before the
  showcase pins the first step shows, and once it has scrolled past, the last.

### agentshed-site::REQ-005 The screenshots

- agentshed-site::REQ-005/AC-01: The overview, project, token and
  Chinese session screenshots come from the built app over the owner's own agent data, approved for
  publication by the owner. The memory and search screenshots come from the built app over a made-up
  home whose projects, memory files and questions have the shape of real ones, the same projects in
  both. There is one set per language, taken in the light appearance. The English session screenshot
  is retaken from the built app over an English example conversation, including English questions,
  replies and tool details.
- agentshed-site::REQ-005/AC-02: Each feature screenshot is cut to the part of the window its step is about. All six are the
  same size (920×517.5pt at 2×, 16:9) at the same zoom. Each cut ends between list rows. The token cut
  holds the trend chart and the per-model figures whole and leaves out the recent-sessions list. The
  memory cut shows a memory file open in the drawer as rendered
  Markdown, over the Agents page's Memory section with that file's project (one with only a few memory
  files) expanded and other projects still in view, and ends between the drawer's lines too. The search
  cut starts at the search box and keeps each row's hit count and time. The memory, search and English
  session cuts hold their pane whole, its right edge included.
- agentshed-site::REQ-005/AC-03: Every screenshot's space is held before it loads, so nothing jumps.

### agentshed-site::REQ-006 Copy (direct acceptance)

The copy is in Chinese and English only. Where the page refers to the agents Agentshed reads, it names
examples without presenting them as the complete set ("Claude Code, Codex and other coding agents").
The page uses the app's own palette, in light and dark,
following the visitor's system appearance.

### agentshed-site::REQ-007 The hero's heading (direct acceptance)

The hero's heading is "Your coding agents, in full view" in English.

### agentshed-site::REQ-008 What the project step names (direct acceptance)

The features section's project step lists what a project has using the app's own word for the section
([project-detail::REQ-004][ag-project-detail]): "Skills, subagents, plugins, MCP servers and instructions" in English,
and the same list with the section's Chinese label in Chinese.

### agentshed-site::REQ-009 Walkthrough video

- agentshed-site::REQ-009/AC-01: Both pages show the approved local poster in the window frame. The playback entry reads
  “Watch demo · 1:07” in English and uses its localized label with the same duration in Chinese. Each page opens its own video with
  English narration and captions in the page language.
- agentshed-site::REQ-009/AC-02: No YouTube player, thumbnail, preconnect or script loads before activation.
  Clicking the entry or activating it with Enter replaces the poster with the privacy-enhanced YouTube
  player and requests playback. The player supports inline playback and fullscreen; browser playback
  restrictions may require another press of the player's Play control. The frame stays 16:9 throughout.
- agentshed-site::REQ-009/AC-03: “Watch on YouTube” remains available below the frame. Without site scripts,
  the poster is also a direct YouTube link. Modified clicks keep normal link behavior.
- agentshed-site::REQ-009/AC-04: The video is hosted on YouTube. Only the poster and the published video's
  link ship in the website repository; the narration and music are the ones the owner approved.

### agentshed-site::REQ-010 Author homepage (direct acceptance)

In both languages, the footer's copyright line links the author name "aloongplanet" to
`https://aloongplanet.com` in a new tab.

### agentshed-site::REQ-011 The download count

- agentshed-site::REQ-011/AC-01: Below its download row, the download section shows one line with the
  download count: "Downloads so far: N" in English and its Chinese counterpart, N being the count floored
  to a whole number and grouped as the page's language groups numbers. The line's space is held from the
  first render, so nothing on the page moves when its text appears.
- agentshed-site::REQ-011/AC-05: The line stays empty, and the rest of the page is unaffected, when the
  statistics file is absent, cannot be fetched (the network, CORS, the time limit, an answer other than
  2xx), is not JSON, has a `schemaVersion` other than 1, or holds a total, GitHub share or R2 share that is
  negative or not finite, a total above 9007199254740991, or a total that differs from the sum of the two
  shares by more than 0.000001. Without scripts the line stays empty.
- agentshed-site::REQ-011/AC-06: The read of the statistics file never changes or delays the download the
  page offers, in any of the four states, whether it succeeds, fails or is still pending.

### agentshed-site::REQ-012 Back to the aloong planet homepage

- agentshed-site::REQ-012/AC-01: The header's left end shows, in order, "aloong planet", the separator "/"
  and the brand. "aloong planet" is a link that opens `https://aloongplanet.com/` in the current tab; the
  "/" is not a link and assistive technology does not read it; the brand keeps its link. Both languages
  show "aloong planet", untranslated.
- agentshed-site::REQ-012/AC-02: "aloong planet" and "/" take the size and grey of the header's navigation
  links, with 10px between each of the three ("aloong planet", "/", the brand); in the narrow window of
  agentshed-site::REQ-012/AC-03, "aloong planet" and "/" are 4px apart. Hovering "aloong planet" turns it the
  navigation links' hover colour.
- agentshed-site::REQ-012/AC-03: In a window 400px wide or narrower, "aloong planet /" shrinks to 11px, with a
  line height 1.3 times that size, on its own line 1px above the brand's line; the header keeps its height
  and the language toggle stays at the right.
- agentshed-site::REQ-012/AC-04: The trail is a navigation landmark named "Breadcrumb" in English and its Chinese
  counterpart in Chinese. It holds "aloong planet" and the brand as an ordered list of two links, and the brand
  is marked as the current page.

### agentshed-site::REQ-013 The app icon, the tab and the description

- agentshed-site::REQ-013/AC-01: The app icon is the production artwork with its transparent exterior.
- agentshed-site::REQ-013/AC-02: In the hero the icon's shadow follows the icon's outline.
- agentshed-site::REQ-013/AC-03: The browser tab shows the app icon and "Agentshed — " followed by the hero's title.
- agentshed-site::REQ-013/AC-04: The page's description is the hero's paragraph.

## Quality Requirements

### agentshed-site::QR-001 Layout holds across widths, languages and appearances

Applies to: the whole page, in both languages, both appearances and all four download states.

- agentshed-site::QR-001/AC-01: At 400, 900, 1280
  and 1440px, the page never scrolls sideways, every button stays inside its card, and the hero keeps
  its side gutters.

## Constraints

### agentshed-site::CON-001 Where the site lives (direct acceptance)

Applies to: the landing page. A package of this repository, `apps/agentshed`, built with Astro and deployed by
Cloudflare Pages at `agentshed.aloongplanet.com` ([ADR-0001](../adr/0001-app-websites-in-this-repository.md)). It is not
a single static file and not a site kept in the app's repository (ADR-0001 option 2).

### agentshed-site::CON-002 Two languages (direct acceptance)

Applies to: every page and string of the site. Chinese and English only ([ADR-0050][ag-adr-0050] option 2). The app
speaks the same two languages ([ADR-0035][ag-adr-0035]).

### agentshed-site::CON-003 What the page reads (direct acceptance)

Applies to: the visitor's browser. To decide what download to offer, the page reads the R2 latest pointer
and GitHub's public releases API, and no other source. Its only other read is the statistics file, for
the download count (agentshed-site::REQ-011). The walkthrough additionally loads YouTube only after the
visitor activates its poster (REQ-009). Pre-releases are never looked for on R2
([mac-distribution::CON-004][ag-mac-distribution]).

### agentshed-site::CON-004 How a read is made

Applies to: every read of the pointer, of GitHub and of the statistics file (agentshed-site::CON-003).

- agentshed-site::CON-004/AC-01: A read gives up after five seconds (Failure A5).
- agentshed-site::CON-004/AC-02: A read sends no header that needs a CORS preflight.

### agentshed-site::CON-005 The page's font (direct acceptance)

Applies to: the page's text. It is set in the system font stack; the page loads no web font.

## Failure modes and boundaries

**Sequence A: deciding the download**

- A1 Before any release exists: no pointer, and GitHub lists none → the list state, leading to an empty
  release list.
- A2 Only `v0.1.0-beta` exists → the test state with `0.1.0-beta` (agentshed-site::REQ-001/AC-02).
- A3 A formal release has just been published on GitHub and its mirroring is still running → the
  pointer still names the previous formal release, which the page offers from R2 until the pointer
  moves ([mac-distribution::REQ-003][ag-mac-distribution]). For the first formal release there is no pointer yet, and GitHub
  supplies it in the formal state from GitHub.
- A4 A pre-release newer than the latest formal release → the page offers the formal release. The
  pre-release is reached through "See every version on GitHub".
- A5 The pointer cannot be read because of CORS, the network, a timeout or a malformed body → the
  GitHub path (agentshed-site::REQ-001/AC-02). The page never guesses a version.
- A6 GitHub rate-limits the visitor (unauthenticated requests are limited per IP) or answers with an
  error → treated as unreadable (agentshed-site::REQ-001/AC-03).
- A7 A read resolves after the page is shown → the state updates in place. Until then the list state
  is a valid way to download. If the visitor has already moved past the hero's download block, so that it
  is above the view, which starts below the sticky header (scrolled, or put back there by a language
  switch), what they are looking at does not move.
- A8 GitHub's answer includes drafts or releases without the expected DMG → drafts are ignored. A
  release without the DMG is not offered as a direct download; the page offers its release page
  instead.

**Sequence B: languages and navigation**

- B1 A direct visit to `/` → English, even with a Chinese browser preference; `/zh/` → Chinese.
  Old `/en` and `/en/` links redirect to `/`, including links with query parameters or a section fragment,
  without requiring scripts (agentshed-site::US-002/AC-03). The toggle links to the other language directly.
- B2 The navigation's GitHub link opens the repository in a new tab. The section links scroll within
  the page. The footer author name opens the owner's homepage in a new tab (agentshed-site::REQ-010).

**Sequence C: the features section**

- C1 A fast scroll, or a jump to the download section and back → the showcase shows the step the scroll
  position gives (agentshed-site::REQ-004/AC-08), never one left over from before the jump.
- C2 Resizing across the layout breakpoint (agentshed-site::REQ-004/AC-06), or changing the window's height → the layout switches between the pinned
  showcase and the stacked steps, and the step shown follows the scroll position under the new height,
  with no stale step.
- C3 A short window → the screenshot shrinks so that the whole of it stays under the header
  (agentshed-site::REQ-004/AC-01).
- C4 Screenshots not yet loaded → their space is held (agentshed-site::REQ-005/AC-03).
- C5 A language switch while the showcase is pinned → the other page shows the same step
  (agentshed-site::REQ-004/AC-07). The pinned showcase stays at one distance from the top wherever the
  visitor is within it.
- C6 A screen reader on a wide screen meets the current step only; the other steps are reached by
  scrolling (agentshed-site::REQ-004/AC-05).
- C7 A visitor without scripts → the stacked steps show at every width, each with its screenshot: nothing
  would turn the showcase, which would stay on its first step while its block scrolled by.

**Sequence D: appearance**

- D1 Light and dark both carry the page's palette. Switching the system appearance recolours the page.
  Screenshots are taken in the light appearance and stay light in both.

**Content brought in from outside**

- E1 The pointer and GitHub's answer are external data. Only validated version strings and URLs on the
  expected hosts (the download host and github.com) reach the page, rendered as text and as link
  targets. Release notes and other release text are never inserted into the page.
- E2 The overview, project, token and Chinese session screenshots show real project names, paths,
  usage and session text by the owner's decision; the English session, memory and search screenshots show none of the
  owner's data (agentshed-site::REQ-005/AC-01). Retaking them is the only way to change what they show.
- E3 The statistics file is external data too. Only its validated total (agentshed-site::REQ-011/AC-05)
  reaches the page, as the number in the count's text; nothing else it holds is inserted into the page.

**Sequence F: watching the walkthrough in either language**

- F1 A visitor opens the page → only the local poster loads; no sound or YouTube request starts.
- F2 A mouse click or Enter on the poster → one player replaces it without changing the frame size;
  focus moves to the iframe. Playback starts when allowed by the browser.
- F3 Scripts disabled → the poster and the separate link open YouTube. A modified click also opens
  YouTube using normal browser link behavior.
- F4 YouTube is blocked, unavailable or refuses embedded playback → its player owns the error;
  “Watch on YouTube” stays reachable, as do the site's download links. Direct playback also requires
  YouTube access. Reloading the page restores the poster.
- F5 Resize or use a phone → poster and player fit the same responsive 16:9 area, without horizontal overflow.

**The download count**

- G7 The page served from any origin other than the landing page's, such as a Pages preview → the
  count's line stays empty ([mac-distribution::REQ-004/AC-03][ag-mac-distribution]).

## Implementation Decisions

- **The hero video** uses a 1600×900 poster. Activation creates an iframe on `youtube-nocookie.com` with the
  `strict-origin-when-cross-origin` referrer policy, which sends YouTube the embedding origin. No YouTube API
  library is loaded.

- **The pointer read** takes a pointer only when its version is a formal version and its files name the
  arm64 DMG, by its packaged name, at exactly the URL the mirror's layout gives that version. A 404 means
  there is no pointer yet.
- **The GitHub read** uses the unauthenticated public REST API for this repository's releases, one request
  for the first hundred. A release counts when it is published (drafts are ignored) and its tag is `v`
  followed by a version of its kind: a suffix exactly when GitHub marks it a pre-release
  ([mac-distribution][ag-mac-distribution] Failure A2); any other entry is passed over. "Latest" and "newest" in
  agentshed-site::REQ-001/AC-02 go by publication date; the answer's order is not relied on. A release's DMG
  counts only once its upload has finished.
- **Every link** is built from the validated version, never taken from an answer (Failure E1).
- **The language toggle** carries a script that, before leaving, notes the element in view, its distance from
  the top of the window and the current step; the other page puts the same element back at the same distance
  and makes the same step current (agentshed-site::REQ-004/AC-07). The pinned showcase is never that element
  (Failure C5).
- **The statistics file** is JSON at `stats/downloads.json` on the download host. The page reads these fields of it
  and no other:

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | number | The file's format version; which value is read: agentshed-site::REQ-011/AC-05 |
| `summary.total` | number | The download count, unrounded |
| `summary.sources.github` | number | The GitHub share of the total |
| `summary.sources.r2` | number | The R2 share of the total |

## Out of Scope

- Retaking the screenshots to follow a section's rename or move (E2).
- A count per release, per period or per source on the page: the figure answers one question, how many
  times Agentshed has been downloaded ([ADR-0055][ag-adr-0055]).
- More than two languages ([ADR-0050][ag-adr-0050] option 2).
- A copy of the page in mainland China ([ADR-0050][ag-adr-0050] option 4).
- A version constant built into the site (rejected in favour of reading at run time).
- Clicking or keying between the feature steps: the showcase shows one step at a time and turns with the
  scroll (agentshed-site::REQ-004/AC-08).
- Any download other than the disk image for Macs with Apple Silicon on macOS 12 or later: there is
  no Intel, Windows or Linux download.
- Keeping the hero's heading and paragraph word for word the same as the README's opening (the owner
  does not need the two to match).
- The homepage's Apps and Agents menus in the header: the header only links back to the homepage
  (agentshed-site::REQ-012).

## Further Notes

- The download host is `dl.agentshed.aloongplanet.com` ([mac-distribution::REQ-004][ag-mac-distribution]), and the pointer is
  `latest.json` at its root; the pointer's shape is in [mac-distribution][ag-mac-distribution]'s Implementation Decisions.

[ag-adr-0031]: https://github.com/aloong-planet/agentshed/blob/main/docs/adr/0031-macos-release-line.md
[ag-adr-0035]: https://github.com/aloong-planet/agentshed/blob/main/docs/adr/0035-ui-languages-chinese-and-english.md
[ag-adr-0050]: https://github.com/aloong-planet/agentshed/blob/main/docs/adr/0050-landing-page-in-this-repository.md
[ag-adr-0055]: https://github.com/aloong-planet/agentshed/blob/main/docs/adr/0055-download-count.md
[ag-app-update]: https://github.com/aloong-planet/agentshed/blob/main/docs/specs/app-update.md
[ag-mac-distribution]: https://github.com/aloong-planet/agentshed/blob/main/docs/specs/mac-distribution.md
[ag-project-detail]: https://github.com/aloong-planet/agentshed/blob/main/docs/specs/project-detail.md
