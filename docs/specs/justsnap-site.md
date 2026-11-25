# JustSnap's site

> Related: [ADR-0001](../adr/0001-app-websites-in-this-repository.md) · [app-sites](app-sites.md) ·
> JustSnap's [ADR-0003][js-adr-0003] · [ADR-0004][js-adr-0004] · [ADR-0007][js-adr-0007] ·
> JustSnap's [release-mirror][js-release-mirror] (the releases and the pointer it reads)

## Problem Statement

People who have never seen the repository need a place that says what JustSnap does, how to install it and where to
download it. The GitHub repository page is written for people already on GitHub. Releases come one after another, so the
page has to offer the current formal release every time, without anyone editing it.

## Solution

A package of this repository, `apps/justsnap`, built with Astro and deployed by Cloudflare Pages at
`justsnap.aloongplanet.com`, in Chinese (at `/`) and English (at `/en`). It is one long page: header, a hero that fills
the first screen and carries the download button, a scroll-linked features section, a “Download and install” section
with the download and the install steps, and a footer. The visitor's browser decides what to offer from the release
data it reads. A release therefore never needs a site change.

> Pending: Cloudflare Pages deploys the site from this repository's `apps/justsnap`.

## User Stories

### justsnap-site::US-001 Understand what JustSnap does and download it

As a visitor, I want to see at a glance what JustSnap does and get it in one click, so that I can try it without
reading the repository. What the download button offers is defined by justsnap-site::REQ-001 and
justsnap-site::REQ-002.

- justsnap-site::US-001/AC-01: The hero shows the name, a description, the download button, the platform line
  “macOS 14.4 or later · Apple silicon” (Chinese: “macOS 14.4 或更高 · Apple 芯片”) and a screenshot.

### justsnap-site::US-002 Read the page in my language

As a visitor, I want to read the page in Chinese or English, so that it reads comfortably.

- justsnap-site::US-002/AC-01: Chinese is at `/` and English at `/en`; the toggle at the right of the header switches
  between them.
- justsnap-site::US-002/AC-02: Both languages carry the same sections and the same download states, and each its own
  set of screenshots.

### justsnap-site::US-003 See the app's main uses

As a visitor, I want to see the app's main uses with a short description of each, so that I know what I would get.

- justsnap-site::US-003/AC-01: The features section gives six steps in order — selecting a screen region, extracting
  text, translating, pasting an image or text, history and retry, and bringing your own provider — each with a
  screenshot of that use (justsnap-site::REQ-004, justsnap-site::REQ-005).
- justsnap-site::US-003/AC-02: The translate step says the target language can be changed at any time. The last step
  says the key is kept in the macOS Keychain and the screenshot goes only to the provider the visitor chose.

### justsnap-site::US-004 Know what installing involves

As a visitor, I want to know the install steps and what the first launch will show, so that the system's notices do not
alarm me.

- justsnap-site::US-004/AC-01: Three steps: get the DMG with the download button above them; open it and drag JustSnap
  into Applications; open the app.
- justsnap-site::US-004/AC-02: The third step says macOS will report that Apple checked the app for malicious software
  and found none, and that clicking Open is enough; that the app guides the visitor through granting Screen Recording
  permission and adding a provider's API key; and that when a new version is out, the menu bar panel shows an update
  notice.

## Functional Requirements

### justsnap-site::REQ-001 Deciding what to offer

- justsnap-site::REQ-001/AC-01: If the visitor's browser reads the R2 latest pointer, the page shows the formal state
  from R2, with the pointer's version.
- justsnap-site::REQ-001/AC-02: If the pointer is absent or cannot be read (offline, blocked, malformed), the page reads
  GitHub's public releases API, takes the latest formal release and shows the formal state from GitHub, with every link
  on GitHub. Pre-releases are not offered.
- justsnap-site::REQ-001/AC-03: If neither source can be read, or GitHub has no formal release, the page shows the list
  state.
- justsnap-site::REQ-001/AC-04: The page as first served, before its script runs (and for a visitor without scripts), is
  in the list state.
- justsnap-site::REQ-001/AC-05: No release requires the site to be edited or redeployed.

### justsnap-site::REQ-002 What each state shows

- justsnap-site::REQ-002/AC-01: **Formal (from R2)**: the hero button reads “Download JustSnap <version>” (Chinese:
  “下载随译 <版本>”) and downloads the DMG from the download host. Beneath it are the platform line and the link “See
  every version on GitHub” (Chinese: “在 GitHub 查看所有版本”). The download section reads “Current version <version>”
  (Chinese: “当前版本 <版本>”), and its row has two buttons: Download (the R2 DMG) and GitHub (the same DMG on GitHub).
- justsnap-site::REQ-002/AC-02: **Formal (from GitHub)**: the same as AC-01, except that every link goes to GitHub and
  the download row has the one Download button. If that release has no DMG, the button leads to the release's page.
- justsnap-site::REQ-002/AC-03: **List**: the hero button reads “Download JustSnap from GitHub” (Chinese: “从 GitHub 下载随译”)
  and leads to the release list. Neither the button nor the platform line carries a version. The download section reads
  “Version details can't be loaded right now — download from GitHub” (Chinese: “暂时无法读取版本信息，请前往 GitHub 下载”),
  with one button, “Download from GitHub” (Chinese: “前往 GitHub 下载”).
- justsnap-site::REQ-002/AC-04: Links to GitHub open in a new tab. The R2 download starts in place.

### justsnap-site::REQ-003 Page structure

- justsnap-site::REQ-003/AC-01: The header holds the brand (justsnap-site::REQ-008), the navigation (the features
  section, the download section and GitHub; hidden in windows narrower than 760px) and the language toggle, and stays at
  the top while scrolling.
- justsnap-site::REQ-003/AC-02: Below the header come the hero, the features section, the “Download and install”
  section and the footer. The “Download and install” section holds the download first, then the three install steps
  (justsnap-site::US-004). The footer has the GitHub and release-list links and the copyright line.
- justsnap-site::REQ-003/AC-03: The content is at most 1280px wide. In a window wider than 900px the hero fills exactly
  the screen below the header: on its left the name, the description and the download block, on its right the
  screenshot, enlarged so that the whole of it is on that screen; the features section begins exactly below the hero.
  In a window no wider than 900px the hero is as tall as its content, with the screenshot below the text across the
  content's width.
- justsnap-site::REQ-003/AC-04: The header's navigation is one navigation landmark named “Main” (Chinese: “主要”).

### justsnap-site::REQ-004 The pinned features section

- justsnap-site::REQ-004/AC-01: On a wide screen the section pins a showcase under the header while the page scrolls
  past it. A narrow column on the left shows the current step's number and the count of steps (as “03 / 06”), its title
  and its text; the step's screenshot stands large on the right, whole under the header even in a short window. There
  are no progress dots and no hint to scroll.
- justsnap-site::REQ-004/AC-02: A step turns by cross-fading its text and its screenshot together, in place: nothing
  moves, and every step's text starts on the same line. Under reduced motion the switch is instant. Only the current
  step's text and screenshot are visible to the pointer and to assistive technology.
- justsnap-site::REQ-004/AC-03: In a window narrower than 760px nothing is pinned. Each step's own screenshot sits under
  its text, with a clear gap before the next step's title.
- justsnap-site::REQ-004/AC-04: Switching language keeps the current step and the scroll position.
- justsnap-site::REQ-004/AC-05: The page scrolls as usual and nothing captures the wheel. When the showcase pins, it
  shows the first step. The current step is the distance scrolled since it pinned, divided by 60% of the window's
  height, rounded and held between the first and the last step; scrolling back turns back. Before the showcase pins it
  shows the first step, and once it has scrolled past, the last. The showcase takes a scroll length of the window's
  height minus the header's height, plus 60% of the window's height for each step after the first.

### justsnap-site::REQ-005 The screenshots

- justsnap-site::REQ-005/AC-01: The hero's screenshot and the six feature screenshots are rendered, offscreen, from the
  built app's own interface views. They are not captures of the running app or of anyone's screen. Their content is
  invented (example text, example conversations) and shows none of the user's own data. There is one set per language,
  in the light appearance.
- justsnap-site::REQ-005/AC-02: The six feature screenshots are 16:9 and scaled alike, so that text keeps its size as
  steps turn; each is cut between list rows.
- justsnap-site::REQ-005/AC-03: Every screenshot's space is held before it loads, so nothing jumps.
- justsnap-site::REQ-005/AC-04: The site's production build fails when any two screenshots are the same file.

### justsnap-site::REQ-006 Copy (direct acceptance)

The copy is in Chinese and English only. The Chinese page calls the product “随译”: the brand and the page title read
“随译 JustSnap”, and the hero's description puts “（JustSnap）” after it. The English page calls it JustSnap. Where the
page names model providers it gives examples, not the complete set (“OpenAI, Gemini, DeepSeek and more”; Chinese:
“OpenAI、Gemini、DeepSeek 等”). The features section's title is “From screen to text in one shortcut” (Chinese: “一个快捷键，从屏幕到文字”) and its
subtitle “No annotation tools, no classic OCR step: the original image goes straight to a vision model.” (Chinese:
“不做标注，也不先过传统 OCR：原图直接交给视觉模型。”). The install steps' title is “Installed in three steps” (Chinese:
“三步装好”).

### justsnap-site::REQ-007 The hero's heading and description (direct acceptance)

The hero's heading is “Snap any part of your screen. Get the text or the translation.” in English and “截一块屏幕，直接提取文字或翻译”
in Chinese. Its description is “JustSnap lives in your Mac's menu bar. Select any region, and seconds later a vision
model hands back the text or the translation. Bring your own provider.” in English and “随译（JustSnap）是 macOS
菜单栏里的截图工具：框选任意区域，几秒内拿到提取的文字或译文。用你自己的模型服务商。” in Chinese.

### justsnap-site::REQ-008 The app mark (direct acceptance)

The header's mark is the app icon followed by the brand text (justsnap-site::REQ-006); the icon is decoration only, and
assistive technology reads the text alone. The browser tab uses the app icon. The icon is the app icon's artwork without
its margin and drop shadow.

> Pending: the hero shows the app icon.

### justsnap-site::REQ-009 Back to the aloong planet homepage

- justsnap-site::REQ-009/AC-01: The header's left end shows, in order, “aloong planet”, the separator “/” and the
  brand. “aloong planet” is a link that opens `https://aloongplanet.com/` in the current tab; the “/” is not a link and
  assistive technology does not read it; the brand links to the top of the page. Both languages show “aloong planet”,
  untranslated.
- justsnap-site::REQ-009/AC-02: “aloong planet” and “/” take the size and grey of the header's navigation links, with
  10px between each of the three (“aloong planet”, “/”, the brand); in the narrow window of
  justsnap-site::REQ-009/AC-03, “aloong planet” and “/” are 4px apart. Hovering “aloong planet” turns it the navigation
  links' hover colour; keyboard focus on it shows the same focus ring as the header's other links.
- justsnap-site::REQ-009/AC-03: In a window 440px wide or narrower, “aloong planet /” shrinks to 11px, with a line
  height 1.3 times that size, on a line of its own above the brand, 1px from the brand's line; the header keeps its
  height and the language toggle stays at the right.
- justsnap-site::REQ-009/AC-04: The breadcrumb is a navigation landmark named “Breadcrumb” (Chinese: “面包屑”); “aloong
  planet” and the brand are the two items of an ordered list in it, and the brand is marked as the current page.

### justsnap-site::REQ-010 The palette and the icons (direct acceptance)

The page has a light and a dark palette that follow the visitor's system appearance. The page's ground and text take the
light and dark values of the blue-grey palette of the app's history page, and its accent is that palette's “type” blue:
`#1553B2` in the light appearance and `#9BC0FF` in the dark. The page's interface icons (download and so on) are
Lucide's; the app icon is justsnap-site::REQ-008.

## Quality Requirements

### justsnap-site::QR-001 Layout holds across widths, languages and appearances

Applies to: the whole page, in both languages, both appearances and all three download states.

- justsnap-site::QR-001/AC-01: At 400, 900, 1280 and 1440px, the page never scrolls sideways, every button stays inside
  its card, and the hero keeps its side margins.

### justsnap-site::QR-002 Text is readable

Applies to: all text of the page, in both appearances.

- justsnap-site::QR-002/AC-01: The hero's description, the features' text and the text in cards take the body colour;
  the secondary colour is for notes such as the platform line and the step numbers.
- justsnap-site::QR-002/AC-02: Every text colour has a contrast of at least 4.5:1 against the ground it sits on.

## Constraints

### justsnap-site::CON-001 Where the site lives (direct acceptance)

Applies to: the website. A package of this repository, `apps/justsnap`, built with Astro and deployed by Cloudflare
Pages at `justsnap.aloongplanet.com` ([ADR-0001](../adr/0001-app-websites-in-this-repository.md)).

### justsnap-site::CON-002 Two languages (direct acceptance)

Applies to: every page and string of the site. Chinese and English only, the app's own interface languages
([ADR-0003][js-adr-0003]).

### justsnap-site::CON-003 What the page reads (direct acceptance)

Applies to: the visitor's browser. To decide what download to offer, the page reads the R2 latest pointer and GitHub's
public releases API, and no other source.

### justsnap-site::CON-004 Only the Apple silicon package (direct acceptance)

Applies to: every download entry and every string of the page. The page offers only the Apple silicon DMG
([ADR-0004][js-adr-0004]); it offers no Universal or Intel DMG and does not mention them.

### justsnap-site::CON-005 How a read is made

Applies to: every read of the pointer and of GitHub (justsnap-site::CON-003).

- justsnap-site::CON-005/AC-01: A read gives up after five seconds (Failure A2).
- justsnap-site::CON-005/AC-02: A read sends no header that needs a CORS preflight.

### justsnap-site::CON-006 The page's font (direct acceptance)

Applies to: the page's text. It is set in the system font stack; the page loads no web font.

## Failure modes and boundaries

**Sequence A: deciding the download**

- A1 Before any release exists: no pointer, and GitHub has none → the list state, leading to an empty release list.
- A2 The pointer cannot be read (CORS, the network, a timeout, a malformed body) → the GitHub path
  (justsnap-site::REQ-001/AC-02). The page never guesses a version.
- A3 GitHub rate-limits the visitor or answers with an error → treated as unreadable (justsnap-site::REQ-001/AC-03).
- A4 A formal release has just been published on GitHub and its mirroring is still running → the pointer still names the
  previous formal release, which the page offers from R2 until the pointer moves. For the first formal release there is
  no pointer yet, and GitHub supplies it in the formal state from GitHub.
- A5 A read resolves after the page is shown → the state updates in place. Until then the list state is a valid way to
  download. If the visitor has already moved past the hero's download block (scrolled, or put back there by a language
  switch), what they are looking at does not move.
- A6 GitHub's answer includes drafts, or a release without the Apple silicon DMG → drafts are ignored. A release without
  the DMG is not offered as a direct download; the page offers its release page instead.
- A7 GitHub has only pre-releases → the list state.

**Sequence B: languages and navigation**

- B1 A direct visit to `/en` → English, with the toggle at EN; the toggle goes to the other language's page.
- B2 The navigation's GitHub link opens the repository in a new tab. The section links scroll within the page.

**Sequence C: the features section**

- C1 A fast scroll, or a jump to the download section and back → the showcase shows the step the scroll position gives
  (justsnap-site::REQ-004/AC-05), never one left over from before the jump.
- C2 Resizing across 760px, or changing the window's height → the layout switches between the pinned showcase and the
  stacked steps, and the step shown follows the scroll position under the new height, with no stale step.
- C3 A short window → the screenshot shrinks so that the whole of it stays under the header
  (justsnap-site::REQ-004/AC-01).
- C4 A screen reader on a wide screen meets the current step only; the other steps are reached by scrolling
  (justsnap-site::REQ-004/AC-02).
- C5 A visitor without scripts → the stacked steps show at every width, each with its screenshot.

**Sequence D: appearance**

- D1 Light and dark both carry the page's palette; switching the system appearance recolours the page. The screenshots
  are taken in the light appearance and stay light in both.

**Content brought in from outside**

- E1 The pointer and GitHub's answer are external data. Only validated version strings and URLs on the expected hosts
  (the download host and github.com) reach the page, rendered as text and as link targets; every link is built from the
  validated version, never taken from an answer. Release notes and other release text are never inserted into the
  page.

## Implementation Decisions

- **The pointer** is `latest.json` at the download host's root, shaped `{ version, files: [{ name, arch, size, url }] }`.
  The page takes it only when `version` is a formal version (`major.minor.patch`, no suffix), `files` has an entry whose
  `arch` is `arm64`, whose `name` is `JustSnap-<version>-mac-arm64.dmg` and whose `url` is exactly
  `https://dl.justsnap.aloongplanet.com/releases/v<version>/<name>`. A 404 means there is no pointer yet. Entries for
  other architectures are ignored.
- **The GitHub read** uses the unauthenticated public REST API for `aloong-planet/justsnap`, one request for the first
  hundred releases. A release counts when its tag is `v` followed by a formal version. “Latest” in
  justsnap-site::REQ-001/AC-02 goes by publication date; the answer's order is not relied on. A release's DMG counts
  only once its upload has finished.
- **Keeping the place across the language switch**: before leaving, the page notes the element in view, its distance from
  the top of the window and the current step; the other page puts the same element back at the same distance and makes
  the same step current (justsnap-site::REQ-004/AC-04). The element is never the pinned showcase.

## Out of Scope

- A download entry for the Universal and Intel packages: the release has one Apple silicon package
  ([ADR-0004][js-adr-0004]) (justsnap-site::CON-004).
- A download state for pre-releases: there is no pre-release channel.
- Download statistics.
- Languages other than the two.
- A copy of the page for mainland China.
- Showing release notes on the page (Failure E1).
- Clicking or keying between the steps: the showcase shows one step at a time and turns with the scroll
  (justsnap-site::REQ-004/AC-05).
- The homepage's Apps and Agents menus in the header: the header only links back to the homepage
  (justsnap-site::REQ-009).

## Further Notes

- The download host is `dl.justsnap.aloongplanet.com`, and JustSnap's release mirror writes the pointer at its root
  ([release-mirror::REQ-001/AC-01][js-release-mirror], [release-mirror::REQ-004/AC-01][js-release-mirror]).

[js-adr-0003]: https://github.com/aloong-planet/justsnap/blob/main/docs/adr/0003-v1-interface-localization-boundary.md
[js-adr-0004]: https://github.com/aloong-planet/justsnap/blob/main/docs/adr/0004-distribute-one-apple-silicon-package.md
[js-adr-0007]: https://github.com/aloong-planet/justsnap/blob/main/docs/adr/0007-direct-distribution-only-for-v1.md
[js-release-mirror]: https://github.com/aloong-planet/justsnap/blob/main/docs/specs/release-mirror.md
