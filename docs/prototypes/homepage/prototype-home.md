## Question
Do recent blog posts work as a text list in the left third of the homepage's first screen, beside the seated portrait and interactive golden retriever?

Do the Apps and Agents menus in the top navigation, the 随译 (JustSnap) card and the Agents section work on the homepage? Are the one-line descriptions in the menus right?

## Structure basis
The user specified the supplied transparent blue-shirt portrait, a right-side portrait and dog group, and the first screen's empty area left of that group for recent blog entries, then chose a text list for those entries and asked for whitespace on both sides of it. The list is up to 440px wide, centered between the window's left edge and the dog, and centered vertically in the visible part of the first screen below the navigation. It shows the newest 4 posts. Each entry shows the date, a title of up to two lines, and a summary of up to two lines; the whole entry opens the post and hovering underlines the title. "全部文章" under the list opens the Blog page. The list has no visible title; the dates, titles, and that link identify it.

The dog sits close beside the portrait, and the group is biased toward the right edge. The introductory text and the site-wide visitor total sit beneath the group. The existing light homepage and Apps grid provide the surrounding context. The Apps heading is 「Apps.」 in ink, left-aligned with the app cards: 32 to 48px with 40px below it, or 34px with 28px below on windows 700px wide or narrower. It follows the homepage's other large headings, and the user chose this form from three drawn side by side. On narrow screens the group stays centered at full width and the list follows it, above Apps.

The navigation reads Apps · Agents · Blog · About, as the user chose. Apps and Agents each open a dropdown card hanging from the tab, the structure the user chose over a full-width panel and a list with screenshot preview. Each item is a name with a one-line description, without icons, as the user chose; the description pitches what a visitor gets and the work's strongest point in connected sentences, and takes at most two lines of the card. The Agents card has Skills and Plugins groups. A menu opens while a pointer that can hover rests on its tab, or while the tab or an item has keyboard focus; Escape or clicking the tab hides it until the pointer and focus have left. While the pointer rests on one tab, a menu that keyboard focus holds open on the other hides, so only one card shows. Touch devices and windows 700px wide or narrower show no menu: the tab is the same link to its homepage section as before. App items open the app's website in the same tab; Agents items open the GitHub repository in a new tab.

The Apps grid gains a JustSnap card in the existing card form, using a translation screenshot from JustSnap's own website. On this Chinese-only homepage the app is named 随译, in its card and in the Apps menu, as the user chose (Chinese uses 随译, English uses JustSnap). The Agents section follows Apps, before the footer: the heading 「Agents.」 over two text lists, Skills and Plugins, in the recent-post list's type and dividers, as the user chose over a grid of text cards. Each entry opens its GitHub repository in a new tab. Narrow windows stack the two lists.

The supplied PNG is copied without image edits as the shared portrait asset. Its source attachment is `codex-clipboard-abe933ed-e006-47cc-8157-7c1c8b0f3601.png`.

Per the project capabilities, i18n and theming are disabled; their dictionary and theme-anchor checks are skipped. The page uses text navigation and no icon module.

## Demo scaffolding
The "Published posts", "Text length" and "Menu" switches are not part of the design; do not implement them. "Menu" holds one menu open for review; in the site, hover and keyboard focus open it. Only the first entry is a real post; the others are mock entries that all open the same post prototype, including one with an over-long title and summary. The prototype gallery is review infrastructure too. The visitor total 1,024 is illustrative and makes no network request or registration.

## Uncovered dimensions
Only the fixed light appearance and the existing single language are covered. The app screenshots link to their existing websites. Loading and failure of the live visitor counter are outside this visual preview.
