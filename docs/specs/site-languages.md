# Site languages

> Related: [homepage](homepage.md) · [blog](blog.md) · [not-found page](not-found.md) · [Apps and Agents menus](nav-menus.md) · [visitor total](visitor-counter.md) · [homepage dog](homepage-dog.md) · [site appearance](site-appearance.md)

## Problem Statement
A visitor who reads English but not Chinese cannot use the site: its homepage, Blog page, menus and not-found page are written in Chinese only, while each app site it links to also has an English version.

## Solution
The homepage, the Blog page and the not-found page each have a Chinese and an English version at their own addresses. A switch at the right end of the top navigation moves between them, and the address alone decides the language. Posts stay in Chinese, and the English lists say so.

## Functional Requirements

### site-languages::REQ-001 Pages in each language

The site's languages are Chinese (`zh-CN`) and English (`en`). The homepage, the Blog page and the not-found page each have a version in each language; post pages have a Chinese version only. Wherever a spec of this site names one of these pages, it means both its versions unless it names a language.

| Page | Chinese version | English version |
|---|---|---|
| Homepage | `/` | `/en/` |
| Blog page | `/blog` | `/en/blog` |
| Not-found page | any address the site does not have outside `/en/` | any address the site does not have under `/en/` |
| Post page | `/blog/<slug>` | none |

- site-languages::REQ-001/AC-01: Each page declares its language as its document language: `zh-CN` on Chinese pages and post pages, `en` on English pages.
- site-languages::REQ-001/AC-02: An English version has the same sections, layout, links, images and behaviour as its Chinese version, with its text, text alternatives included, in English, except where a spec of this site sets something else for one language.
- site-languages::REQ-001/AC-03: `/en` redirects to `/en/`, and `/en/blog/` and `/en/blog.html` redirect to `/en/blog`.
- site-languages::REQ-001/AC-04: An address under `/en/` that the site does not have, `/en/blog/<slug>` for any post included, answers with status 404 and the English not-found page (not-found::REQ-001).

### site-languages::REQ-002 The address decides the language (direct acceptance)

A page shows the language its address names, whatever the browser's language or the visitor's earlier visits. No page redirects by language, and the site stores nothing about a visitor's language.

### site-languages::REQ-003 Language switch

- site-languages::REQ-003/AC-01: Every page that shows the top navigation shows a language switch as the last item at the right end of its header. It reads 中文 and EN, in that order.
- site-languages::REQ-003/AC-02: The page's own language is plain text, marked as the current language for assistive technology. The other language is a link, which declares its own text's language and the language of the page it opens.
- site-languages::REQ-003/AC-03: The link opens the other language's version of the same page: `/` and `/en/` lead to each other, and so do `/blog` and `/en/blog`. On a post page, EN opens `/en/blog`. On a not-found page, the link opens the other language's homepage.
- site-languages::REQ-003/AC-04: The switch is named 「语言」 on Chinese pages and post pages, and "Language" on English pages. The EN link is named "English".
- site-languages::REQ-003/AC-05: The switch shows in the header at every window width.

### site-languages::REQ-004 Other-language versions named in the page (direct acceptance)

Each page that has a version in the other language names that version, and itself, as language alternates in its delivered markup, with their languages, so they are named with scripting unavailable too. A post page names no alternate.

### site-languages::REQ-005 Links stay in the page's language (direct acceptance)

Every link from an English page to the homepage, a section of it, or the Blog page opens its English version, and every such link from a Chinese page or a post page opens its Chinese version: the site's name in the header, the navigation tabs, the homepage list's link to all posts, and the not-found page's buttons. A link to a post opens its only page. Links to the app sites follow nav-menus::REQ-002.

## Failure modes and boundaries

- Scripting unavailable: no language switch shows, and every page still names its other-language version (site-languages::REQ-004).

## Out of Scope

- English versions of posts: the posts are Aloong's own articles, republished word for word, so a translation would be new writing rather than the same post.
- Languages other than Chinese and English.
- Making the app sites' interfaces match this site's: [app-sites](app-sites.md) keeps that out of its scope until every site has moved.
