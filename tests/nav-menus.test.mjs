// These need a real browser and are checked by recorded browser runs, because the project has no browser test suite:
// nav-menus::US-001/AC-01, nav-menus::US-001/AC-02, nav-menus::US-001/AC-05, nav-menus::US-001/AC-06,
// nav-menus::US-001/AC-07, nav-menus::US-001/AC-08, nav-menus::US-001/AC-09, nav-menus::US-002/AC-02,
// nav-menus::US-002/AC-04, nav-menus::US-002/AC-05, the name shown over its description in nav-menus::US-001/AC-03,
// the divider between Skills and Plugins in nav-menus::US-001/AC-04, the menus showing on every page of
// nav-menus::US-001/AC-10 (tested here: the script and its mount), the heading's size, weight and colour in
// nav-menus::US-002/AC-01 (tested here: the heading's class), the look and hover of nav-menus::US-002/AC-03, the
// screenshot area of nav-menus::US-003/AC-02, and the failure modes and boundaries of the nav-menus spec.
// Test them here once the browser suite capability is enabled.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {navigationMarkup} from '../public/navigation.js';
import {readManifest} from '../scripts/blog.mjs';
import {realSite} from './helpers/built-site.mjs';

// The works table of nav-menus::REQ-002: group, name, address, description.
const WORKS = [
  ['Apps', 'Transfer', 'https://transfer.aloongplanet.com/', 'Mac 和 Windows 之间传文件，像聊天一样随手一发就到。同一个 Wi-Fi 下打开即连，多大的文件都能传，数据只在局域网里走。'],
  ['Apps', 'Agentshed', 'https://agentshed.aloongplanet.com/', 'Claude Code、Codex 等 agent 装了什么、烧了多少 token，打开 Agentshed 一眼看清，旧会话按提问一跳直达。'],
  ['Apps', '随译', 'https://justsnap.aloongplanet.com/', '全网响应最快的截图工具，按下快捷键瞬间进入选区。框住哪里，你选的视觉模型就直接读图，文字或对照译文边生成边出现。'],
  ['Skills', 'skillshed', 'https://github.com/aloong-planet/skillshed', '让 coding agent 像靠谱的资深工程师一样干活。先问清需求、写好 spec，再测试先行地实现，交来的 PR 已经过独立审查。'],
  ['Skills', 'media-studio', 'https://github.com/aloong-planet/media-studio', '把一篇文章变成一支讲解视频，配音用的是你自己的声音，在本机生成，字幕和各平台封面也一并做好。'],
  ['Plugins', 'cc-session-pool', 'https://github.com/aloong-planet/claudecode-session-dispatcher', '让 Claude Code 连轴转。会话自己压缩上下文、醒来接着干，不用你守着；一个调度会话还能指挥一池 worker 同时开工。'],
];
const homepage = async () => readFile(join(await realSite(), 'index.html'), 'utf8');

/** The navigation's own tabs, as [text, address]: every link in it that is not a menu item. */
const tabs = html => [...html.match(/<nav\b[^>]*>([\s\S]*)<\/nav>/)[1].matchAll(/<a\b(?![^>]*\bap-menu-item\b)[^>]*\shref="([^"]+)"[^>]*>([^<]*)<\/a>/g)]
  .map(match => [match[2], match[1]]);
/** Each menu item in page order, as [menu, group heading above it or null, name, address, description]. */
function menuItems(html) {
  const items = [];
  let menu, group = null;
  for (const match of html.matchAll(/data-menu="(\w+)"|<p class="ap-menu-group">([^<]*)<\/p>|<a class="ap-menu-item"\s+href="([^"]*)"[^>]*><strong>([^<]*)<\/strong><span>([^<]*)<\/span><\/a>/g)) {
    if (match[1]) [menu, group] = [match[1], null];
    else if (match[2] !== undefined) group = match[2];
    else items.push([menu, group, match[4], match[3], match[5]]);
  }
  return items;
}
/** Where each menu item opens, in page order, as [menu, target, rel]. */
function menuItemTargets(html) {
  const targets = [];
  let menu;
  for (const match of html.matchAll(/data-menu="(\w+)"|<a class="ap-menu-item"[^>]*>/g)) {
    if (match[1]) menu = match[1];
    else targets.push([menu, ...linkTarget(match[0])]);
  }
  return targets;
}
/** A link's target and rel, as written in its opening tag, or null where it has none. */
const linkTarget = tag => ['target', 'rel'].map(name => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null);
/** Each app card on the homepage, in page order. */
const appCards = html => [...html.matchAll(/<article class="ap-project">([\s\S]*?)<\/article>/g)].map(([, card]) => ({
  image: card.match(/<img\b[^>]*>/)?.[0],
  name: card.match(/<h3>([^<]*)<\/h3>/)?.[1],
  text: card.match(/<p>(.*?)<\/p>/)?.[1],
  visit: [...card.matchAll(/<a\b[^>]*\bap-project-visit\b[^>]*>([^<]*)<\/a>/g)].map(match => match[1]),
  links: [...card.matchAll(/<a\b[^>]*>/g)].map(([tag]) => [tag.match(/\shref="([^"]*)"/)?.[1], ...linkTarget(tag)]),
}));
/** A WebP file's pixel width and height, read from its header. */
function webpSize(file) {
  assert.equal(file.toString('latin1', 0, 4) + file.toString('latin1', 8, 12), 'RIFFWEBP', 'not a WebP file');
  const chunk = file.toString('latin1', 12, 16);
  if (chunk === 'VP8 ') return [file.readUInt16LE(26) & 0x3fff, file.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8L') { const bits = file.readUInt32LE(21); return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]; }
  if (chunk === 'VP8X') return [file.readUIntLE(24, 3) + 1, file.readUIntLE(27, 3) + 1];
  throw new Error(`unknown WebP chunk ${chunk}`);
}
/** The homepage's Agents section. */
const agentsSection = html => html.match(/<section\b[^>]*\sid="agents"[^>]*>[\s\S]*?<\/section>/)[0];
/** Each entry of the homepage's Agents section in page order, as [list heading above it, name, address, description]. */
function sectionEntries(html) {
  const entries = [];
  let group;
  for (const match of agentsSection(html).matchAll(/<h3>([^<]*)<\/h3>|<a class="ap-agent"\s+href="([^"]*)"[^>]*><strong>([^<]*)<\/strong><span>([^<]*)<\/span><\/a>/g)) {
    if (match[1] !== undefined) group = match[1];
    else entries.push([group, match[3], match[2], match[4]]);
  }
  return entries;
}

test('the top navigation reads Apps, Agents, Blog, About, with Apps and Agents leading to their homepage sections (nav-menus::REQ-001)', () => {
  assert.deepEqual(tabs(navigationMarkup()), [['Apps', '/#apps'], ['Agents', '/#agents'], ['Blog', '/blog'], ['About', '/#about']]);
});

test('assistive technology knows the top navigation by its name (nav-menus::REQ-003)', () => {
  const nav = navigationMarkup().match(/<nav\b[^>]*>/)[0];
  assert.equal(nav.match(/\saria-label="([^"]*)"/)?.[1], '主要');
});

test('the menus and the delivered homepage Agents section list the works with their descriptions, in order (nav-menus::REQ-002, nav-menus::CON-001)', async () => {
  const [apps, agents] = [WORKS.filter(work => work[0] === 'Apps'), WORKS.filter(work => work[0] !== 'Apps')];
  assert.deepEqual(menuItems(navigationMarkup()), [
    ...apps.map(([, name, address, text]) => ['apps', null, name, address, text]),
    ...agents.map(([group, name, address, text]) => ['agents', group, name, address, text]),
  ]);
  assert.deepEqual(sectionEntries(await homepage()), agents);
});

test('an Apps menu item opens its website in the current tab; an Agents menu item and a homepage Agents entry open a new tab (nav-menus::US-001/AC-03, nav-menus::US-001/AC-04, nav-menus::US-002/AC-03)', async () => {
  const newTab = ['_blank', 'noreferrer'];
  assert.deepEqual(menuItemTargets(navigationMarkup()), WORKS.map(([group]) => group === 'Apps' ? ['apps', null, null] : ['agents', ...newTab]));
  const entries = [...agentsSection(await homepage()).matchAll(/<a\b[^>]*>/g)].map(match => linkTarget(match[0]));
  assert.deepEqual(entries, WORKS.filter(([group]) => group !== 'Apps').map(() => newTab));
});

test('the homepage, the Blog page, every post page and the not-found page load the navigation as a module into its mount (nav-menus::US-001/AC-10)', async () => {
  const outDir = await realSite();
  const posts = await readManifest(new URL('../content', import.meta.url).pathname);
  assert.ok(posts.length > 0);
  for (const page of ['index.html', 'blog.html', '404.html', ...posts.map(post => `blog/${post.slug}.html`)]) {
    const html = await readFile(join(outDir, page), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*\ssrc="\/navigation\.js"[^>]*>/g)].map(match => match[0]);
    assert.equal(scripts.length, 1, page);
    assert.match(scripts[0], /\stype="module"/, page);
    assert.match(html, /<div\b[^>]*\sdata-site-navigation[\s>]/, page);
  }
});

test('the homepage Agents section sits after Apps and before the footer, headed 「Agents.」 with the Apps heading\'s class (nav-menus::US-002/AC-01)', async () => {
  const html = await homepage();
  assert.deepEqual([...html.matchAll(/<(?:section|footer)\b[^>]*\sid="(apps|agents|about)"/g)].map(match => match[1]), ['apps', 'agents', 'about']);
  const heading = id => html.match(new RegExp(`<section\\b[^>]*\\sid="${id}"[^>]*>\\s*<h2\\b[^>]*\\sclass="([^"]+)"[^>]*>([^<]*)</h2>`)).slice(1);
  const [[appsClass], [agentsClass, agentsText]] = [heading('apps'), heading('agents')];
  assert.equal(agentsText, 'Agents.');
  assert.equal(agentsClass, appsClass);
});

test('the Apps section shows the Transfer, Agentshed and 随译 cards with their text, each linking to its website in a new tab (nav-menus::US-003/AC-01, nav-menus::US-003/AC-03, nav-menus::CON-001)', async () => {
  const cards = appCards(await homepage());
  assert.deepEqual(cards.map(({name, text}) => [name, text]), [
    ['Transfer', 'Mac 和 Windows 之间传文件，像聊天一样随手一发就到，<br>同一个 Wi-Fi 下打开即连，数据只在局域网里走。'],
    ['Agentshed', 'Claude Code、Codex 等 agent 装了什么、烧了多少 token，<br>打开 Agentshed 一眼看清，旧会话按提问一跳直达。'],
    ['随译', '全网响应最快的截图工具，按下快捷键瞬间进入选区，<br>框住的文字或对照译文边生成边出现。'],
  ]);
  assert.deepEqual(cards.map(({visit}) => visit.length), [1, 1, 1], 'every card has the same one visit link');
  assert.deepEqual(cards[2].visit, ['访问随译官网']);
  const websites = WORKS.filter(([group]) => group === 'Apps').map(([, , address]) => address);
  // The screenshot area and the visit link: every part of a card that links.
  assert.deepEqual(cards.map(({links}) => links), websites.map(address => [[address, '_blank', 'noreferrer'], [address, '_blank', 'noreferrer']]));
});

test('the 随译 screenshot carries its text alternative and declares the pixel size of the file it shows (nav-menus::US-003/AC-02)', async () => {
  const image = appCards(await homepage())[2].image;
  const attribute = name => image.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  assert.equal(attribute('alt'), '随译截图翻译：框选一段英文，右侧结果框显示中文译文');
  // The build ships /assets/ from the repository's assets folder.
  const file = await readFile(new URL(`..${attribute('src')}`, import.meta.url));
  assert.deepEqual([attribute('width'), attribute('height')].map(Number), webpSize(file));
});
