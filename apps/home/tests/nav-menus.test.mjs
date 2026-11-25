// These need a real browser and are checked by recorded browser runs, because the project's browser suite, packages/site-check, covers only page widths and where focus lands under the pinned header:
// nav-menus::US-001/AC-01, nav-menus::US-001/AC-02, nav-menus::US-001/AC-05, nav-menus::US-001/AC-06,
// nav-menus::US-001/AC-07, nav-menus::US-001/AC-08, nav-menus::US-001/AC-09, nav-menus::US-002/AC-02,
// nav-menus::US-002/AC-04, nav-menus::US-002/AC-05, the name shown over its description in nav-menus::US-001/AC-03,
// the divider between Skills and Plugins in nav-menus::US-001/AC-04, the menus showing on every page of
// nav-menus::US-001/AC-10 (tested here: the script and its mount), the heading's size, weight and colour in
// nav-menus::US-002/AC-01 (tested here: the heading's class), the look and hover of nav-menus::US-002/AC-03, the
// screenshot area of nav-menus::US-003/AC-02, nav-menus::US-004/AC-01, nav-menus::US-004/AC-02,
// the right end of the header in nav-menus::REQ-004 (tested here: the link after the
// navigation, its address and its target), and the failure modes and boundaries of the nav-menus spec.
// Test them in the browser suite once it covers them.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {navigationMarkup} from '../public/navigation.js';
import {readManifest} from '../scripts/blog.mjs';
import {readBuilt, realSite} from './helpers/built-site.mjs';

// The works table of nav-menus::REQ-002 for each language: group, name, address, description.
const WORKS = {
  zh: [
    ['Apps', 'Transfer', 'https://transfer.aloongplanet.com/', 'Mac 和 Windows 之间传文件，像聊天一样随手一发就到。同一个 Wi-Fi 下打开即连，多大的文件都能传，数据只在局域网里走。'],
    ['Apps', 'Agentshed', 'https://agentshed.aloongplanet.com/zh/', 'Claude Code、Codex 等 agent 装了什么、烧了多少 token，打开 Agentshed 一眼看清，旧会话按提问一跳直达。'],
    ['Apps', '随译', 'https://justsnap.aloongplanet.com/', '全网响应最快的截图工具，按下快捷键瞬间进入选区。框住哪里，你选的视觉模型就直接读图，文字或对照译文边生成边出现。'],
    ['Skills', 'skillshed', 'https://github.com/aloong-planet/skillshed', '让 coding agent 像靠谱的资深工程师一样干活。先问清需求、写好 spec，再测试先行地实现，交来的 PR 已经过独立审查。'],
    ['Skills', 'media-studio', 'https://github.com/aloong-planet/media-studio', '把一篇文章变成一支讲解视频，配音用的是你自己的声音，在本机生成，字幕和各平台封面也一并做好。'],
    ['Plugins', 'cc-session-pool', 'https://github.com/aloong-planet/claudecode-session-dispatcher', '让 Claude Code 连轴转。会话自己压缩上下文、醒来接着干，不用你守着；一个调度会话还能指挥一池 worker 同时开工。'],
  ],
  en: [
    ['Apps', 'Transfer', 'https://transfer.aloongplanet.com/en', 'Send files between Mac and Windows as easily as a chat message. On the same Wi-Fi it connects as soon as it opens, takes files of any size, and your data never leaves the local network.'],
    ['Apps', 'Agentshed', 'https://agentshed.aloongplanet.com/', 'See at a glance what Claude Code, Codex and other agents have installed and how many tokens they burn, and jump straight to an old session by what you asked in it.'],
    ['Apps', 'JustSnap', 'https://justsnap.aloongplanet.com/en/', 'The fastest screenshot tool around: press the shortcut and start selecting at once. Whatever you frame, the vision model you chose reads the image directly, and the text or a side-by-side translation appears as it is generated.'],
    ['Skills', 'skillshed', 'https://github.com/aloong-planet/skillshed', 'Makes your coding agent work like a dependable senior engineer: it pins down the requirements and writes the spec, then implements test-first, and the PR it hands over has already had an independent review.'],
    ['Skills', 'media-studio', 'https://github.com/aloong-planet/media-studio', 'Turns an article into an explainer video narrated in your own voice, generated on your own machine, with subtitles and a cover for each platform made along the way.'],
    ['Plugins', 'cc-session-pool', 'https://github.com/aloong-planet/claudecode-session-dispatcher', 'Keeps Claude Code working around the clock. Sessions compact their own context and wake up to carry on, without you watching over them; one dispatcher session can also run a whole pool of workers at once.'],
  ],
};
const LANGUAGES = ['zh', 'en'];
const HOMEPAGES = {zh: 'index.html', en: 'en/index.html'};
const homepage = async lang => readBuilt(HOMEPAGES[lang]);

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

const markup = (lang, page = 'home') => navigationMarkup({lang, page});
// The tabs of nav-menus::REQ-001 in each language, each leading to its page in that language (site-languages::REQ-005).
const TABS = {
  zh: [['Apps', '/#apps'], ['Agents', '/#agents'], ['Blog', '/blog'], ['About', '/#about']],
  en: [['Apps', '/en/#apps'], ['Agents', '/en/#agents'], ['Blog', '/en/blog'], ['About', '/en/#about']],
};
const NAVIGATION_NAMES = {zh: '主要', en: 'Main'};
const BRAND_ADDRESSES = {zh: '/', en: '/en/'};

for (const lang of LANGUAGES) {
  test(`the ${lang} top navigation reads Apps, Agents, Blog, About, each leading to its page or section in this language (nav-menus::REQ-001, site-languages::REQ-005)`, () => {
    assert.deepEqual(tabs(markup(lang)), TABS[lang]);
    assert.equal(markup(lang).match(/<a class="ap-brand" href="([^"]*)"/)[1], BRAND_ADDRESSES[lang]);
  });

  test(`assistive technology knows the ${lang} top navigation by its name (nav-menus::REQ-003)`, () => {
    const nav = markup(lang).match(/<nav\b[^>]*>/)[0];
    assert.equal(nav.match(/\saria-label="([^"]*)"/)?.[1], NAVIGATION_NAMES[lang]);
  });

  test(`the ${lang} header ends with a GitHub link that opens the profile in a new tab, just before the language switch (nav-menus::REQ-004)`, () => {
    // The link is not one of the navigation's tabs, so tabs() does not see it: it opens the group at the right end of the header.
    const link = markup(lang).match(/<div class="ap-header-end">(<a\b[^>]*>)([^<]*)<\/a><div class="ap-lang"/);
    assert.ok(link, 'the right end of the header holds a link, and the language switch after it');
    assert.equal(link[2], 'GitHub');
    assert.equal(link[1].match(/\shref="([^"]*)"/)?.[1], 'https://github.com/aloong-planet');
    assert.equal(linkTarget(link[1])[0], '_blank');
  });

  test(`the ${lang} menus list the works with their descriptions, in order, each opening the address for this language (nav-menus::REQ-002)`, () => {
    const [apps, agents] = [WORKS[lang].filter(work => work[0] === 'Apps'), WORKS[lang].filter(work => work[0] !== 'Apps')];
    assert.deepEqual(menuItems(markup(lang)), [
      ...apps.map(([, name, address, text]) => ['apps', null, name, address, text]),
      ...agents.map(([group, name, address, text]) => ['agents', group, name, address, text]),
    ]);
  });

  test(`in the ${lang} menus an Apps item opens its website in the current tab and an Agents item opens a new tab (nav-menus::US-001/AC-03, nav-menus::US-001/AC-04)`, () => {
    const newTab = ['_blank', 'noreferrer'];
    assert.deepEqual(menuItemTargets(markup(lang)), WORKS[lang].map(([group]) => group === 'Apps' ? ['apps', null, null] : ['agents', ...newTab]));
  });
}

test('the Blog tab is marked as the current page on the Blog page and as the current section on a post page, and nothing is marked on the other pages (blog::US-003/AC-01, not-found::US-001/AC-01)', () => {
  const marked = html => [...html.match(/<nav\b[^>]*>([\s\S]*)<\/nav>/)[1].matchAll(/<a\b(?![^>]*\bap-menu-item\b)([^>]*)>/g)].map(([, attrs]) => attrs.match(/\saria-current="([^"]*)"/)?.[1] ?? null);
  const expected = {home: [null, null, null, null], blog: [null, null, 'page', null], post: [null, null, 'true', null], 'not-found': [null, null, null, null]};
  for (const [page, tabMarks] of Object.entries(expected)) {
    for (const lang of page === 'post' ? ['zh'] : LANGUAGES) assert.deepEqual(marked(markup(lang, page)), tabMarks, `${lang} ${page}`);
  }
});

for (const lang of LANGUAGES) {
  test(`the delivered ${lang} homepage's Agents section lists the skills and plugins with their descriptions, in order (nav-menus::REQ-002, nav-menus::CON-001)`, async () => {
    assert.deepEqual(sectionEntries(await homepage(lang)), WORKS[lang].filter(([group]) => group !== 'Apps'));
  });

  test(`a ${lang} homepage Agents entry opens a new tab (nav-menus::US-002/AC-03)`, async () => {
    const entries = [...agentsSection(await homepage(lang)).matchAll(/<a\b[^>]*>/g)].map(match => linkTarget(match[0]));
    assert.deepEqual(entries, WORKS[lang].filter(([group]) => group !== 'Apps').map(() => ['_blank', 'noreferrer']));
  });
}

test('the homepage, the Blog page, every post page and the not-found page load the navigation as a module into its mount (nav-menus::US-001/AC-10)', async () => {
  const outDir = await realSite();
  const posts = await readManifest(new URL('../content', import.meta.url).pathname);
  assert.ok(posts.length > 0);
  // Each page's mount names the kind of page it is, which decides what the navigation marks and where its language switch leads.
  const kinds = [['index.html', 'home'], ['blog.html', 'blog'], ['404.html', 'not-found'], ['en/index.html', 'home'], ['en/blog.html', 'blog'], ['en/404.html', 'not-found'], ...posts.map(post => [`blog/${post.slug}.html`, 'post'])];
  for (const [page, kind] of kinds) {
    const html = await readFile(join(outDir, page), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*\ssrc="\/navigation\.js"[^>]*>/g)].map(match => match[0]);
    assert.equal(scripts.length, 1, page);
    assert.match(scripts[0], /\stype="module"/, page);
    assert.equal(html.match(/<div\b[^>]*\sdata-site-navigation(?:\s[^>]*)?>/)?.[0].match(/\sdata-page="([^"]*)"/)?.[1], kind, page);
  }
});

for (const lang of LANGUAGES) {
  test(`the ${lang} homepage Agents section sits after Apps and before the footer, headed 「Agents.」 with the Apps heading's class (nav-menus::US-002/AC-01)`, async () => {
    const html = await homepage(lang);
    assert.deepEqual([...html.matchAll(/<(?:section|footer)\b[^>]*\sid="(apps|agents|about)"/g)].map(match => match[1]), ['apps', 'agents', 'about']);
    const heading = id => html.match(new RegExp(`<section\\b[^>]*\\sid="${id}"[^>]*>\\s*<h2\\b[^>]*\\sclass="([^"]+)"[^>]*>([^<]*)</h2>`)).slice(1);
    const [[appsClass, appsText], [agentsClass, agentsText]] = [heading('apps'), heading('agents')];
    assert.equal(appsText, 'Apps.');
    assert.equal(agentsText, 'Agents.');
    assert.equal(agentsClass, appsClass);
  });
}

// The cards' text for each language, each line break as nav-menus::US-003/AC-03 shows it, and the link texts of nav-menus::US-003/AC-01.
const CARDS = {
  zh: {
    names: ['Transfer', 'Agentshed', '随译'],
    texts: [
      'Mac 和 Windows 之间传文件，像聊天一样随手一发就到，<br>同一个 Wi-Fi 下打开即连，数据只在局域网里走。',
      'Claude Code、Codex 等 agent 装了什么、烧了多少 token，<br>打开 Agentshed 一眼看清，旧会话按提问一跳直达。',
      '全网响应最快的截图工具，按下快捷键瞬间进入选区，<br>框住的文字或对照译文边生成边出现。',
    ],
    visits: ['访问 Transfer 官网', '访问 Agentshed 官网', '访问随译官网'],
    justsnapAlt: '随译截图翻译：框选一段英文，右侧结果框显示中文译文',
  },
  en: {
    names: ['Transfer', 'Agentshed', 'JustSnap'],
    texts: [
      'Send files between Mac and Windows as easily as sending a chat message;<br>on the same Wi-Fi it connects as soon as it opens, and your data stays on the local network.',
      'See what Claude Code, Codex and other agents have installed and how many tokens they burn<br>at a glance in Agentshed, and jump straight to an old session by what you asked in it.',
      'The fastest screenshot tool around: press the shortcut and start selecting at once,<br>and the framed text or its side-by-side translation appears as it is generated.',
    ],
    visits: ['Visit the Transfer website', 'Visit the Agentshed website', 'Visit the JustSnap website'],
    justsnapAlt: 'JustSnap screenshot translation: a selected passage of English, with its Chinese translation in the result box beside it',
  },
};

for (const lang of LANGUAGES) {
  test(`the ${lang} Apps section shows the Transfer, Agentshed and JustSnap cards with their text, each linking to its website for this language in a new tab (nav-menus::US-003/AC-01, nav-menus::US-003/AC-03, nav-menus::CON-001, nav-menus::REQ-002)`, async () => {
    const cards = appCards(await homepage(lang));
    assert.deepEqual(cards.map(({name, text}) => [name, text]), CARDS[lang].names.map((name, at) => [name, CARDS[lang].texts[at]]));
    assert.deepEqual(cards.map(({visit}) => visit), CARDS[lang].visits.map(visit => [visit]), 'every card has the same one visit link');
    const websites = WORKS[lang].filter(([group]) => group === 'Apps').map(([, , address]) => address);
    // The screenshot area and the visit link: every part of a card that links.
    assert.deepEqual(cards.map(({links}) => links), websites.map(address => [[address, '_blank', 'noreferrer'], [address, '_blank', 'noreferrer']]));
  });

  test(`the ${lang} JustSnap screenshot carries its text alternative and declares the pixel size of the file it shows (nav-menus::US-003/AC-02)`, async () => {
    const image = appCards(await homepage(lang))[2].image;
    const attribute = name => image.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
    assert.equal(attribute('alt'), CARDS[lang].justsnapAlt);
    // The build ships /assets/ from the repository's assets folder.
    const file = await readFile(new URL(`..${attribute('src')}`, import.meta.url));
    assert.deepEqual([attribute('width'), attribute('height')].map(Number), webpSize(file));
  });
}
