# Publishing a post

A post is an entry in `apps/home/content/posts.json` plus an HTML body and a cover in `apps/home/content/posts/`. The build does the rest: the post page, its table of contents, the Blog card, and the homepage entry. Merging to main deploys it. Posts stay HTML only, so figures and interaction need no extra tooling.

## Steps

1. Add an entry to `apps/home/content/posts.json`. The order only matters between posts with the same date.

   ```json
   {
     "slug": "lowercase-words-joined-by-hyphens",
     "title": "标题",
     "date": "2026-11-05",
     "summary": "一两句话，首页最多显示两行。",
     "source": {"label": "被解读的文章", "url": "https://example.com/article"},
     "note": "标题下方的一句说明。"
   }
   ```

   `source` and `note` are optional. With `source`, the byline adds "解读" and a link to it.

2. Write `apps/home/content/posts/<slug>.html`. It holds only the article content, without a page shell or an `h1`, which the template provides.

   - Each `<section id="…"><h2>…</h2>…</section>` becomes a contents entry. The label is the heading up to its first `：`; set `data-toc="短标题"` on the section to replace it.
   - A `footer` joins the contents only with both an `id` and `data-toc`.

3. Add the cover as `apps/home/content/posts/<slug>.webp`. Make it 2.35:1, the shape of a WeChat cover, and reduce it to about 1200×511 first: the build copies it unchanged. A post republished from WeChat uses that article's cover. A cover of another shape is cropped from the center to fill its frame. The build refuses a post without a cover.

4. In `apps/home/`, run `pnpm build`, then `pnpm dev`, and read the post at http://127.0.0.1:8793/blog/<slug> and its card at http://127.0.0.1:8793/blog.

## What a post gets without any styles of its own

Page layout, type sizes, contents, immediate section jumps, new-tab external links, and these elements: `h2`, `h3`, `p`, `a`, `code`, `table`, `.lead` (the opening sentence), `.note`, `ul.plain`, `ol`, `.quote`, `.codeblock`, `figure.fig` with `figcaption`, `.scroll` (sideways scrolling for a wide table), `.ground` (marks a figure's drawing area, which has no panel or frame around it; in the dark appearance a `.ground` that holds a drawing sits on a light sheet, and one that holds only an image is left as it is), `.mid` and `.wide` (table minimum widths), `.num`, `.src`, and `.foot` (the sources block). These live in `apps/home/public/article.css`, so changing that file changes every post. Every figure fills the article's 820px width at every window size and opens in a larger view from `apps/home/public/article.js`; a minimum width set on a drawing is overridden, so draw figures to be read whole at that width and in detail in the larger view. The end of each post links to the posts published just before and after it, written by the build.

## A post's own figures

Figures only one post uses may have `apps/home/content/posts/<slug>.css` and `apps/home/content/posts/<slug>.js`, which load on that post's page alone. Draw icons and status marks in the stylesheet or as SVG; do not type symbols as icons.

The build refuses a stylesheet that would break the shared look. Every selector starts with `.post-<slug>`, and:

- `.post-<slug>` itself may only set custom properties, and none may redefine a token from `apps/home/public/site.css` or `apps/home/public/article.css`.
- A selector must target something of the post's own, such as `.post-<slug> .my-figure p`, not a base element like `.post-<slug> p`. Write selectors out: no `:is()`, `:where()`, or nested rules.
- At-rules are limited to `@media`, `@supports`, `@container`, and `@keyframes`.
- Fonts use one of `var(--sans)` or `var(--mono)`, with no other family beside it. No `@import`, `@font-face`, or remote files.
- Dark values: a post may give its own custom properties values for the dark appearance, in `@media (prefers-color-scheme: dark)` blocks at the top level of the stylesheet, not inside another at-rule. Each block holds rules on `.post-<slug>` itself that set only custom properties, none a shared token. Give dark values to the colours the post uses outside its diagrams, such as the text colour of a status mark; a colour drawn inside a diagram keeps its light value, because a diagram sits on a light sheet in the dark appearance. No other `prefers-color-scheme` condition, and no `color-scheme`, `light-dark()`, or `data-theme`.

A colour written in the body itself, in a `style` or SVG attribute, has no dark value, so write colours there only inside a diagram; text outside a diagram takes the shared tokens.

The body may not contain `style` or `script` elements or a whole page's shell. A complete page exported from elsewhere must be split into these parts first. Requirements and boundaries are in the [blog spec](../specs/blog.md).

## Publishing a local Markdown manuscript

Generate the blog body from the reviewed local Markdown and its sibling assets in the Content Studio repository (`zhoulf1006/content-studio`). Each is `manuscripts/<slug>/source.md`, with its images in `assets/images/` and any data behind them elsewhere under `assets/`. Change nothing there.

- **Slug**: the manuscript's folder name.
- **Manifest entry**: `title` is the front matter's `title`, and `summary` is its `digest`. Leave out `source`: the byline would call the author's own article a reading of another.
- **Date**: the day, in Beijing time, of `synced_at` in `publishers/wechat/productions/<slug>/receipt.yaml`, which records when the draft was last saved to WeChat; receipts so far leave `published_at` empty. Set the date once, when the post is added, and keep it if the draft is saved again later.
- **Text**: keep every paragraph, list, table, code block, quote and link word for word, punctuation included. Leave out only the front matter, the `# title` line, and lines meant only for WeChat, such as follow prompts.
  - The text before the first `##` goes in a `<section>` with no id, so it stays out of the contents.
  - Each `##` becomes a section. `###` becomes `h3`, `**x**` becomes `<b>x</b>`, a bullet list `ul.plain`, a numbered list `ol`, a code block `<pre class="codeblock"><code>`, and a quote `<blockquote class="quote"><p>`.
  - The title of another article already on the site links to its `/blog/<slug>` address.
- **Figures**: resolve each Markdown image path relative to the manuscript. Copy its original bytes to `apps/home/public/assets/blog/<slug>/<relative-path>` and use `/assets/blog/<slug>/<relative-path>` as the image URL. Preserve image order and alt text. Put the image inside `<figure class="fig"><div class="ground">…</div><figcaption>…</figcaption></figure>` with its intrinsic width and height. The site build copies this directory into the deployed blog. Keep GIFs animated in both the article and its larger view.
- **Image check**: compare each built image byte-for-byte with its manuscript file. Open animated figures in the built article and in the larger view and confirm that both play.
- **Cover**: the manuscript's `assets/cover.png`, or its `assets/images/cover.png` when that does not exist. It is the article's WeChat cover, not a figure. Reduce it as in step 3, with the settings in the [asset provenance](../assets/README.md).
- **Text check**: before the pull request, compare the text mechanically. Strip the tags from the body and the Markdown from the manuscript, and confirm that every manuscript paragraph appears in the body, in order.
