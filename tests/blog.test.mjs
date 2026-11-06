// These have no DOM here and are checked by recorded real-browser runs, because the project has no browser test suite:
// layout, type sizes, centering, shared table and figure styles, hover states, the keyboard focus ring,
// jumps and scrolling including figure and contents-column scrolling, the homepage's kept smooth scroll,
// the contents mark, interactive figures, scripting unavailable, a throwing post script, long text in full
// on the Blog page, and fonts requested. Test them here once the browser suite capability is enabled.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createServer} from 'node:http';
import {appendFile, cp, mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildBlog, blogChecks, readManifest} from '../scripts/blog.mjs';
import {pageImages, motionSheets} from '../scripts/image-checks.mjs';

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
const repo = fileURLToPath(new URL('..', import.meta.url));
let builtRealSite;
/** The repository's own templates, shared files and posts, built once for tests that only read it. */
const realSite = () => builtRealSite ??= (async () => {
  const outDir = join(await mkdtemp(join(tmpdir(), 'blog-real-')), 'out');
  await cp(join(repo, 'public'), outDir, {recursive: true});
  await buildBlog({contentDir: join(repo, 'content'), outDir});
  return outDir;
})();
/** The file a public path serves in a built site. */
const servedFile = path => ({'/': 'index.html', '/blog': 'blog.html'})[path] ?? (extname(path) ? path.slice(1) : `${path.slice(1)}.html`);
/** Runs a repository script as a process in the given folder; it never rejects, so callers read the exit code. */
const runScript = (script, cwd, env = {}) => new Promise(resolve => {
  execFile(process.execPath, [join(repo, 'scripts', script)], {cwd, env: {...process.env, ...env}}, (error, stdout, stderr) => resolve({code: error ? error.code : 0, stdout, stderr}));
});
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
  const s = await site([post('old', '2026-01-01'), post('same-two', '2026-03-01'), post('same-one', '2026-03-01'), post('new', '2026-05-01'), post('mid', '2026-02-01')]);
  await s.build();
  assert.deepEqual(hrefs(await s.read('blog.html'), 'ap-post-link'), ['/blog/new', '/blog/same-two', '/blog/same-one', '/blog/mid', '/blog/old']);
});

test('titles and summaries are shown as text, never parsed as markup', async () => {
  const s = await site([post('x', '2026-11-05', {title: 'a<b>&"c $& end', summary: "s<i>&\"t $' end"})]);
  await s.build();
  for (const name of ['index.html', 'blog.html']) {
    const html = await s.read(name);
    assert.ok(html.includes('a&lt;b&gt;&amp;&quot;c $&amp; end'), name);
    assert.ok(html.includes("s&lt;i&gt;&amp;&quot;t $' end"), name);
    assert.doesNotMatch(html, /<b>|<i>|blog:(home|list)/);
  }
  const page = await s.read('blog/x.html');
  assert.ok(page.includes('<h1>a&lt;b&gt;&amp;&quot;c $&amp; end</h1>'));
  assert.ok(page.includes('<title>a&lt;b&gt;&amp;&quot;c $&amp; end · Aloong Planet</title>'));
  assert.ok(page.includes(`content="s&lt;i&gt;&amp;&quot;t $' end"`));
});

test('a post loads its own files only when it has them, and unlisted files are not deployed', async () => {
  const s = await site([post('with-files'), post('plain')], {files: {
    'with-files.css': '.post-with-files .fig-a{color:red}', 'with-files.js': 'console.log(1)',
    'stray.css': '.anything{color:red}', 'stray.js': 'x', 'stray.html': '<html>',
  }});
  await s.build();
  const rich = await s.read('blog/with-files.html'), plain = await s.read('blog/plain.html');
  assert.deepEqual([...rich.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]), ['/site.css', '/article.css', '/blog/with-files.css']);
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
<section data-id="wrong" id="right"><h2>相近的属性</h2></section>
<footer class="foot" id="sources" data-toc="来源">来源</footer>`,
    flat: '<p>只有段落</p>',
  }});
  await s.build();
  const nav = (await s.read('blog/full.html')).match(/<nav class="ap-toc"[\s\S]*?<\/nav>/)[0];
  const entries = [...nav.matchAll(/<a href="#([^"]+)">([^<]+)<\/a>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(entries, [['s2', '§2 双层架构'], ['proto', '公开原型实现了多少'], ['ideas', '借用的系统思想'], ['single', '单引号标识'], ['bare', '无引号标识'], ['named', '单引号短名'], ['right', '相近的属性'], ['sources', '来源']]);
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
    <a href="//aloongplanet.com/blog">own relative</a>
    <a href="https://aloongplanet.com.example.org/x">lookalike</a>
    <a data-href="https://example.com/y" href="/blog">near attribute</a>`}});
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
  assert.match(page, /<a href="https:\/\/aloongplanet\.com\.example\.org\/x" target="_blank" rel="noreferrer">lookalike<\/a>/);
  assert.match(page, /<a data-href="https:\/\/example\.com\/y" href="\/blog">near attribute<\/a>/);
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
  const wrong = [];
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
    ['.post-bad a[href]{color:red}', /base element/],
    ['.post-bad p[class]{color:red}', /base element/],
    ['.post-bad :is(p,h2){color:red}', /:is\(\)/],
    ['.post-bad > :where(p){color:red}', /:is\(\)/],
    ['.post-bad :is(.a,p){color:red}', /:is\(\)/],
    ['.post-bad :where(.a,p){color:red}', /:is\(\)/],
    ['.post-bad > :is(p,.a){color:red}', /:is\(\)/],
    ['.post-bad p:not(:is(:where(.a))){color:red}', /:is\(\)/],
    ['.post-bad p:not(:not(:not(.a))){color:red}', /base element/],
    ['.post-bad .a{p{color:red}}', /nest/],
    ['.post-bad .a{p{font-family:Georgia}}', /nest/],
    ['@property --ink{syntax:"<color>";inherits:false;initial-value:red}', /at-rule/],
    ['@page{margin:0}', /at-rule/],
    ['@layer x{.post-bad .a{color:red}}', /at-rule/],
    ['.post-bad .a{color-scheme:dark}', /dark/],
    ['.post-bad .a{color:light-dark(#000,#fff)}', /dark/],
    ['.post-bad .a{background:image-set("https://example.com/a.png" 1x)}', /remote/],
    ['.post-bad .a{background:image-set("a.png" 1x,"https://example.com/a.png" 2x)}', /remote/],
    ['.post-bad .a{background:image-set("a.png" 1x,"//example.com/a.png" 2x)}', /remote/],
    ['.post-bad .a{background:-webkit-image-set("a.png" 1x,"https://example.com/a.png" 2x)}', /remote/],
    ['.post-bad .a{background:image-set(url("a.png") 1x,"https://example.com/a.png" 2x)}', /remote/],
    ['@keyframes f{to{font-family:Georgia}}.post-bad .a{animation:f 1s forwards}', /font/],
    ['@keyframes f{to{font:500 13px Georgia}}.post-bad .a{animation:f 1s forwards}', /font/],
    ['@keyframes g{to{--sans:Georgia}}.post-bad .b{animation:g 1s forwards}', /shared token/],
    ['@keyframes g{to{--ink:red}}.post-bad .b{animation:g 1s forwards}', /shared token/],
    ['@media (min-width:1px){@keyframes f{to{font-family:Georgia}}}', /font/],
    ['.post-bad p:not(.a:not(.b)){color:red}', /base element/],
    ['.post-bad li:has(.a:nth-child(2)){color:red}', /base element/],
    ['.post-bad .a::before{content:"{"}body{color:red}', /scoped/],
    ['.post-bad .a{font-family:Georgia var(--sans)}', /font/],
    ['.post-bad .a{font:500 13px Georgia var(--sans)}', /font/],
    ['.post-bad p:not(.a){color:red}', /base element/],
    ['.post-bad p:NOT(.a){color:red}', /base element/],
    ['.post-bad p:has(.a){color:red}', /base element/],
    ['.post-bad a[href=".x"]{color:red}', /base element/],
    ['.post-bad{color:red}', /custom properties/],
    ['.post-bad:hover{color:red}', /custom properties/],
    ['.post-bad.b{color:red}', /custom properties/],
    ['.post-bad{--ink:red}', /shared token/],
    ['.post-bad .a{--panel:red}', /shared token/],
    ['.post-bad .a{font-family:Georgia}', /font/],
    ['.post-bad .a{font:500 13px Georgia}', /font/],
    ['.post-bad .a{font-family:"Playfair Display",var(--sans)}', /font/],
    ['.post-bad .a{font:500 13px Georgia,var(--sans)}', /font/],
    ['.post-bad .a{font:500 13px Georgia, var(--sans)}', /font/],
    ['.post-bad .a{FONT-FAMILY:Georgia}', /font/i],
  ]) {
    const s = await site([post('bad')], {files: {'bad.css': css}});
    const message = await s.build().then(() => 'accepted', e => e.message);
    if (!/"bad"/.test(message) || !reason.test(message)) wrong.push(`${css} -> ${message}`);
  }
  assert.deepEqual(wrong, []);
});

test('real article stylesheet shapes pass the check', async () => {
  const s = await site([post('fine')], {files: {'fine.css': `/* comment with body{} and @import */
.post-fine .imp{font-family:var(--sans)!important}
.post-fine p.own:not(.other){color:red}
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
@supports (display:grid){.post-fine .grid{display:grid}}
.post-fine .f1{font:500 12pt var(--sans)}
.post-fine .f2{font:500 1.5vw var(--sans)}
.post-fine .f3{font:500 calc(1em + 1px) var(--sans)}
.post-fine .f4{font:small var(--sans)}
.post-fine .f5{font:500 13px/normal var(--sans)}
.post-fine .f6{font:condensed 13px var(--mono)}
.post-fine .f7{font:500 clamp(12px,2vw,14px)/1.5 var(--sans)}
.post-fine .f8{font-family:inherit}
.post-fine .f9{font:500 13px var(--sans)!important}
.post-fine .brace::before{content:"{"}
.post-fine .color-scheme-demo{color:red}
.post-fine .data-theme-demo{color:red}
.post-fine .prefers-color-scheme-demo{color:red}
.post-fine .i1{background:image-set("a.png" 1x,"b.png" 2x)}
.post-fine .i2{background:image-set("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" 1x)}
.post-fine .i3{mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E")}
@container (min-width:1px){.post-fine .wide{color:red}}
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
    [[post('x', '2026-13-01')], /"x".*date/],
    [[{...post('x'), title: ''}], /title/],
    [[{...post('x'), summary: '  '}], /summary/],
    [[{...post('x'), title: 5}], /title/],
    [[post('x'), post('x')], /duplicate/i],
    [[post('x', '2026-11-05', {source: {label: 'a'}})], /source/],
    [[post('x', '2026-11-05', {source: {label: '', url: 'https://example.com/a'}})], /source/],
    [[post('x', '2026-11-05', {note: '  '})], /note/],
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

test('deployment checks tell every blog page of the real site from the homepage and from the not-found page', async () => {
  const outDir = await realSite();
  const posts = await readManifest(join(repo, 'content'));
  assert.ok(posts.length > 0);
  const checks = blogChecks(posts);
  assert.deepEqual([...new Set(checks.map(check => check.path))], ['/', '/article.css', '/article.js', '/blog', ...posts.map(p => `/blog/${p.slug}`)]);
  const homepage = await readFile(join(outDir, 'index.html'), 'utf8');
  const notFound = await readFile(join(outDir, '404.html'), 'utf8');
  for (const {path, contains} of checks) {
    assert.ok((await readFile(join(outDir, servedFile(path)), 'utf8')).includes(contains), `${path} serves ${contains}`);
    if (path !== '/') assert.equal(homepage.includes(contains), false, `the homepage satisfies ${path}`);
    assert.equal(notFound.includes(contains), false, `the not-found page satisfies ${path}`);
  }
  const list = await readFile(join(outDir, 'blog.html'), 'utf8');
  assert.doesNotMatch(list, /排版示例/);
  assert.equal([...list.matchAll(/<article class="ap-post"/g)].length, posts.length);
  assert.deepEqual([...homepage.matchAll(/<(h[1-6])\b/g)].map(m => m[1]).slice(0, 2), ['h1', 'h2']);
});

test('the build script writes the blog and ships every image the homepage and the not-found page show, and a refused post stops it', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'blog-build-'));
  for (const folder of ['public', 'assets', 'content']) await cp(join(repo, folder), join(cwd, folder), {recursive: true});
  const [{slug}] = await readManifest(join(repo, 'content'));
  const built = await runScript('build.mjs', cwd);
  assert.match(built.stdout, /Built homepage/);
  assert.match(await readFile(join(cwd, 'dist/blog', `${slug}.html`), 'utf8'), new RegExp(`post-${slug}"`));
  const home = await readFile(join(cwd, 'dist/index.html'), 'utf8');
  assert.ok(home.includes(`href="/blog/${slug}"`));
  assert.doesNotMatch(home, /blog:home/);
  const notFound = await readFile(join(cwd, 'dist/404.html'), 'utf8');
  const images = [...pageImages(home), ...motionSheets(await readFile(join(cwd, 'dist/assets/golden-interaction.js'), 'utf8')), ...pageImages(notFound)];
  assert.ok(images.length > 0);
  for (const image of images) assert.ok(existsSync(join(cwd, 'dist', image)), `the build does not ship ${image}`);
  await appendFile(join(cwd, 'content/posts', `${slug}.css`), '@font-face{font-family:X}');
  const refused = await runScript('build.mjs', cwd);
  assert.notEqual(refused.code, 0);
  assert.ok(refused.stderr.includes(`Blog post "${slug}"`) && refused.stderr.includes('@font-face'), refused.stderr);
  assert.doesNotMatch(refused.stdout, /Built homepage/);
});

const CONTENT_TYPES = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'};
/**
 * Serves a built site the way the host does: an address the site does not have gets the not-found page with status 404,
 * and every file carries the content type of its extension. Images come from the repository's assets folder, where the
 * build copies them from. With `fallback` set to 'homepage' it answers such addresses as a host without the not-found
 * page does: with the homepage and status 200.
 */
async function startHost(outDir) {
  const host = {missing: new Set(), fallback: 'not-found'};
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://host').pathname;
    if (path === '/deployment.json') return response.end('{"revision":"abc"}');
    if (path === '/api/visitor') {
      response.writeHead(request.method === 'POST' ? 428 : 200, {'cache-control': 'no-store', 'set-cookie': 'visitor=1'});
      return response.end('{"ready":true}');
    }
    const wanted = host.missing.has(path) ? null : servedFile(path);
    const found = wanted && await readFile(join(wanted.startsWith('assets/') ? repo : outDir, wanted)).then(body => [wanted, body, 200], () => null);
    const [fallbackFile, fallbackStatus] = host.fallback === 'homepage' ? ['index.html', 200] : ['404.html', 404];
    const [file, body, status] = found || [fallbackFile, await readFile(join(outDir, fallbackFile)), fallbackStatus];
    response.writeHead(status, {'content-type': CONTENT_TYPES[extname(file)]});
    response.end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return Object.assign(host, {server, origin: `http://127.0.0.1:${server.address().port}`});
}

test('the deployment-check script passes on the whole site and fails when a host answers a blog page, an image, the dog script or a missing address wrongly', async () => {
  const outDir = await realSite();
  const hosts = [await startHost(outDir), await startHost(outDir)];
  try {
    const cwd = await mkdtemp(join(tmpdir(), 'blog-smoke-'));
    await mkdir(join(cwd, 'dist'));
    await writeFile(join(cwd, 'dist/deployment.json'), '{"revision":"abc"}');
    await cp(join(outDir, '404.html'), join(cwd, 'dist/404.html'));
    await writeFile(join(cwd, 'deployment.config.json'), JSON.stringify({origins: hosts.map(host => host.origin)}));
    await cp(join(repo, 'content'), join(cwd, 'content'), {recursive: true});
    const whole = await runScript('smoke.mjs', cwd);
    assert.equal(whole.code, 0, whole.stderr);
    assert.match(whole.stdout, /Verified revision abc/);
    /** Changes one host, expects the check to fail with a message naming that host, then restores the host. */
    const failsOn = async (host, change, message) => {
      change(host);
      const run = await runScript('smoke.mjs', cwd, {SMOKE_DEADLINE_MS: '1'});
      host.missing.clear();
      host.fallback = 'not-found';
      assert.equal(run.code, 1, run.stdout);
      assert.match(run.stderr, new RegExp(host.origin.replaceAll('.', '\\.') + message), run.stderr);
    };
    const missing = path => host => host.missing.add(path);
    await failsOn(hosts[1], missing('/blog'), '/blog answered 404');
    await failsOn(hosts[0], missing('/blog'), '/blog answered 404');
    await failsOn(hosts[1], missing('/assets/apps/agentshed-main-90days.png'), '/assets/apps/agentshed-main-90days\\.png answered 404');
    await failsOn(hosts[1], missing('/assets/golden-wag/motion-2.webp'), '/assets/golden-wag/motion-2\\.webp answered 404');
    await failsOn(hosts[1], missing('/assets/golden-interaction.js'), '/assets/golden-interaction\\.js is not a script');
    await failsOn(hosts[1], missing('/assets/not-found/puzzled-dog.webp'), '/assets/not-found/puzzled-dog\\.webp answered 404');
    await failsOn(hosts[1], host => { host.fallback = 'homepage'; }, '/\\S+ is not the not-found page');
    await failsOn(hosts[1], host => { host.fallback = 'homepage'; host.missing.add('/assets/golden-wag/motion-2.webp'); }, '/assets/golden-wag/motion-2\\.webp is not an image');
  } finally {
    for (const host of hosts) host.server.close();
  }
});
