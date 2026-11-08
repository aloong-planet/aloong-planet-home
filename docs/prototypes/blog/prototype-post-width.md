## Question
With one width for the whole article, does a long post read evenly: text, lists, captions, tables, figures and code all 820px wide, tables filling it, and figures scaled to fill it? Does opening a figure in a larger view work, both on a wide window and on a phone? Does the end of the post lead on well, with the previous post and the next post? And does one rule hold for every figure, the Super-agent post's wide, composed and interactive ones included: each fills its width in the page, and its detail is read in the larger view?

## Structure basis
- The page is the post page of the confirmed post prototype (`prototype-post.html`): the top navigation, title block, contents and article column. On top of that, it changes the widths, the type and color, the figures' larger view, and the end of the post.
- The user chose the width scheme: one 820px measure for everything in the article column. Tables and figures always fill it.
- Every figure fills its width at every window size and keeps its proportions, phones included: no drawing keeps a minimum width of its own, and no figure scrolls sideways in the page. No figure is drawn or placed specially; its detail is read in the larger view.
- A figure sits straight on the page, with no ground or frame of the article's around it. A drawing's own frame, drawn inside it, stays.
- On windows 1280px and wider, the contents sit left of the article. An empty track the contents' width sits to its right, which centers the measure in the window. It is the first to give way as the window narrows. Narrower windows keep the contents as a block under the title, inside the same measure.
- The user asked for the larger view, with no visible buttons: a reader clicks a figure to enlarge it and clicks again to close it, as in common image viewers. Its details are this page's defaults.
  - Every figure opens larger. Clicking or tapping a figure's drawing area (the drawing, or its block of drawings) opens the figure with its caption on a white sheet. Over the drawing area the pointer is a zoom-in cursor; nothing else marks it. A see-through gray layer covers the rest of the window: the page still shows beneath it, and the white sheet stands clear of it.
  - The view shows the figure as it looks at that moment: a figure with a step-by-step playback shows the step it is on. Its controls and links do not work in the view.
  - The figure is as large as the window allows, up to twice its width in the page.
  - It is never narrower than 800px, or than 85% of its widest drawing's drawn width if that is more. On a phone the sheet therefore scrolls sideways at a legible size, and the caption stays in view. A tall figure scrolls up and down inside the view.
  - A click or tap anywhere in the view closes it, on the sheet as well as on the gray layer, since a figure can fill a phone's screen and leave no gray to tap. Scrolling the view does not close it. Over the whole view the pointer is a zoom-out cursor. Esc closes it too. There is no close button.
  - For the keyboard and screen readers, each figure has a larger-view button named 查看大图, with the Lucide Maximize 2 icon (two arrows pointing out). It is a 32px square with a 16px icon at the figure's top-right corner, shown only while it has keyboard focus; a pointer or a touch never meets it. A view opened from it returns focus to it on closing.
  - Without scripting, figures are shown as before, with no larger view.
  - A figure's own controls, such as the Super-agent map's view switch and playback buttons, sit outside its drawing area, so a click on them still reaches them.
- Type and color:
  - Body text is 15px with 1.75 line height, in a slightly softer ink than headings. Paragraphs sit 12px apart. Figures, tables, code and quotes get 8px more on each side. Sections sit 48px apart.
  - The title is 24 to 30px. Section headings are 18 to 20px, each with a short green bar on its left. Third-level headings are 16px, in deep green. The lead is 16px.
  - A heading too long for one line fills its first line before wrapping, and only avoids a very short last line. Lines are not evened out, since evening them puts the break near the middle of the heading whatever the words are.
  - Tables are 13.5px, captions 13px, code blocks 12.5px.
  - Green is the accent of article pages only; the rest of the site keeps its own colors. It marks section headings, links, the current contents entry, table heads, list markers, quotes and focus rings. The lead sits in a green-washed block with a green left edge.
  - Inline code and code blocks sit on a light neutral ground.
  - The text greens are #1f7a4d (5.1:1 on the page) and #155c39 (7.7:1 on the page and 7.3:1 on the green wash).
- The end of the post has two equal cards in one row: 上一篇 and 下一篇, as in the prev/next footers of common blog and documentation themes.
  - 上一篇 is the post published just before this one, and 下一篇 the one just after, by publish date. Posts with the same date follow their order in the Blog list.
  - Each side shows its direction and the post's title. A title wraps to two lines and ends in an ellipsis beyond that.
  - A side with no post keeps its place as a dashed, unclickable card that reads 已是最早的一篇 or 已是最新的一篇, so each card sits on the same side in every post.
  - The Blog list is reached from the top navigation; the post itself has no link back to it.
  - On windows 560px and narrower, the two stack at full width, previous first.
- The article content is mock content, switched from the demo bar.
  - The idle-compaction post has every kind of block: lead, lists, three-column tables, charts, a timeline diagram and code.
  - The Super-agent post, whole, with its own script running: figures drawn 1200 wide, an architecture map with a step-by-step playback, grids of small diagrams, and charts that show values on hover. Its line saying a figure scrolls sideways is gone, since none does.

## Demo scaffolding
The bar at the bottom is not part of the design; do not implement it.
- Article: Idle compaction or Super-agent. In the app each post is its own page.
- Neighbors: Both, Earliest post (no 上一篇) or Newest post (no 下一篇). Switching the article sets the post's own state: Both for idle compaction, Newest post for Super-agent. Under Both, Super-agent's 下一篇 borrows a real title only to show the layout.
- Titles: As published, or Over two lines. The long titles are made up, to show the ellipsis.

## Uncovered dimensions
Only the fixed light appearance and the single existing language are covered. The green accent is drawn on the article only; the top navigation and the other pages keep the site's current colors. Other posts are not drawn.
