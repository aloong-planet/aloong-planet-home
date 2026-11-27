// site-languages on the built site: which pages exist, the language each declares, and how the two languages' versions of a page
// line up. The browser-only parts of the spec (the switch inside the header and the window at every width, the visitor line
// under the browser's own number format) are tested in packages/site-check, which is the project's browser suite; the
// navigation's markup is tested in nav-menus.test.mjs, the visitor line's wording in visitor-client.test.mjs.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {navigationMarkup} from '../public/navigation.js';
import {ui} from '../public/ui.js';
import {readBuilt, realSite} from './helpers/built-site.mjs';

/** Every built page, as a path under the built site, in a stable order. */
async function builtPages() {
  const root = await realSite();
  const files = await readdir(root, {recursive: true});
  return files.filter(file => file.endsWith('.html')).map(file => relative(root, join(root, file))).sort();
}
const read = readBuilt;

test('the site has an English homepage, Blog page and not-found page, and no English post page (site-languages::REQ-001)', async () => {
  const pages = await builtPages();
  for (const page of ['index.html', 'blog.html', '404.html', 'en/index.html', 'en/blog.html', 'en/404.html']) assert.ok(pages.includes(page), `${page} is built`);
  assert.deepEqual(pages.filter(page => page.startsWith('en/')), ['en/404.html', 'en/blog.html', 'en/index.html']);
});

test('each page declares its language as its document language: zh-CN on Chinese pages and post pages, en on English pages (site-languages::REQ-001/AC-01)', async () => {
  const pages = await builtPages();
  assert.ok(pages.some(page => page.startsWith('blog/')), 'the real site has post pages');
  for (const page of pages) {
    const declared = (await read(page)).match(/<html\b[^>]*\slang="([^"]*)"/)?.[1];
    assert.equal(declared, page.startsWith('en/') ? 'en' : 'zh-CN', page);
  }
});

const PAIRS = [['index.html', 'en/index.html'], ['blog.html', 'en/blog.html'], ['404.html', 'en/404.html']];
const attribute = (attrs, name) => attrs.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? '';
const body = html => html.slice(html.indexOf('<body'));
/** Every tag of the page's body with its class and id: the sections and layout of the page, without its words. */
const skeleton = html => [...body(html).matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)].map(([, tag, attrs]) => `${tag} .${attribute(attrs, 'class')} #${attribute(attrs, 'id')}`);
const imageSources = html => [...html.matchAll(/<img\b[^>]*\ssrc="([^"]*)"/g)].map(match => match[1]);
const links = html => [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map(match => match[1]);
// Where each app site's English page is, from where its Chinese page is (nav-menus::REQ-002): the links of a page and of its pair match once these are paired.
const APP_SITES = new Map([
  ['https://transfer.aloongplanet.com/', 'https://transfer.aloongplanet.com/en'],
  ['https://agentshed.aloongplanet.com/zh/', 'https://agentshed.aloongplanet.com/'],
  ['https://justsnap.aloongplanet.com/', 'https://justsnap.aloongplanet.com/en/'],
]);
/** An English page's link, as the Chinese version of the same link. @param {string} href */
const asChinese = href => [...APP_SITES].find(([, english]) => english === href)?.[0] ?? (href === '/en/' ? '/' : href.replace(/^\/en\/(?=[#b])/, '/').replace(/^\/en\//, '/'));

for (const [chinese, english] of PAIRS) {
  test(`${english} has the sections, layout, images and links of ${chinese} (site-languages::REQ-001/AC-02)`, async () => {
    const [zhHtml, enHtml] = [await read(chinese), await read(english)];
    assert.deepEqual(skeleton(enHtml), skeleton(zhHtml));
    assert.deepEqual(imageSources(enHtml), imageSources(zhHtml));
    assert.deepEqual(links(enHtml).map(asChinese), links(zhHtml));
  });

  test(`${english} has its text, its text alternatives included, in English, with no Chinese in it (site-languages::REQ-001/AC-02)`, async () => {
    // The language switch is added by the navigation script, so the delivered page holds no 中文 either.
    assert.doesNotMatch(await read(english), /\p{Script=Han}/u);
  });
}

test('each page that has a version in the other language names both, itself included, as language alternates; a post page names none (site-languages::REQ-004)', async () => {
  const names = html => [...html.matchAll(/<link\b[^>]*\srel="alternate"[^>]*>/g)].map(([tag]) => [attribute(tag, 'hreflang'), attribute(tag, 'href')]);
  for (const [chinese, english, zh, en] of [
    ['index.html', 'en/index.html', 'https://aloongplanet.com/', 'https://aloongplanet.com/en/'],
    ['blog.html', 'en/blog.html', 'https://aloongplanet.com/blog', 'https://aloongplanet.com/en/blog'],
    ['404.html', 'en/404.html', 'https://aloongplanet.com/404', 'https://aloongplanet.com/en/404'],
  ]) {
    for (const page of [chinese, english]) assert.deepEqual(names(await read(page)), [['zh-CN', zh], ['en', en]], page);
  }
  const posts = (await builtPages()).filter(page => page.startsWith('blog/'));
  assert.ok(posts.length > 0);
  for (const page of posts) assert.deepEqual(names(await read(page)), [], page);
});

test('every link from a page to the homepage, a section of it or the Blog page opens that page in the page\'s own language (site-languages::REQ-005)', async () => {
  const ownHomeOrBlog = /^\/(?:#.*|blog|blog\.html|)$/;
  for (const page of await builtPages()) {
    const internal = links(await read(page)).filter(href => href.startsWith('/'));
    if (page.startsWith('en/')) {
      assert.deepEqual(internal.filter(href => ownHomeOrBlog.test(href)), [], `${page} links to a Chinese page`);
    } else {
      assert.deepEqual(internal.filter(href => href.startsWith('/en')), [], `${page} links to an English page`);
    }
  }
  // The Blog page's way back and the English not-found page's buttons are the links the spec names that no other test reads.
  assert.deepEqual(links(await read('blog.html')).filter(href => href === '/'), ['/']);
  assert.deepEqual(links(await read('en/blog.html')).filter(href => href === '/en/'), ['/en/']);
});

// Where the link to the other language leads on each kind of page (site-languages::REQ-003/AC-03). A post page has a Chinese version only.
const SWITCH = [
  ['zh', 'home', '/en/'], ['zh', 'blog', '/en/blog'], ['zh', 'post', '/en/blog'], ['zh', 'not-found', '/en/'],
  ['en', 'home', '/'], ['en', 'blog', '/blog'], ['en', 'not-found', '/'],
];
const GROUP_NAMES = {zh: '语言', en: 'Language'};
/** The language switch of a navigation's markup: its group's name and each item as [tag, attributes, text]. */
function languageSwitch(markup) {
  const group = markup.match(/<div class="ap-lang"([^>]*)>(.*?)<\/div>/s);
  assert.ok(group, 'the header holds a language switch');
  const items = [...group[2].matchAll(/<(span|a)\b([^>]*)>([^<]*)<\/\1>/g)].map(([, tag, attrs, text]) => [tag, Object.fromEntries([...attrs.matchAll(/\s([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value])), text]);
  return {group: Object.fromEntries([...group[1].matchAll(/\s([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value])), items};
}

for (const [lang, page, destination] of SWITCH) {
  test(`the ${lang} ${page} page shows 中文 and EN as the last item of its header, its own language as marked text and the other as a link to ${destination} (site-languages::REQ-003)`, () => {
    const markup = navigationMarkup({lang, page});
    // The last item of the header, after the social links (nav-menus::REQ-004).
    assert.match(markup, /<div class="ap-lang"[^>]*>.*<\/div>\s*<\/div>\s*<\/header>$/s);
    const {group, items} = languageSwitch(markup);
    assert.equal(group['aria-label'], GROUP_NAMES[lang]);
    assert.equal(group.role, 'group');
    assert.deepEqual(items.map(([, , text]) => text), ['中文', 'EN']);
    const [chinese, english] = items;
    if (lang === 'zh') {
      assert.deepEqual(chinese.slice(0, 2), ['span', {lang: 'zh-CN', 'aria-current': 'true'}]);
      assert.deepEqual(english.slice(0, 2), ['a', {lang: 'en', hreflang: 'en', rel: 'alternate', href: destination, 'aria-label': 'English'}]);
    } else {
      assert.deepEqual(chinese.slice(0, 2), ['a', {lang: 'zh-CN', hreflang: 'zh-CN', rel: 'alternate', href: destination}]);
      assert.deepEqual(english.slice(0, 2), ['span', {lang: 'en', 'aria-current': 'true'}]);
    }
  });
}

const SCRIPTS = ['public/navigation.js', 'public/visitor.js', 'public/article.js', 'assets/golden-interaction.js'];
const readScript = script => readFile(new URL(`../${script}`, import.meta.url), 'utf8');

test('the scripts the pages load hold no interface copy of their own: no Chinese character in any of them', async () => {
  for (const script of SCRIPTS) assert.doesNotMatch(await readScript(script), /\p{Script=Han}/u, script);
});

// The Han guard sees Chinese in a script, not English. A string of a script that has two words in it, or two words between the tags of
// the markup it builds, is English copy, except a CSS selector, the "use strict" directive, and the message of an Error that is thrown
// and caught, never shown (visitor.js). Comments are not code.
// What it does not see is a string of one word: that is as likely an identifier (an event name, a class name, the value of an attribute)
// as copy, and a scan for it would need a long list of the identifiers these scripts hold. So a single English word written into one of
// them for the visitor to read would show on the Chinese pages as well as the English ones, and pass here. When such a word first has to
// be shown, it goes into the dictionary (ui.js), or a scan for it is added then.
test('the scripts the pages load hold no English sentence of their own', async () => {
  let literals = 0;
  for (const script of SCRIPTS) {
    const code = (await readScript(script))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
      .replace(/new Error\((['"`])(?:(?!\1)[^\\]|\\.)*\1\)/g, 'new Error()');
    const strings = [...code.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map(match => match[1] ?? match[2] ?? match[3]);
    literals += strings.length;
    const sentences = strings
      .flatMap(text => [...text.replace(/\$\{[^}]*\}/g, ' ').matchAll(/(?:^|>)([^<>]*)(?=<|$)/g)].map(match => match[1].trim()))
      .filter(text => /\p{L}{2,}\s+\p{L}{2,}/u.test(text) && !/^[.#[]/.test(text) && text !== 'use strict');
    assert.deepEqual(sentences, [], script);
  }
  // 513 strings on these scripts: a floor that tells a scan that read them from one that found nothing.
  assert.ok(literals >= 400, `the scan found ${literals} strings in the scripts`);
});

// The dictionary. That the two languages have the same keys and list lengths is the typechecker's work (`pnpm typecheck`), proved by
// leaving a key out of the English copy and adding one to it; what it cannot see is a string that is there but blank, or
// Chinese left in the English copy, and these two tests look for those. Functions of the copy are called with sample values.
/** Every string of a copy, with where it sits. */
function strings(value, path = []) {
  if (typeof value === 'string') return [[path.join('.'), value]];
  if (typeof value === 'function') return [[`${path.join('.')}()`, value(2, '2').toString()], [`${path.join('.')}(date)`, value('2026-11-05', '2').toString()]];
  return Object.entries(value).flatMap(([key, inner]) => strings(inner, [...path, key]));
}

test('no string of either language\'s copy is blank', () => {
  for (const lang of ['zh', 'en']) {
    const copy = strings(ui[lang]);
    // 88 strings and function results each, counted on this copy: a floor that tells a walk that found the copy from one that found nothing.
    assert.ok(copy.length >= 80, `the ${lang} copy has its strings`);
    for (const [where, text] of copy) assert.notEqual(text.trim(), '', `${lang} ${where} is blank`);
  }
});

test('the English copy holds no Chinese, except the language switch\'s name for Chinese', () => {
  const chinese = strings(ui.en).filter(([, text]) => /\p{Script=Han}/u.test(text)).map(([where]) => where);
  assert.deepEqual(chinese, ['language.zh']);
});

// The reverse of the Han guards above. English copy written straight into a template that both languages share would show on the
// Chinese pages and pass every other test here, as the English pages would read it as their own. So what a delivered Chinese page shows
// (its text, its text alternatives, its description) without a Chinese character in it must be in the Chinese copy, as the English names
// the Chinese pages keep are (「Apps.」, the works' names), or be a lowercase identifier such as the value of data-page. It does not see
// one lowercase word written into an attribute, nor text a script writes into the page, which the test of the scripts looks for.
test('the Chinese pages show no English text of their own: what they show without a Chinese character is in the Chinese copy', async () => {
  const copy = strings(ui.zh).map(([, text]) => text);
  let found = 0;
  for (const page of PAIRS.map(([chinese]) => chinese)) {
    const html = (await read(page)).replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '');
    const latinOnly = [
      ...html.matchAll(/>([^<>]+)</g),
      ...html.matchAll(/\s(?:alt|title|aria-label|data-[a-z-]+)="([^"]*)"/g),
      ...html.matchAll(/<meta\s+name="description"\s+content="([^"]*)"/g),
    ].map(match => match[1].trim()).filter(text => /[A-Za-z]{2}/.test(text) && !/\p{Script=Han}/u.test(text));
    found += latinOnly.length;
    for (const text of latinOnly) assert.ok(/^[a-z]+(-[a-z]+)*$/.test(text) || copy.some(entry => entry.includes(text)), `${page} shows "${text}", which is not in the Chinese copy`);
  }
  // 19 found on this site: a floor that tells a scan that read the pages from one that found nothing.
  assert.ok(found >= 10, `the scan found ${found} English strings on the Chinese pages`);
});
