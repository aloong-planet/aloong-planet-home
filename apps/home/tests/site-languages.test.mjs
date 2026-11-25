// site-languages on the built site: which pages exist, the language each declares, and how the two languages' versions of a page
// line up. The browser-only parts of the spec (the switch inside the header and the window at every width, the visitor line
// under the browser's own number format) are tested in packages/site-check, which is the project's browser suite; the
// navigation's markup is tested in nav-menus.test.mjs, the visitor line's wording in visitor-client.test.mjs.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {realSite} from './helpers/built-site.mjs';

/** Every built page, as a path under the built site, in a stable order. */
async function builtPages() {
  const root = await realSite();
  const files = await readdir(root, {recursive: true});
  return files.filter(file => file.endsWith('.html')).map(file => relative(root, join(root, file))).sort();
}
const read = async page => readFile(join(await realSite(), page), 'utf8');

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
