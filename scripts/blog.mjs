// Turns content/ into the blog: validates every post, writes static post pages, fills the homepage and Blog slots.
import {access, copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const HOME_POSTS = 4;
const ORIGIN = 'https://aloongplanet.com';
const HOME_SLOT = '<!-- blog:home -->';
const LIST_SLOT = '<!-- blog:list -->';
const OWN_SITE = /^(?:https?:)?\/\/(?:www\.)?aloongplanet\.com(?:[/?#]|$)/i;

const escapeHtml = text => text.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const exists = path => access(path).then(() => true, () => false);
const refuse = (slug, problem) => { throw new Error(`Blog post "${slug}": ${problem}`); };
const filled = value => typeof value === 'string' && value.trim() !== '';
/** Reads an attribute from a tag's attribute text, however the author quoted it. */
const attribute = (attrs, name) => {
  const found = new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(attrs);
  return found ? found[1] ?? found[2] ?? found[3] : undefined;
};

function checkManifest(posts) {
  if (!Array.isArray(posts) || posts.length === 0) throw new Error('Blog manifest has no posts; it must list at least one.');
  const seen = new Set();
  for (const post of posts) {
    const slug = post?.slug;
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) refuse(slug, 'slug must be lowercase words joined by hyphens.');
    if (seen.has(slug)) refuse(slug, 'duplicate slug.');
    seen.add(slug);
    for (const field of ['title', 'summary']) if (!filled(post[field])) refuse(slug, `${field} must not be empty.`);
    const date = post.date;
    const real = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
    if (!real) refuse(slug, 'date must be a real YYYY-MM-DD date.');
    if (post.source !== undefined && !(filled(post.source?.label) && /^https?:\/\//i.test(post.source?.url ?? ''))) refuse(slug, 'source needs a label and an http(s) url.');
    if (post.note !== undefined && !filled(post.note)) refuse(slug, 'note must not be empty.');
  }
}

function checkBody(slug, body) {
  const html = body.replace(/<!--[\s\S]*?-->/g, '');
  if (/<!doctype/i.test(html)) refuse(slug, 'the body is a whole page: remove the doctype.');
  const banned = /<(html|head|body|meta|link|style|script|h1)\b/i.exec(html);
  if (banned) refuse(slug, `the body must not contain <${banned[1].toLowerCase()}>; the page template provides it, and styles and scripts go in the post's own files.`);
  if (/<title\b/i.test(html.replace(/<svg\b[\s\S]*?<\/svg>/gi, ''))) refuse(slug, 'the body must not contain <title>; the manifest provides it.');
}

/** Splits CSS into {head, body} rules, keeping nested blocks in body. */
function cssRules(css) {
  const rules = [];
  let at = 0;
  while (at < css.length) {
    const open = css.indexOf('{', at);
    if (open < 0) break;
    let depth = 1, end = open + 1;
    while (depth > 0 && end < css.length) { if (css[end] === '{') depth++; else if (css[end] === '}') depth--; end++; }
    rules.push({head: css.slice(at, open).split(';').at(-1).trim(), body: css.slice(open + 1, end - 1)});
    at = end;
  }
  return rules;
}

const splitSelectors = head => {
  const parts = [];
  let depth = 0, current = '';
  for (const c of head) {
    if (c === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    current += c;
  }
  return [...parts, current].map(part => part.trim());
};

/** Whether a selector names something the post marked itself: a class or id, outside attribute values and pseudo-class arguments. */
function namesOwnMark(selector) {
  let text = selector.replace(/\[[^\]]*\]/g, ''), before;
  do {
    before = text;
    text = text.replace(/\([^()]*\)/g, '');
  } while (text !== before);
  return /[.#][\w-]/.test(text);
}
/** These accept a list, so a class could hide a base element beside it; a post writes its selectors out instead. */
const SELECTOR_LIST_FUNCTION = /:(?:is|where|matches|-\w+-any)\(/i;
const ALLOWED_GROUPING_RULE = /^@(?:media|supports|container)\b/i;
const SHARED_FONT_FAMILY = /^(?:inherit|var\(--(?:sans|mono)\))\s*(?:!important)?$/i;
const FONT_SIZE = String.raw`(?:[\d.]+[a-z%]*|(?:calc|clamp|min|max)\((?:[^()]|\([^()]*\))*\)|xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)(?:\/\S+)?`;
/** In the shorthand the family is what follows the size, so a shared token must come straight after it. */
const SHARED_FONT = new RegExp(String.raw`^(?:inherit|(?:[^,"']*\s)?${FONT_SIZE}\s+var\(--(?:sans|mono)\))\s*(?:!important)?$`, 'i');
const DARK_APPEARANCE = /\(\s*prefers-color-scheme\b|(?:^|[;{\s])color-scheme\s*:|light-dark\(|\[\s*data-theme\b/i;

function checkDeclarations(slug, body, tokens) {
  for (const [, name] of body.matchAll(/(?:^|[;\s])(--[\w-]+)\s*:/g)) if (tokens.has(name)) refuse(slug, `stylesheet redefines the shared token ${name}.`);
  for (const [, property, value] of body.matchAll(/(?:^|[;\s])(font-family|font)\s*:\s*([^;}]+)/gi)) {
    const family = property.toLowerCase() === 'font-family';
    if (!(family ? SHARED_FONT_FAMILY : SHARED_FONT).test(value.trim())) refuse(slug, `${property} "${value.trim()}" must be ${family ? 'one shared font token, var(--sans) or var(--mono),' : 'a size followed by one shared font token, var(--sans) or var(--mono),'} or inherit.`);
  }
}
/** The rest of the compound selector that starts with the post's class: it still targets the post's own element. */
const SAME_ELEMENT = /^(?:[.#][\w-]+|\[[^\]]*\]|:{1,2}[\w-]+(?:\((?:[^()]|\([^()]*\))*\))?)*/;

function checkRules(slug, rules, tokens) {
  const scope = `.post-${slug}`;
  for (const {head, body} of rules) {
    if (/^@keyframes\b/i.test(head)) {
      for (const frame of cssRules(body)) checkDeclarations(slug, frame.body, tokens);
      continue;
    }
    if (head.startsWith('@')) {
      if (!ALLOWED_GROUPING_RULE.test(head)) refuse(slug, `stylesheet must not use the at-rule "${head}"; only @media, @supports, @container and @keyframes are allowed.`);
      checkRules(slug, cssRules(body), tokens);
      continue;
    }
    if (body.includes('{')) refuse(slug, `selector "${head}" nests rules; write each rule out in full.`);
    for (const selector of splitSelectors(head)) {
      if (!selector.startsWith(scope) || /^[\w-]/.test(selector.slice(scope.length))) refuse(slug, `stylesheet selector "${selector}" must be scoped under ${scope}.`);
      if (SELECTOR_LIST_FUNCTION.test(selector)) refuse(slug, `selector "${selector}" must be written out rather than use :is() or :where().`);
      const rest = selector.slice(scope.length);
      const beyond = rest.slice(SAME_ELEMENT.exec(rest)[0].length);
      if (beyond === '') {
        const other = body.split(';').map(part => part.trim()).find(part => part !== '' && !part.startsWith('--'));
        if (other) refuse(slug, `${scope} may only set custom properties, not "${other}".`);
      } else if (/^\s*[+~]/.test(beyond)) refuse(slug, `selector "${selector}" must be scoped inside ${scope}, not beside it.`);
      else if (!namesOwnMark(beyond)) refuse(slug, `selector "${selector}" styles a base element; the shared stylesheet owns those.`);
    }
    checkDeclarations(slug, body, tokens);
  }
}

/** The stylesheet without comments, with each string passed through the given function. A string can hold anything, including braces, so structure is read with strings emptied. */
const withStrings = (source, handle) => source.replace(/\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'/g, match => match.startsWith('/*') ? '' : handle(match));

/** Whether a stylesheet loads a file from another host, through url() or any candidate of image-set(). */
function loadsRemoteFile(css) {
  if (/url\(\s*['"]?(?:https?:)?\/\//i.test(css)) return true;
  const sets = css.matchAll(/image-set\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\)/gi);
  return [...sets].some(([, candidates]) => /["'](?:https?:)?\/\//i.test(candidates.replace(/(["'])data:[\s\S]*?\1/gi, '""')));
}

function checkStylesheet(slug, source, tokens) {
  const css = withStrings(source, () => '""');
  if (/@import\b/i.test(css)) refuse(slug, 'stylesheet must not use @import.');
  if (/@font-face\b/i.test(css)) refuse(slug, 'stylesheet must not declare fonts with @font-face.');
  if (loadsRemoteFile(withStrings(source, text => text))) refuse(slug, 'stylesheet must not load remote files.');
  if (DARK_APPEARANCE.test(css)) refuse(slug, 'stylesheet must not add a dark appearance; the site has one light appearance.');
  checkRules(slug, cssRules(css), tokens);
}

function markExternalLinks(html) {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attrs) => {
    const href = attribute(attrs, 'href') ?? '';
    if (!/^(?:https?:)?\/\//i.test(href) || OWN_SITE.test(href) || /(?:^|\s)target=/i.test(attrs)) return tag;
    return `<a${attrs} target="_blank"${/(?:^|\s)rel=/i.test(attrs) ? '' : ' rel="noreferrer"'}>`;
  });
}

function contentsOf(body) {
  const openings = [...body.matchAll(/<(section|footer)\b([^>]*)>/gi)];
  return openings.flatMap((opening, index) => {
    const id = attribute(opening[2], 'id');
    if (!id) return [];
    const named = attribute(opening[2], 'data-toc');
    if (named) return [{id, label: named}];
    if (opening[1].toLowerCase() !== 'section') return [];
    const inside = body.slice(opening.index + opening[0].length, openings[index + 1]?.index);
    const heading = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(inside)?.[1];
    if (!heading) return [];
    return [{id, label: heading.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split('：')[0]}];
  });
}

const timeTag = date => `<time datetime="${date}">${date}</time>`;

function renderContents(entries) {
  if (entries.length === 0) return '';
  const items = entries.map(({id, label}) => `<li><a href="#${id}">${label}</a></li>`).join('');
  return `<nav class="ap-toc" aria-label="文章目录"><p class="ap-toc-title">目录</p><ol>${items}</ol></nav>`;
}

function renderPost(post, body, {stylesheet, script}) {
  const title = escapeHtml(post.title);
  const source = post.source ? ` · 解读 <a href="${escapeHtml(post.source.url)}">${escapeHtml(post.source.label)}</a>` : '';
  const note = post.note ? `\n    <p class="ap-source-note">${escapeHtml(post.note)}</p>` : '';
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(post.summary)}">
  <title>${title} · Aloong Planet</title>
  <link rel="stylesheet" href="/site.css">
  <link rel="stylesheet" href="/article.css">${stylesheet ? `\n  <link rel="stylesheet" href="/blog/${post.slug}.css">` : ''}
  <link rel="canonical" href="${ORIGIN}/blog/${post.slug}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script src="/navigation.js" defer></script>
  <script src="/article.js" defer></script>${script ? `\n  <script src="/blog/${post.slug}.js" defer></script>` : ''}
</head>
<body class="ap-site">
  <div data-site-navigation></div>
  <main class="ap-article ap-article-page">
    <header class="ap-article-head">
    <h1>${title}</h1>
    ${markExternalLinks(`<p class="ap-byline"><b>Aloong</b> · ${timeTag(post.date)}${source}</p>`)}${note}
    </header>
    ${renderContents(contentsOf(body))}
    <div class="ap-article-col">
      <div class="ap-article-body post-${post.slug}">
${markExternalLinks(body)}
      </div>
      <p class="ap-article-back"><a class="ap-link" href="/blog">全部文章</a></p>
    </div>
  </main>
</body>
</html>
`;
}

const homeEntry = post => `<li><a class="ap-home-post" href="/blog/${post.slug}">${timeTag(post.date)}<h2>${escapeHtml(post.title)}</h2><p>${escapeHtml(post.summary)}</p></a></li>`;
const listEntry = post => `<article class="ap-post"><a class="ap-post-link" href="/blog/${post.slug}"><small>${timeTag(post.date)}</small><div><h2>${escapeHtml(post.title)}</h2><p>${escapeHtml(post.summary)}</p></div></a></article>`;
const renderHome = posts => `<section class="ap-home-blog" aria-label="最新文章"><div class="ap-home-blog-inner"><ol class="ap-home-posts">${posts.slice(0, HOME_POSTS).map(homeEntry).join('')}</ol><a class="ap-link ap-home-blog-all" href="/blog">全部文章</a></div></section>`;

async function fillSlot(path, slot, html) {
  const template = await readFile(path, 'utf8');
  if (!template.includes(slot)) throw new Error(`${path} has no ${slot} slot for the blog.`);
  await writeFile(path, template.replace(slot, () => html));
}

async function sharedTokens(outDir) {
  const sheets = await Promise.all(['site.css', 'article.css'].map(name => readFile(join(outDir, name), 'utf8')));
  return new Set(sheets.flatMap(css => [...css.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1])));
}

export const readManifest = async contentDir => JSON.parse(await readFile(join(contentDir, 'posts.json'), 'utf8'));

/**
 * What each public blog path must serve; deployment checks request these.
 * Each has its own expected text because the host answers an unknown address with the homepage and status 200.
 */
export const blogChecks = posts => [
  {path: '/', contains: 'class="ap-home-blog"'},
  {path: '/article.css', contains: '.ap-article-page'},
  {path: '/article.js', contains: '.ap-toc'},
  ...posts.flatMap(post => [
    {path: '/blog', contains: `class="ap-post-link" href="/blog/${post.slug}"`},
    {path: `/blog/${post.slug}`, contains: `class="ap-article-body post-${post.slug}"`},
  ]),
];

/** Validates content/ and writes the blog into outDir, which already holds the copied public files. */
export async function buildBlog({contentDir, outDir}) {
  const manifest = await readManifest(contentDir);
  checkManifest(manifest);
  const tokens = await sharedTokens(outDir);
  const postsDir = join(contentDir, 'posts');
  const pages = [];
  for (const post of manifest) {
    const bodyPath = join(postsDir, `${post.slug}.html`);
    if (!await exists(bodyPath)) refuse(post.slug, `the body file ${post.slug}.html does not exist.`);
    const body = await readFile(bodyPath, 'utf8');
    checkBody(post.slug, body);
    const stylesheet = await exists(join(postsDir, `${post.slug}.css`));
    const script = await exists(join(postsDir, `${post.slug}.js`));
    if (stylesheet) checkStylesheet(post.slug, await readFile(join(postsDir, `${post.slug}.css`), 'utf8'), tokens);
    pages.push({post, body, stylesheet, script});
  }
  const blogDir = join(outDir, 'blog');
  await mkdir(blogDir, {recursive: true});
  for (const {post, body, stylesheet, script} of pages) {
    await writeFile(join(blogDir, `${post.slug}.html`), renderPost(post, body, {stylesheet, script}));
    if (stylesheet) await copyFile(join(postsDir, `${post.slug}.css`), join(blogDir, `${post.slug}.css`));
    if (script) await copyFile(join(postsDir, `${post.slug}.js`), join(blogDir, `${post.slug}.js`));
  }
  const newest = [...manifest].sort((a, b) => b.date.localeCompare(a.date));
  await fillSlot(join(outDir, 'index.html'), HOME_SLOT, renderHome(newest));
  await fillSlot(join(outDir, 'blog.html'), LIST_SLOT, newest.map(listEntry).join(''));
}
