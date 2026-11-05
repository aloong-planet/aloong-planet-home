# Publishing a post

A post is an entry in `content/posts.json` plus an HTML body in `content/posts/`. The build does the rest: the post page, its table of contents, the Blog row, and the homepage entry. Merging to main deploys it. Posts stay HTML only, so figures and interaction need no extra tooling.

## Steps

1. Add an entry to `content/posts.json`. The order only matters between posts with the same date.

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

2. Write `content/posts/<slug>.html`. It holds only the article content, without a page shell or an `h1`, which the template provides.

   - Each `<section id="…"><h2>…</h2>…</section>` becomes a contents entry. The label is the heading up to its first `：`; set `data-toc="短标题"` on the section to replace it.
   - A `footer` joins the contents only with both an `id` and `data-toc`.

3. Run `pnpm build`, then `pnpm dev`, and read the post at http://127.0.0.1:8793/blog/<slug>.

## What a post gets without any styles of its own

Page layout, type sizes, contents, immediate section jumps, new-tab external links, and these elements: `h2`, `h3`, `p`, `a`, `code`, `table`, `.lead` (the opening sentence), `.note`, `ul.plain`, `figure.fig` with `figcaption`, `.scroll` (sideways scrolling for wide content), `.ground` (a figure's panel), `.mid` and `.wide` (table minimum widths), `.num`, `.src`, and `.foot` (the sources block). These live in `public/article.css`, so changing that file changes every post.

## A post's own figures

Figures only one post uses may have `content/posts/<slug>.css` and `content/posts/<slug>.js`, which load on that post's page alone.

The build refuses a stylesheet that would break the shared look. Every selector starts with `.post-<slug>`, and:

- `.post-<slug>` itself may only set custom properties, and none may redefine a token from `public/site.css` or `public/article.css`.
- A selector must target something of the post's own, such as `.post-<slug> .my-figure p`, not a base element like `.post-<slug> p`.
- Fonts use `var(--sans)` or `var(--mono)`. No `@import`, `@font-face`, or remote `url()`.
- No dark appearance: no `prefers-color-scheme` or `data-theme`.

The body may not contain `style` or `script` elements or a whole page's shell. A complete page exported from elsewhere must be split into these parts first. Requirements and boundaries are in the [blog spec](../specs/blog.md).
