# Apps and Agents menus

## Problem Statement
A visitor who wants to try one of Aloong's apps, skills or plugins should be able to reach it from any page of the site, not only from the homepage section that lists it.

## Solution
The top navigation stays at the top of the window while the page scrolls. It has two tabs, Apps and Agents. Resting the pointer on either opens a menu that lists each work with a short pitch, and choosing one opens it straight away. The homepage has an Agents section that lists the skills and plugins, and its Apps section shows all three apps.

## User Stories

### nav-menus::US-001 Pick a work from the top navigation

As a visitor on any page of the site, I rest the pointer on Apps or Agents and choose a work from the menu that opens, so I reach it without scrolling the homepage first.

- nav-menus::US-001/AC-01: On a device whose pointer can hover and whose window is wider than 700px, resting the pointer on the Apps or Agents tab, or giving the tab keyboard focus, opens that tab's menu under it. The tab is drawn in ink while its menu is open.
- nav-menus::US-001/AC-02: The menu stays open while the pointer moves from the tab down into the menu and while it rests on the menu. It closes once the pointer has left both the tab and the menu and keyboard focus is in neither.
- nav-menus::US-001/AC-03: The Apps menu lists the apps of nav-menus::REQ-002 in order, each as its name with its description below. Choosing an item opens that app's website in the current tab.
- nav-menus::US-001/AC-04: The Agents menu shows the heading 「Skills」 over its skills, then a divider and the heading 「Plugins」 over its plugins, with the works and order of nav-menus::REQ-002. Choosing an item opens its GitHub repository in a new tab.
- nav-menus::US-001/AC-05: Each menu is a card in the site's card colour, 400px wide, with a 1px border in the site's line colour, 8px corners and a soft shadow, its left edge 20px left of the tab's and its top 20px below the tab. Each item is one link covering the name and description, with 10px by 12px padding: the name is 14px in ink, the description 12px in the muted grey, at most two lines. Hovering an item gives it the site's tag colour as its ground. Group headings are 10px capitals with wide letter spacing in the muted grey.
- nav-menus::US-001/AC-06: With keyboard focus on a tab, Tab moves through that menu's items in order, each showing its focus ring inside its own box; Tab past the last item moves on to the next tab and the menu closes.
- nav-menus::US-001/AC-07: Escape hides an open menu, whether the pointer or keyboard focus opened it. When focus was on one of its items, focus returns to the tab. The menu stays hidden until the pointer and focus have both left the tab and the menu; coming back opens it again.
- nav-menus::US-001/AC-08: Following the tab's own link hides its menu under the same rule as Escape.
- nav-menus::US-001/AC-09: On a device whose pointer cannot hover, or in a window 700px wide or narrower, no menu opens; the tab is the link to its homepage section (nav-menus::REQ-001).
- nav-menus::US-001/AC-10: The homepage, the Blog page, every post page and the not-found page show the same menus.

### nav-menus::US-002 Browse the skills and plugins on the homepage

As a visitor following Agents, I land on a homepage section listing the skills and plugins with what each does, so I can choose one to open.

- nav-menus::US-002/AC-01: The homepage has an Agents section after Apps and before the footer. Its heading 「Agents.」 has the same size, weight and colour as the Apps heading.
- nav-menus::US-002/AC-02: Under the heading, two lists sit side by side on the Apps grid's two columns: 「Skills」 on the left and 「Plugins」 on the right, each with the works, order and descriptions of nav-menus::REQ-002. The list headings are 12px capitals, weight 600, with 2px letter spacing.
- nav-menus::US-002/AC-03: Each entry has a 1px divider above it and 16px of space above and below: the name in 18px, weight 500, and the description in 12px muted grey below it. The whole entry opens its GitHub repository in a new tab, and hovering it underlines the name.
- nav-menus::US-002/AC-04: In a window 700px wide or narrower, the two lists stack, Skills above Plugins, at the full content width.
- nav-menus::US-002/AC-05: Following Agents lands on the section with its heading clear of the navigation bar, in a wide window and in a window 700px wide or narrower. On the homepage the page scrolls there smoothly, as it does for Apps and About.

### nav-menus::US-003 See every app on the homepage

As a visitor on the homepage, I see each of Aloong's apps with what makes it worth trying, so I can open its website.

- nav-menus::US-003/AC-01: The Apps section shows three cards in this order: Transfer, Agentshed, and JustSnap under the name of nav-menus::REQ-002. The JustSnap card has the same form as the others: a screenshot area, the name, two lines of text and the link 「访问随译官网」 on the Chinese homepage or "Visit the JustSnap website" on the English homepage. The screenshot and the link each open the app's website in a new tab, at the address of nav-menus::REQ-002.
- nav-menus::US-003/AC-02: The JustSnap screenshot is JustSnap's translation view: a selected passage of English with its Chinese translation in the result box beside it. It is shown whole within the screenshot area, on the grey `#868892` in both appearances. Its alternative text is 「随译截图翻译：框选一段英文，右侧结果框显示中文译文」 on the Chinese homepage and "JustSnap screenshot translation: a selected passage of English, with its Chinese translation in the result box beside it" on the English homepage.
- nav-menus::US-003/AC-03: The cards' text reads as follows, each line break as shown; on the English homepage a line longer than its card wraps within it:

| Card | Chinese homepage | English homepage |
|---|---|---|
| Transfer | Mac 和 Windows 之间传文件，像聊天一样随手一发就到，<br>同一个 Wi-Fi 下打开即连，数据只在局域网里走。 | Send files between Mac and Windows as easily as sending a chat message;<br>on the same Wi-Fi it connects as soon as it opens, and your data stays on the local network. |
| Agentshed | Claude Code、Codex 等 agent 装了什么、烧了多少 token，<br>打开 Agentshed 一眼看清，旧会话按提问一跳直达。 | See what Claude Code, Codex and other agents have installed and how many tokens they burn<br>at a glance in Agentshed, and jump straight to an old session by what you asked in it. |
| JustSnap | 全网响应最快的截图工具，按下快捷键瞬间进入选区，<br>框住的文字或对照译文边生成边出现。 | The fastest screenshot tool around: press the shortcut and start selecting at once,<br>and the framed text or its side-by-side translation appears as it is generated. |

### nav-menus::US-004 Reach the navigation from anywhere on a page

As a visitor far down a long page, I find the top navigation still at the top of the window, so I can move on to another part of the site without scrolling back up.

- nav-menus::US-004/AC-01: On every page and at every window width, the top navigation stays at the top edge of the window while the page scrolls, and the page's content passes beneath it. Its tabs and menus work as they do at the top of the page.
- nav-menus::US-004/AC-02: At the top of a page, the top navigation covers none of the page's content, which starts below it.
- nav-menus::US-004/AC-03: Moving keyboard focus to an element on the page scrolls the page so that the element shows below the top navigation, not under it, as far as it fits in the window below the navigation.

## Functional Requirements

### nav-menus::REQ-001 Navigation tabs (direct acceptance)

The top navigation reads Apps · Agents · Blog · About. Apps leads to the homepage's Apps section (`#apps`), Agents to its Agents section (`#agents`), Blog to the Blog page and About to the homepage's footer (`#about`), each in the page's language (site-languages::REQ-005).

### nav-menus::REQ-002 The works and their descriptions (direct acceptance)

The menus and the Agents section list these works, in this order. On Chinese pages and post pages JustSnap is named 随译; on English pages it is named JustSnap. A work opens the address for the page's language.

| Group | Name | Opens from Chinese pages and post pages | Opens from English pages |
|---|---|---|---|
| Apps | Transfer | `https://transfer.aloongplanet.com/` | `https://transfer.aloongplanet.com/en` |
| Apps | Agentshed | `https://agentshed.aloongplanet.com/zh/` | `https://agentshed.aloongplanet.com/` |
| Apps | JustSnap | `https://justsnap.aloongplanet.com/` | `https://justsnap.aloongplanet.com/en/` |
| Skills | skillshed | `https://github.com/aloong-planet/skillshed` | `https://github.com/aloong-planet/skillshed` |
| Skills | media-studio | `https://github.com/aloong-planet/media-studio` | `https://github.com/aloong-planet/media-studio` |
| Plugins | cc-session-pool | `https://github.com/aloong-planet/claudecode-session-dispatcher` | `https://github.com/aloong-planet/claudecode-session-dispatcher` |

> Pending: Agentshed opens `https://agentshed.aloongplanet.com/zh/` from Chinese pages and post pages.

Each work's description:

| Name | On Chinese pages and post pages | On English pages |
|---|---|---|
| Transfer | Mac 和 Windows 之间传文件，像聊天一样随手一发就到。同一个 Wi-Fi 下打开即连，多大的文件都能传，数据只在局域网里走。 | Send files between Mac and Windows as easily as a chat message. On the same Wi-Fi it connects as soon as it opens, takes files of any size, and your data never leaves the local network. |
| Agentshed | Claude Code、Codex 等 agent 装了什么、烧了多少 token，打开 Agentshed 一眼看清，旧会话按提问一跳直达。 | See at a glance what Claude Code, Codex and other agents have installed and how many tokens they burn, and jump straight to an old session by what you asked in it. |
| JustSnap | 全网响应最快的截图工具，按下快捷键瞬间进入选区。框住哪里，你选的视觉模型就直接读图，文字或对照译文边生成边出现。 | The fastest screenshot tool around: press the shortcut and start selecting at once. Whatever you frame, the vision model you chose reads the image directly, and the text or a side-by-side translation appears as it is generated. |
| skillshed | 让 coding agent 像靠谱的资深工程师一样干活。先问清需求、写好 spec，再测试先行地实现，交来的 PR 已经过独立审查。 | Makes your coding agent work like a dependable senior engineer: it pins down the requirements and writes the spec, then implements test-first, and the PR it hands over has already had an independent review. |
| media-studio | 把一篇文章变成一支讲解视频，配音用的是你自己的声音，在本机生成，字幕和各平台封面也一并做好。 | Turns an article into an explainer video narrated in your own voice, generated on your own machine, with subtitles and a cover for each platform made along the way. |
| cc-session-pool | 让 Claude Code 连轴转。会话自己压缩上下文、醒来接着干，不用你守着；一个调度会话还能指挥一池 worker 同时开工。 | Keeps Claude Code working around the clock. Sessions compact their own context and wake up to carry on, without you watching over them; one dispatcher session can also run a whole pool of workers at once. |

### nav-menus::REQ-003 Navigation name (direct acceptance)

The top navigation's accessible name is 「主要」 on Chinese pages and post pages, and "Main" on English pages.

### nav-menus::REQ-004 GitHub link (direct acceptance)

Every page that shows the top navigation also shows a link 「GitHub」 at the right end of its header, just before the language switch of site-languages::REQ-003. It opens `https://github.com/aloong-planet` in a new tab.

## Constraints

### nav-menus::CON-001 Sections without scripting (direct acceptance)

Applies to: the homepage's Apps and Agents sections. Their cards and lists are part of the delivered page and show in full with scripting unavailable.

## Failure modes and boundaries
- One menu open by keyboard focus while the pointer rests on the other tab: only the menu under the pointer shows. The focused one returns when the pointer leaves, if focus is still on it.
- A window 701px wide: the Agents card, the rightmost, ends inside the window.
- A window narrowed to 700px or below while a menu is open: the menu disappears (nav-menus::US-001/AC-09).
- Scripting unavailable: the top navigation, and with it both menus, does not appear, as on every page.

## Out of Scope
- Menus on touch screens and narrow windows: there is no hover to open them, and the tab already leads to the section that lists the same works.
- Icons or screenshots in the menus: each item is a name and a description only.
- A copy of these menus on the app websites: each app website's header, including any link back to the homepage, belongs to that website's own spec: Agentshed's is [Agentshed's site](agentshed-site.md) in this repository, and the other app websites' specs are in their own repositories.
- openclaw-memory-core-plus and xnote-extension: they are not listed.
