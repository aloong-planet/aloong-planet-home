## Question
Does the Blog page work as the full list of published posts, shown as a lead post above a two-column grid, each post with its cover? Is it clearly different from the homepage's text list, and does each card open its post?

## Structure basis
- The page keeps the heading, introduction, and the link back to the homepage. The top navigation follows the shared header.
- The page header is one line of small text, with the posts directly below it. The heading 「Blog」 is set like a label: 12px, capitals, 2px letter spacing. The introduction follows on the same baseline in 12px muted text, both sentences kept. On narrow windows the introduction wraps under the heading. The header starts 48px below the navigation (32px on phones) and leaves 40px before the list.
- The user chose the list layout from four kinds seen on popular blogs: card grid, lead plus grid, list with thumbnails, and large rows. The choice was a lead plus a two-column grid.
  - The newest post leads across the full content width, with its text on the left and its cover on the right. The text takes one third of the width and the cover two thirds, with 40px between them, and the text is centered against the cover. The text is the date, a 26px title, and the summary at 14px. The newest is decided by publish date; posts with the same date follow their listing order.
  - The other posts follow two to a row. Each is a card with its cover on top, then the date, a 20px title, and the summary at 13px.
  - Titles and summaries show in full. Cards in a row align at the top, and their heights follow their text. A post left over sits alone in the left column.
  - On windows 700px and narrower, everything stacks in one column with the lead first. The lead then shows its cover above its text, like the other cards, with a 22px title and a 13px summary.
- The user chose the WeChat article covers as the post images.
  - Every cover shows at 2.35:1, the shape of a WeChat cover. A thin border and rounded corners keep the edge of a white cover visible on the page.
  - The covers are decorative, because the title beside each names the post.
  - 《Super-agent 架构图解》 has no WeChat cover, so the user chose its architecture map. The map is shown whole, centered on white in the same 2.35:1 frame.
- The whole card is one link that opens the post.
  - Hovering underlines the title and lifts the cover 4px, the same lift as the app images on the homepage. With reduced motion, the cover does not move.
  - Keyboard focus draws the site's focus ring around the whole card.
- Per the project capabilities, i18n and theming are disabled; both are skipped. The page has no icons.

## Demo scaffolding
The demo bar is not part of the design; do not implement it.
- "Published posts": 1 shows the lead alone, 2 shows the lead with one card alone in its row, and 7 shows every published post.
- "Newest post": Short title leads with 《Super-agent 架构图解》. Long title leads with the post that has the longest title, to show the lead's text running taller than its cover.

Every entry opens the same post prototype.

## Uncovered dimensions
Only the fixed light appearance and the single existing language are covered. The covers here are reduced copies; how the site serves them at different screen densities is not shown. The prototype gallery is review infrastructure, not part of the design.
