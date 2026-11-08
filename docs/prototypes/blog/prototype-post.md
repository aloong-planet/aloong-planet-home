## Question
How should a long, figure-heavy blog post read inside the site: does the article keep its figures legible and its interactions working once it uses the site's look, with a fixed table of contents beside it?

## Structure basis
The user chose the site's look over the article's own design, a left fixed table of contents, and a byline naming Aloong with the source article being explained. The header and top navigation follow the existing homepage prototype. The article text, figures, and interactions are generated from the source article, not retyped. Only the head block changes: it carries the new byline and one line saying that "文章" and "作者" in the text refer to the source article.

Hue that carries meaning in the figures (node roles, signal paths, subscribed topics, status) stays as published; neutral surfaces, text, and fonts use the site's. Web fonts are not loaded.

The article and its figures are at most 1000px wide; on wide windows that leaves whitespace to the right of the article. Body text is 15.5px. On wide windows the contents sit beside the article and follow scrolling, marking the current section. On narrower windows they become a two-column block under the title, so the figures keep their full width. Links to a section land on it immediately, without a scroll animation.

Per the project capabilities, i18n and theming are disabled; both are skipped, and the article's dark appearance is not drawn. The status labels in the prototype comparison table carry drawn marks in the four shapes the article used; the page has no other icons.

## Uncovered dimensions
Only the fixed light appearance and the single existing language are covered. Links to external sources are real and leave the prototype.

## Invalidated conclusions
- The widths on this page no longer hold: the article and figures at most 1000px wide, text at 46em, lists at 50em, captions at 60em, and the lead at 32em. One 820px measure for everything in the article column replaces them; `prototype-post-width.html` shows it.
- The figures on this page were drawn for the 1000px width and have not been checked at 820px.
