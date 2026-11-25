// These have no DOM or host here and are checked by recorded runs in a real browser and on the local Pages emulator,
// because the project's browser suite, packages/site-check, covers only page widths and where focus lands under the pinned header: the centered layout and the whole page fitting the first screen at
// 1440×900 and 390×844; the buttons' solid dark and outlined looks, size, corners, hover states and focus ring; the
// keyboard order of the brand, navigation, language switch and buttons; the page at a nested address; no section marked in the
// navigation at an address under /blog/; with scripting unavailable, the dog, text and buttons working without the
// navigation; a failed or unsupported dog image keeping its alt text in the same 160px space without moving the
// layout; a short window scrolling without covering the navigation; browser back returning to the previous page;
// status 404 for addresses the site does not have; an existing address written with a trailing slash or `.html`
// still redirecting to its plain address; the page's own address /404 (/en/404 for the English page) answering 200 and
// /404.html redirecting there; an existing page with a query string unchanged (a hash never reaches the host, so it needs no
// run); and no visitor request. Test them in the browser suite once it covers them.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pageImages} from '../scripts/image-checks.mjs';
import {isNotFoundAnswer, notFoundHeading} from '../scripts/not-found-check.mjs';
import {realSite} from './helpers/built-site.mjs';

// What each language's page reads (not-found::US-001/AC-01, not-found::US-001/AC-02, not-found::US-001/AC-04) and where its
// buttons lead (site-languages::REQ-005).
const PAGES = [
  {
    name: 'Chinese', file: '404.html', language: 'zh-CN', dogAlt: '歪着头找东西的金毛小狗', heading: '这一页走丢了',
    text: '小狗找了一圈，没找到这个地址。<br>可能是链接打错了，或者页面已经搬走。',
    buttons: [['回首页', '/'], ['看看博客', '/blog']], title: '这一页走丢了 · Aloong Planet',
  },
  {
    name: 'English', file: 'en/404.html', language: 'en', dogAlt: 'A golden retriever tilting its head, looking for something', heading: 'This page got lost',
    text: "The dog looked everywhere and couldn't find this address.<br>The link may be mistyped, or the page may have moved.",
    buttons: [['Back to home', '/en/'], ['Read the blog', '/en/blog']], title: 'This page got lost · Aloong Planet',
  },
];
const page = async file => readFile(join(await realSite(), file), 'utf8');

for (const expected of PAGES) {
  test(`the ${expected.name} not-found page shows the puzzled dog, 404, the heading and the explanation, with no footer`, async () => {
    const html = await page(expected.file);
    assert.deepEqual(pageImages(html), ['/assets/not-found/puzzled-dog.webp']);
    const dog = html.match(/<img\b[^>]*>/)[0];
    assert.match(dog, /\swidth="160"/);
    assert.match(dog, /\sheight="160"/);
    assert.ok(dog.includes(` alt="${expected.dogAlt}"`), dog);
    assert.match(html, />404</);
    assert.ok(html.includes(`<h1>${expected.heading}</h1>`));
    assert.ok(html.includes(`>${expected.text}<`));
    assert.doesNotMatch(html, /<footer\b/);
  });

  test(`the ${expected.name} not-found page's buttons open this language's homepage and Blog, and its tab reads the heading and the site's name`, async () => {
    const html = await page(expected.file);
    const links = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(match => [match[2], match[1]]);
    assert.deepEqual(links, expected.buttons);
    assert.ok(html.includes(`<title>${expected.title}</title>`));
  });

  test(`every address on the ${expected.name} not-found page starts at the site root, so it works at a nested address; only its language alternates name the site's origin`, async () => {
    // An alternate names the other version in full, as search engines ask (site-languages::REQ-004); a full address works at a nested address too.
    const markup = (await page(expected.file)).replace(/<link\b[^>]*\srel="alternate"[^>]*>/g, '');
    const addresses = [...markup.matchAll(/\s(?:src|href)="([^"]*)"/g)].map(match => match[1]);
    assert.ok(addresses.length > 0);
    for (const address of addresses) assert.match(address, /^\/(?!\/)/, `${address} is not addressed from the site root`);
  });

  test(`the ${expected.name} not-found page loads no visitor script and no dog interaction, and declares no canonical address`, async () => {
    const html = await page(expected.file);
    assert.doesNotMatch(html, /visitor\.js/);
    assert.doesNotMatch(html, /golden-interaction\.js/);
    assert.doesNotMatch(html, /rel="?canonical/);
  });

  test(`the ${expected.name} not-found page has the site top navigation, marked as belonging to no section, and one heading`, async () => {
    const html = await page(expected.file);
    assert.match(html, /<script\b[^>]*\ssrc="\/navigation\.js"/);
    assert.match(html, /<div\b[^>]*\sdata-site-navigation\s+data-page="not-found"[^>]*>/);
    assert.deepEqual([...html.matchAll(/<(h[1-6])\b/g)].map(match => match[1]), ['h1']);
  });

  test(`the deployment check recognizes the ${expected.name} not-found page by its heading and requires status 404`, async () => {
    const html = await page(expected.file);
    const homepage = await page(expected.file.replace('404', 'index'));
    const heading = notFoundHeading(html);
    assert.equal(heading, expected.heading);
    assert.throws(() => notFoundHeading('<main><p>404</p></main>'), /no heading/);
    assert.equal(isNotFoundAnswer(404, html, heading), true);
    assert.equal(isNotFoundAnswer(200, html, heading), false, 'the page with status 200 is a soft 404');
    assert.equal(isNotFoundAnswer(404, 'Not Found', heading), false, 'a bare 404 shows visitors no page');
    assert.equal(isNotFoundAnswer(200, homepage, heading), false, 'the homepage is what the host gave before the page existed');
  });
}

test("each language's not-found check cannot be met by the other language's page", async () => {
  const [chinese, english] = await Promise.all(PAGES.map(({file}) => page(file)));
  assert.equal(isNotFoundAnswer(404, chinese, notFoundHeading(english)), false);
  assert.equal(isNotFoundAnswer(404, english, notFoundHeading(chinese)), false);
});
