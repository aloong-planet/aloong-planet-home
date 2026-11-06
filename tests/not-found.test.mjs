// These have no DOM or host here and are checked by recorded runs in a real browser and on the local Pages emulator,
// because the project has no browser test suite: the centered layout and the whole page fitting the first screen at
// 1440×900 and 390×844, the buttons' size, corners, hover states and focus ring, the page at a nested address, no
// section marked in the navigation at an address under /blog/, status 404 for addresses the site does not have, and no
// visitor request. Test them here once the browser suite capability is enabled.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pageImages} from '../scripts/image-checks.mjs';

const page = () => readFile(new URL('../public/404.html', import.meta.url), 'utf8');

test('the not-found page shows the puzzled dog, 404, the heading and the explanation, with no footer', async () => {
  const html = await page();
  assert.deepEqual(pageImages(html), ['/assets/not-found/puzzled-dog.webp']);
  const dog = html.match(/<img\b[^>]*>/)[0];
  assert.match(dog, /\swidth="160"/);
  assert.match(dog, /\sheight="160"/);
  assert.match(dog, /\salt="歪着头找东西的金毛小狗"/);
  assert.match(html, />404</);
  assert.match(html, /<h1\b[^>]*>这一页走丢了<\/h1>/);
  assert.match(html, />小狗找了一圈，没找到这个地址。<br>可能是链接打错了，或者页面已经搬走。</);
  assert.doesNotMatch(html, /<footer\b/);
});

test('回首页 opens the homepage, 看看博客 opens the Blog, and the tab reads 这一页走丢了 · Aloong Planet', async () => {
  const html = await page();
  const links = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(match => [match[2], match[1]]);
  assert.deepEqual(links, [['回首页', '/'], ['看看博客', '/blog']]);
  assert.match(html, /<title>这一页走丢了 · Aloong Planet<\/title>/);
});

test('every address on the not-found page starts at the site root, so it works at a nested address', async () => {
  const addresses = [...(await page()).matchAll(/\s(?:src|href)="([^"]*)"/g)].map(match => match[1]);
  assert.ok(addresses.length > 0);
  for (const address of addresses) assert.match(address, /^\/(?!\/)/, `${address} is not addressed from the site root`);
});

test('the not-found page loads no visitor script and no dog interaction, and declares no canonical address', async () => {
  const html = await page();
  assert.doesNotMatch(html, /visitor\.js/);
  assert.doesNotMatch(html, /golden-interaction\.js/);
  assert.doesNotMatch(html, /rel="?canonical/);
});
