// Layout, type sizes, centering, scrolling, the contents mark and interactive figures need a real browser;
// they are checked by recorded browser runs because the project has no browser test suite.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildBlog, blogChecks} from '../scripts/blog.mjs';

const BODY = '<section id="s2"><h2><span class="sec">§2</span>双层架构：把连续性和吞吐量拆开</h2><p>正文</p></section>';
const post = (slug, date = '2026-11-05', extra = {}) => ({slug, title: `标题 ${slug}`, date, summary: `摘要 ${slug}`, ...extra});

/** Builds a small site in a temporary folder and returns a reader for its output. */
async function site(posts, {files = {}, bodies = {}, home = '<main><!-- blog:home --></main>', list = '<main><!-- blog:list --></main>'} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'blog-test-'));
  const contentDir = join(root, 'content'), outDir = join(root, 'out');
  await mkdir(join(contentDir, 'posts'), {recursive: true});
  await mkdir(outDir);
  await writeFile(join(contentDir, 'posts.json'), JSON.stringify(posts));
  for (const p of Array.isArray(posts) ? posts : []) {
    if (p && typeof p.slug === 'string' && !(p.slug in bodies)) await writeFile(join(contentDir, 'posts', `${p.slug}.html`), BODY);
  }
  for (const [slug, body] of Object.entries(bodies)) if (body !== null) await writeFile(join(contentDir, 'posts', `${slug}.html`), body);
  for (const [name, text] of Object.entries(files)) await writeFile(join(contentDir, 'posts', name), text);
  await writeFile(join(outDir, 'index.html'), home);
  await writeFile(join(outDir, 'blog.html'), list);
  await writeFile(join(outDir, 'site.css'), '.ap-site{--paper:#fff;--ink:#000}');
  await writeFile(join(outDir, 'article.css'), '.ap-article{--panel:#fff;--sans:Arial}');
  const build = () => buildBlog({contentDir, outDir});
  const read = name => readFile(join(outDir, name), 'utf8');
  return {build, read, outDir};
}
const hrefs = (html, cls) => [...html.matchAll(new RegExp(`<a class="${cls}" href="([^"]+)"`, 'g'))].map(m => m[1]);

test('a manifest entry and a body produce the post page, the homepage entry and the Blog row', async () => {
  const s = await site([post('first')]);
  await s.build();
  const home = await s.read('index.html'), list = await s.read('blog.html'), page = await s.read('blog/first.html');
  assert.deepEqual(hrefs(home, 'ap-home-post'), ['/blog/first']);
  assert.match(home, /<a class="ap-home-post" href="\/blog\/first"><time datetime="2026-11-05">2026-11-05<\/time><h2>标题 first<\/h2><p>摘要 first<\/p><\/a>/);
  assert.match(home, /<a class="ap-link ap-home-blog-all" href="\/blog">全部文章<\/a>/);
  assert.deepEqual(hrefs(list, 'ap-post-link'), ['/blog/first']);
  assert.match(list, /<small><time datetime="2026-11-05">2026-11-05<\/time><\/small><div><h2>标题 first<\/h2><p>摘要 first<\/p><\/div>/);
  assert.match(page, /<h1>标题 first<\/h1>/);
  assert.match(page, /正文/);
  assert.match(page, /<a class="ap-link" href="\/blog">全部文章<\/a>/);
  assert.match(page, /<link rel="canonical" href="https:\/\/aloongplanet\.com\/blog\/first">/);
  assert.match(page, /<title>标题 first · Aloong Planet<\/title>/);
  assert.doesNotMatch(home, /blog:home/);
  assert.doesNotMatch(list, /blog:list/);
});

test('the homepage shows the newest 4 posts, or all of them when there are fewer', async () => {
  const many = await site([post('a', '2026-01-01'), post('b', '2026-05-01'), post('c', '2026-03-01'), post('d', '2026-04-01'), post('e', '2026-02-01')]);
  await many.build();
  assert.deepEqual(hrefs(await many.read('index.html'), 'ap-home-post'), ['/blog/b', '/blog/d', '/blog/c', '/blog/e']);
  const one = await site([post('only')]);
  await one.build();
  assert.deepEqual(hrefs(await one.read('index.html'), 'ap-home-post'), ['/blog/only']);
});

test('the Blog page lists every post newest first, and equal dates keep manifest order', async () => {
  const s = await site([post('old', '2026-01-01'), post('same-one', '2026-03-01'), post('same-two', '2026-03-01'), post('new', '2026-05-01'), post('mid', '2026-02-01')]);
  await s.build();
  assert.deepEqual(hrefs(await s.read('blog.html'), 'ap-post-link'), ['/blog/new', '/blog/same-one', '/blog/same-two', '/blog/mid', '/blog/old']);
});

test('titles and summaries are shown as text, never parsed as markup', async () => {
  const s = await site([post('x', '2026-11-05', {title: 'a<b>&"c', summary: 's<i>&"t'})]);
  await s.build();
  for (const name of ['index.html', 'blog.html']) {
    const html = await s.read(name);
    assert.match(html, /a&lt;b&gt;&amp;&quot;c/);
    assert.match(html, /s&lt;i&gt;&amp;&quot;t/);
    assert.doesNotMatch(html, /<b>|<i>/);
  }
  const page = await s.read('blog/x.html');
  assert.match(page, /<h1>a&lt;b&gt;&amp;&quot;c<\/h1>/);
  assert.match(page, /<title>a&lt;b&gt;&amp;&quot;c · Aloong Planet<\/title>/);
  assert.match(page, /content="s&lt;i&gt;&amp;&quot;t"/);
});

test('a post loads its own files only when it has them, and unlisted files are not deployed', async () => {
  const s = await site([post('with-files'), post('plain')], {files: {
    'with-files.css': '.post-with-files .fig-a{color:red}', 'with-files.js': 'console.log(1)',
    'stray.css': '.anything{color:red}', 'stray.js': 'x', 'stray.html': '<html>',
  }});
  await s.build();
  const rich = await s.read('blog/with-files.html'), plain = await s.read('blog/plain.html');
  assert.match(rich, /<link rel="stylesheet" href="\/blog\/with-files\.css">/);
  assert.match(rich, /<script src="\/blog\/with-files\.js" defer><\/script>/);
  assert.equal(await s.read('blog/with-files.css'), '.post-with-files .fig-a{color:red}');
  assert.equal(await s.read('blog/with-files.js'), 'console.log(1)');
  assert.doesNotMatch(plain, /\/blog\/plain\.(css|js)/);
  assert.equal(existsSync(join(s.outDir, 'blog/plain.css')), false);
  for (const name of ['stray.css', 'stray.js', 'stray.html']) assert.equal(existsSync(join(s.outDir, 'blog', name)), false);
});

test('every post gets the shared look and no remote stylesheet', async () => {
  const s = await site([post('x')]);
  await s.build();
  const page = await s.read('blog/x.html');
  const sheets = [...page.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(sheets, ['/site.css', '/article.css']);
  assert.match(page, /<script src="\/navigation\.js" defer><\/script>/);
  assert.match(page, /<script src="\/article\.js" defer><\/script>/);
  assert.match(page, /<div data-site-navigation><\/div>/);
  assert.match(page, /<main class="ap-article ap-article-page">/);
  assert.match(page, /class="ap-article-body post-x"/);
});

test('the contents come from the sections, with optional shorter labels', async () => {
  const s = await site([post('full'), post('flat')], {bodies: {
    full: `<div class="hero"><p class="lead">导语</p></div>
<section id="s2"><h2><span class="sec">§2</span>双层架构：把连续性拆开</h2><p>a</p></section>
<section id="proto"><h2>公开原型实现了多少</h2></section>
<section id="ideas" data-toc="借用的系统思想"><h2>每个设计借用的系统思想</h2></section>
<section id="noheading"><p>没有标题</p></section>
<section><h2>没有 id：不进目录</h2></section>
<footer class="foot">没有 id</footer>
<footer class="foot" id="plainfooter">不进目录</footer>
<section id='single'><h2>单引号标识</h2></section>
<section id=bare><h2>无引号标识</h2></section>
<section id="named" data-toc='单引号短名'><h2>很长的标题</h2></section>
<footer class="foot" id="sources" data-toc="来源">来源</footer>`,
    flat: '<p>只有段落</p>',
  }});
  await s.build();
  const nav = (await s.read('blog/full.html')).match(/<nav class="ap-toc"[\s\S]*?<\/nav>/)[0];
  const entries = [...nav.matchAll(/<a href="#([^"]+)">([^<]+)<\/a>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(entries, [['s2', '§2 双层架构'], ['proto', '公开原型实现了多少'], ['ideas', '借用的系统思想'], ['single', '单引号标识'], ['bare', '无引号标识'], ['named', '单引号短名'], ['sources', '来源']]);
  assert.doesNotMatch(await s.read('blog/flat.html'), /ap-toc/);
});

test('links to other sites open a new tab and every other link stays', async () => {
  const s = await site([post('x', '2026-11-05', {source: {label: '来源', url: 'https://example.com/source'}})], {bodies: {x: `
    <a href="https://github.com/a">other</a>
    <a class="c" href="http://example.org/b">other plain</a>
    <a href="#s2">section</a>
    <a href="/blog">site</a>
    <a href="https://aloongplanet.com/blog">own</a>
    <a href="https://www.aloongplanet.com/blog">own www</a>
    <a href="https://example.com/kept" target="_self">kept</a>
    <a href="https://example.com/rel" rel="author">rel</a>
    <a href='https://example.com/single'>single</a>
    <a href=https://example.com/bare>bare</a>
    <a href="//example.com/relative">relative</a>
    <a href="//aloongplanet.com/blog">own relative</a>`}});
  await s.build();
  const page = await s.read('blog/x.html');
  assert.match(page, /<a href="https:\/\/github\.com\/a" target="_blank" rel="noreferrer">other<\/a>/);
  assert.match(page, /<a class="c" href="http:\/\/example\.org\/b" target="_blank" rel="noreferrer">other plain<\/a>/);
  assert.match(page, /<a href="#s2">section<\/a>/);
  assert.match(page, /<a href="\/blog">site<\/a>/);
  assert.match(page, /<a href="https:\/\/aloongplanet\.com\/blog">own<\/a>/);
  assert.match(page, /<a href="https:\/\/www\.aloongplanet\.com\/blog">own www<\/a>/);
  assert.match(page, /<a href="https:\/\/example\.com\/kept" target="_self">kept<\/a>/);
  assert.match(page, /<a href="https:\/\/example\.com\/rel" rel="author" target="_blank">rel<\/a>/);
  assert.match(page, /<a href='https:\/\/example\.com\/single' target="_blank" rel="noreferrer">single<\/a>/);
  assert.match(page, /<a href=https:\/\/example\.com\/bare target="_blank" rel="noreferrer">bare<\/a>/);
  assert.match(page, /<a href="\/\/example\.com\/relative" target="_blank" rel="noreferrer">relative<\/a>/);
  assert.match(page, /<a href="\/\/aloongplanet\.com\/blog">own relative<\/a>/);
  assert.match(page, /<a href="https:\/\/example\.com\/source" target="_blank" rel="noreferrer">来源<\/a>/);
});

test('the byline names the author, the date and the explained article when there is one', async () => {
  const s = await site([post('explained', '2026-11-05', {source: {label: 'DeepSeek Harness 团队《Super-agent 设计探索》', url: 'https://example.com/a'}, note: '原文发表于 2026-10-31。'}), post('own', '2026-10-01')]);
  await s.build();
  const explained = await s.read('blog/explained.html'), own = await s.read('blog/own.html');
  assert.match(explained, /<p class="ap-byline"><b>Aloong<\/b> · <time datetime="2026-11-05">2026-11-05<\/time> · 解读 <a href="https:\/\/example\.com\/a" target="_blank" rel="noreferrer">DeepSeek Harness 团队《Super-agent 设计探索》<\/a><\/p>/);
  assert.match(explained, /<p class="ap-source-note">原文发表于 2026-10-31。<\/p>/);
  assert.match(own, /<p class="ap-byline"><b>Aloong<\/b> · <time datetime="2026-10-01">2026-10-01<\/time><\/p>/);
  assert.doesNotMatch(own, /ap-source-note/);
});

test('the build refuses a body that is a whole page or brings its own resources', async () => {
  for (const [bad, reason] of [
    ['<!doctype html><p>x</p>', /doctype|whole page/i], ['<html><p>x</p></html>', /<html>/], ['<head></head>', /<head>/], ['<body></body>', /<body>/],
    ['<meta charset="utf8">', /<meta>/], ['<link rel="stylesheet" href="/a.css">', /<link>/], ['<style>p{color:red}</style>', /<style>/],
    ['<script src="/a.js"></script>', /<script>/], ['<title>页面</title>', /<title>/], ['<h1>标题</h1>', /<h1>/],
    ['<svg><style>.a{}</style></svg>', /<style>/],
  ]) {
    const s = await site([post('bad')], {bodies: {bad}});
    await assert.rejects(s.build(), e => /"bad"/.test(e.message) && reason.test(e.message), bad);
  }
});

test('real article body shapes are not mistaken for a whole page', async () => {
  const s = await site([post('fine')], {bodies: {fine: `<header class="hero"><p class="lead">导语</p></header>
<!-- <link> mentioned in a comment -->
<svg viewBox="0 0 1 1" style="min-width:880px" role="img"><title>图</title><defs><marker id="m"><path d="M0 0"/></marker></defs><linearGradient id="g"/></svg>
<p>写作 &lt;style&gt; 不是标记</p>`}});
  await s.build();
  assert.match(await s.read('blog/fine.html'), /<title>图<\/title>/);
});

test('the build refuses a post stylesheet that would break the shared look', async () => {
  for (const [css, reason] of [
    ['@import url("/a.css");', /@import/],
    ['@font-face{font-family:X;src:url(/x.woff2)}', /@font-face/],
    ['.post-bad .a{background:url(https://example.com/a.png)}', /remote/],
    ['.post-bad .a{background:url(//example.com/a.png)}', /remote/],
    ['@media (prefers-color-scheme:dark){.post-bad .a{color:red}}', /dark/],
    ['.post-bad .a[data-theme="dark"]{color:red}', /dark/],
    ['.a{color:red}', /scoped/],
    ['body{margin:0}', /scoped/],
    [':root{--x:1}', /scoped/],
    ['.post-badness .a{color:red}', /scoped/],
    ['.post-bad .a,.b{color:red}', /scoped/],
    ['@media (max-width:600px){.a{color:red}}', /scoped/],
    ['.post-bad ~ .ap-article-back{color:red}', /scoped/],
    ['.post-bad + p{color:red}', /scoped/],
    ['.post-bad:hover ~ .a{color:red}', /scoped/],
    ['.post-bad.b + p{color:red}', /scoped/],
    ['.post-bad p{color:red}', /base element/],
    ['.post-bad section p{color:red}', /base element/],
    ['.post-bad > h2{color:red}', /base element/],
    ['.post-bad a:hover{color:red}', /base element/],
    ['.post-bad *{color:red}', /base element/],
    ['.post-bad:hover p{color:red}', /base element/],
    ['.post-bad{color:red}', /custom properties/],
    ['.post-bad:hover{color:red}', /custom properties/],
    ['.post-bad.b{color:red}', /custom properties/],
    ['.post-bad{--ink:red}', /shared token/],
    ['.post-bad .a{--panel:red}', /shared token/],
    ['.post-bad .a{font-family:Georgia}', /font/],
    ['.post-bad .a{font:500 13px Georgia}', /font/],
  ]) {
    const s = await site([post('bad')], {files: {'bad.css': css}});
    await assert.rejects(s.build(), e => /"bad"/.test(e.message) && reason.test(e.message), css);
  }
});

test('real article stylesheet shapes pass the check', async () => {
  const s = await site([post('fine')], {files: {'fine.css': `/* comment with body{} and @import */
.post-fine{--fast:#007A87;--c-fill:#fff}
.post-fine .seg button[aria-pressed="true"],.post-fine .next:hover{background:var(--ink);font:500 13.5px/1.3 var(--sans)}
.post-fine #map .node>rect:first-child{fill:var(--c-fill)}
.post-fine .edge:not(.fast):not(.slow) path.ar{marker-end:url(#a-edge)}
.post-fine dl.mech dt{font:600 13px/1.75 var(--mono)}
.post-fine .steps button{all:unset;font:inherit}
.post-fine .tri p{font-size:13.5px}
.post-fine .a{font-family:var(--mono);background:url("data:image/png;base64,AAA=")}
@keyframes march{to{stroke-dashoffset:-15}}
@media (max-width:760px){.post-fine .traits{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (prefers-reduced-motion:reduce){.post-fine .edge{transition:none}}`}});
  await s.build();
  assert.match(await s.read('blog/fine.html'), /\/blog\/fine\.css/);
});

test('the build refuses a bad manifest', async () => {
  for (const [posts, reason] of [
    [[], /no posts/i],
    [{}, /no posts|list/i],
    [[{date: '2026-11-05', title: 't', summary: 's'}], /slug/],
    [[post('Bad_Slug')], /slug/],
    [[post('-edge')], /slug/],
    [[post('x', '2026-02-30')], /date/],
    [[post('x', '2026/11/05')], /date/],
    [[{...post('x'), title: ''}], /title/],
    [[{...post('x'), summary: '  '}], /summary/],
    [[{...post('x'), title: 5}], /title/],
    [[post('x'), post('x')], /duplicate/i],
    [[post('x', '2026-11-05', {source: {label: 'a'}})], /source/],
    [[post('x', '2026-11-05', {source: {label: 'a', url: 'javascript:alert(1)'}})], /source/],
  ]) {
    const s = await site(posts);
    await assert.rejects(s.build(), reason, JSON.stringify(posts));
  }
  const missing = await site([post('gone')], {bodies: {gone: null}});
  await assert.rejects(missing.build(), /"gone".*body|body.*"gone"/);
});

test('a template without its slot stops the build instead of dropping the list', async () => {
  await assert.rejects((await site([post('x')], {home: '<main></main>'})).build(), /index\.html/);
  await assert.rejects((await site([post('x')], {list: '<main></main>'})).build(), /blog\.html/);
});

test('deployment checks tell every blog page from the homepage the host serves for unknown addresses', async () => {
  const s = await site([post('a'), post('b')], {home: '<main><!-- blog:home --></main>'});
  await s.build();
  const checks = blogChecks([post('a'), post('b')]);
  const homepage = await s.read('index.html');
  for (const {path, contains} of checks) if (path !== '/') assert.equal(homepage.includes(contains), false, path);
  const served = {'/': 'index.html', '/blog': 'blog.html', '/blog/a': 'blog/a.html', '/blog/b': 'blog/b.html'};
  assert.deepEqual([...new Set(checks.map(check => check.path))], ['/', '/article.css', '/article.js', '/blog', '/blog/a', '/blog/b']);
  for (const {path, contains} of checks) if (served[path]) assert.ok((await s.read(served[path])).includes(contains), path);
});
