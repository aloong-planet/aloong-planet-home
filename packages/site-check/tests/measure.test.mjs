// Measuring a built site in a real browser: app-sites::QR-001/AC-01. These cases run the check on small built sites
// made for the purpose and read what it says, so each one is a way the check could pass a page it should not, or
// fail one it should not.
//
// Not covered here, because this server cannot produce it: a page answered with a success other than 200. The page's
// own status is judged by the same rule as every other answer from the local server (a status of 400 or more fails
// the page), and the server answers a page with 200 or 404 only.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'
import { measureSite } from '../src/measure.mjs'
import { WIDTHS } from '../src/widths.mjs'
import { tree } from './helpers/tree.mjs'

let browser
before(async () => {
  browser = await chromium.launch()
})
after(() => browser.close())

const config = { origin: 'https://example.com', fixtures: [], linkExceptions: [] }
const page = (head, body) => `<!doctype html><html><head><meta charset="utf-8"><title>t</title>${head}</head><body>${body}</body></html>`

async function measure(t, files, { widths = [320, 400, 1440], site = config } = {}) {
  const dist = await tree(t, files)
  return measureSite({ browser, dist, config: site, widths })
}

test('a page that fits at every width passes, and every width asked for was measured', async (t) => {
  const { pages } = await measure(t, { 'index.html': page('<style>body{margin:0}</style>', '<p>hello</p>') })
  assert.equal(pages.length, 1)
  assert.equal(pages[0].url, '/')
  assert.equal(pages[0].measured, 3)
  assert.deepEqual(pages[0].violations, [])
  assert.deepEqual(pages[0].problems, [])
})

test('every page found in the build is measured, the 404 page and nested ones included', async (t) => {
  const html = page('', '<p>x</p>')
  const { pages } = await measure(t, { 'index.html': html, '404.html': html, 'blog/index.html': html, 'blog/a.html': html })
  assert.deepEqual(pages.map((p) => p.url), ['/', '/404', '/blog/', '/blog/a'])
  assert.ok(pages.every((p) => p.measured === 3))
})

// A box 500px wide in a page with no margin overflows every window narrower than 500px. The three ways it can sit in
// the page are the three ways the page's width can be hidden from one reading of it.
const shapes = [
  ['a plain child', '<style>body{margin:0}</style>', '<div style="width:500px">x</div>', 500],
  ['a menu that is hidden but still takes room', '<style>body{margin:0}</style>', '<div style="position:absolute;left:0;top:0;width:500px;visibility:hidden">menu</div><p>x</p>', 500],
  ['a child while html and body clip sideways scrolling', '<style>html,body{margin:0;overflow-x:hidden}</style>', '<div style="width:500px">x</div>', 500],
]
for (const [name, head, body, boxWidth] of shapes) {
  test(`${name} wider than the window fails exactly the windows it is wider than`, async (t) => {
    const widths = [320, 400, 499, 500, 600]
    const { pages } = await measure(t, { 'index.html': page(head, body) }, { widths })
    assert.equal(boxWidth, 500)
    assert.deepEqual(pages[0].violations.map((v) => v.width), [320, 400, 499])
    assert.match(pages[0].violations[0].problem, /500px wide in a 320px window/)
  })
}

test('a box that is too wide only between 600px and 699px fails exactly those windows, which a sample of widths would miss', async (t) => {
  const head = '<style>body{margin:0}.box{width:300px}@media (min-width:600px){.box{width:700px}}@media (min-width:700px){.box{width:300px}}</style>'
  const { pages } = await measure(t, { 'index.html': page(head, '<div class="box">x</div>') }, { widths: WIDTHS })
  const failing = pages[0].violations.map((v) => v.width)
  assert.equal(pages[0].measured, 1121)
  assert.equal(failing.length, 100)
  assert.equal(failing[0], 600)
  assert.equal(failing[99], 699)
  assert.ok(failing.every((w, i) => i === 0 || w === failing[i - 1] + 1))
})

const blocked = [
  ['a stylesheet', '<link rel="stylesheet" href="https://cdn.example.net/site.css">', /stylesheet.*https:\/\/cdn\.example\.net\/site\.css/],
  ['an image', '', /image.*https:\/\/img\.example\.net\/a\.png/, '<img src="https://img.example.net/a.png">'],
  ['a font', '<style>@font-face{font-family:Fancy;src:url(https://fonts.example.net/f.woff2) format("woff2")}body{font-family:Fancy,sans-serif}</style>', /font.*https:\/\/fonts\.example\.net\/f\.woff2/],
  ['a video', '', /media.*https:\/\/video\.example\.net\/v\.mp4/, '<video src="https://video.example.net/v.mp4" preload="auto"></video>'],
]
for (const [name, head, expected, body = ''] of blocked) {
  test(`${name} from another origin fails the page and names it, because the page was measured without it`, async (t) => {
    const { pages } = await measure(t, { 'index.html': page(head, `<p>x</p>${body}`) })
    assert.equal(pages[0].problems.length, 1)
    assert.match(pages[0].problems[0], expected)
  })
}

test('a script from another origin is blocked without failing the page, and is listed', async (t) => {
  const { pages } = await measure(t, { 'index.html': page('<script src="https://cdn.example.net/a.js"></script>', '<p>x</p>') })
  assert.deepEqual(pages[0].problems, [])
  assert.deepEqual(pages[0].blocked, [{ url: 'https://cdn.example.net/a.js', type: 'script' }])
})

const missing = [
  ['an image of its own site that is not built', '<img src="/missing.png" width="10" height="10">', /\/missing\.png.*404/],
  ['a stylesheet of its own site that is not built', '', /\/missing\.css.*404/, '<link rel="stylesheet" href="/missing.css">'],
]
for (const [name, body, expected, head = ''] of missing) {
  test(`${name} fails the page`, async (t) => {
    const { pages } = await measure(t, { 'index.html': page(head, `<p>x</p>${body}`) })
    assert.equal(pages[0].problems.length, 1)
    assert.match(pages[0].problems[0], expected)
  })
}

test('a page with no visible text fails, so a blank page is not a page that fits', async (t) => {
  const { pages } = await measure(t, { 'index.html': page('', '') })
  assert.equal(pages[0].problems.length, 1)
  assert.match(pages[0].problems[0], /no visible text/)
})

// A script that stops with an error leaves the page as it was at that moment (a header that is built by the script is not
// there), which is not the page a visitor gets, so the width read from it says nothing.
const errors = [
  ['a script that throws', '<script>throw new Error("boom from the page")</script>'],
  ['a promise that is rejected and never handled', '<script>Promise.reject(new Error("boom from the page"))</script>'],
]
for (const [name, script] of errors) {
  test(`${name} fails the page and says what it threw`, async (t) => {
    const { pages } = await measure(t, { 'index.html': page('', `<p>x</p>${script}`) })
    assert.equal(pages[0].problems.length, 1)
    assert.match(pages[0].problems[0], /boom from the page/)
  })
}

// A page that writes a long number into a line that cannot wrap, after asking its own backend for it.
const counter = page('<style>body{margin:0}#n{white-space:nowrap}</style>', '<p id="n">…</p><script>fetch("/api/visitor").then((r) => r.json()).then((d) => { document.getElementById("n").textContent = d.total })</script>')
const huge = '9'.repeat(200)

test('a request to the site\'s own backend is answered from the site\'s fixture, and the page is measured with the answer in it', async (t) => {
  const site = { ...config, fixtures: [{ path: '/api/visitor', json: { total: huge } }] }
  const { pages } = await measure(t, { 'index.html': counter }, { site })
  assert.deepEqual(pages[0].problems, [])
  assert.ok(pages[0].violations.some((v) => v.width === 320))
})

// The page's own script then fails on the answer it got, and that is reported as well, so the 404 is looked for among
// the problems instead of being taken to be the only one.
test('without a fixture the same request fails the page instead of being passed over', async (t) => {
  const { pages } = await measure(t, { 'index.html': counter })
  assert.ok(pages[0].problems.length >= 1)
  assert.ok(pages[0].problems.some((problem) => /\/api\/visitor.*404/.test(problem)), pages[0].problems.join('\n'))
})

// A link inside the site is held to land on a built page or file; the page is read after its scripts ran, so links they
// make count.
const links = [
  ['a link to a page that is not built', '<a href="/nope">x</a>', config, /link to \/nope/],
  ['a link made by a script to a page that is not built', '<script>document.body.append(Object.assign(document.createElement("a"), { href: "/gone", textContent: "y" }))</script>', config, /link to \/gone/],
  ['a link to the own domain, written out, to a page that is not built', '<a href="https://example.com/missing?x=1#top">x</a>', config, /link to \/missing/],
  ['a link to a page that is not built, which the site lists as an exception', '<a href="/go">x</a>', { ...config, linkExceptions: [{ path: '/go', reason: 'rewrite rule' }] }, null],
  ['a link to a built page', '<a href="/about">x</a><a href="/about#team">y</a><a href="about">z</a>', config, null],
  ['a link inside the same page', '<a href="#top">x</a>', config, null],
  ['links to other sites and a mail link', '<a href="https://github.com/aloong-planet">x</a><a href="mailto:hi@example.com">y</a><a href="https://app.example.com/">z</a>', config, null],
]
for (const [name, body, site, expected] of links) {
  test(`${name} ${expected ? 'fails the page' : 'passes'}`, async (t) => {
    const { pages } = await measure(t, { 'index.html': page('', `<p>x</p>${body}`), 'about.html': page('', '<p>about</p>') }, { site })
    const home = pages.find((p) => p.url === '/')
    if (expected) {
      assert.equal(home.problems.length, 1)
      assert.match(home.problems[0], expected)
    } else {
      assert.deepEqual(home.problems, [])
    }
  })
}

test('the same missing link written twice is reported once', async (t) => {
  const { pages } = await measure(t, { 'index.html': page('', '<p>x</p><a href="/nope">a</a><a href="/nope">b</a>') })
  assert.equal(pages[0].problems.length, 1)
})

// An image marked loading="lazy" is fetched only once it is near the window, and a visitor scrolls to it, so one that
// is far below the first screen has to take its room in the measurement too. This one is 2000px wide and has no width
// attribute, so it makes the page 2000px wide.
const wideImage = '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="10"><rect width="2000" height="10"/></svg>'

test('a wide image that loads lazily, far below the first screen, is measured: the windows narrower than it fail', async (t) => {
  const body = '<div style="height:6000px">x</div><img loading="lazy" src="/wide.svg" alt="">'
  const { pages } = await measure(t, { 'index.html': page('<style>body{margin:0}</style>', body), 'wide.svg': wideImage }, { widths: [320, 1000, 2000, 2100] })
  assert.deepEqual(pages[0].problems, [])
  assert.deepEqual(pages[0].violations.map((v) => v.width), [320, 1000])
})

test('a lazy image that fails to load fails the page and does not hold the measuring up', { timeout: 60_000 }, async (t) => {
  const { pages } = await measure(t, { 'index.html': page('', '<div style="height:6000px">x</div><img loading="lazy" src="/gone.svg" alt="" width="10" height="10">') })
  assert.equal(pages[0].problems.length, 1)
  assert.match(pages[0].problems[0], /\/gone\.svg.*404/)
})

// The measuring serves the build on a port of its own. When the browser goes away while a page is being measured, the
// measuring fails, and the port is let go: a server left listening keeps the process alive, so the run would hang for the
// time limit of its job instead of failing. The listening servers are counted from the process's own resource list.
test('a browser that is closed in the middle of the measuring fails it and leaves no server listening', async (t) => {
  const own = await chromium.launch()
  t.after(() => own.close())
  const dist = await tree(t, { 'index.html': page('', '<p>x</p>') })
  const listening = () => process.getActiveResourcesInfo().filter((resource) => resource === 'TCPServerWrap').length
  const before = listening()
  const measuring = measureSite({ browser: own, dist, config, widths: WIDTHS }).then(() => null, (error) => error)
  await delay(1000)
  assert.equal(listening(), before + 1, 'the measuring has not started its server')
  await own.close()
  assert.ok(await measuring, 'the measuring did not fail')
  assert.equal(listening(), before)
})

test('a page that changes itself when the window is resized is measured after it has changed', async (t) => {
  const script = '<script>addEventListener("resize", () => { document.getElementById("box").style.width = innerWidth < 600 ? "700px" : "100px" })</script>'
  const html = page('<style>body{margin:0}</style>', `<div id="box" style="width:100px">x</div>${script}`)
  const { pages } = await measure(t, { 'index.html': html }, { widths: [1440, 700, 599, 320, 600] })
  assert.deepEqual(pages[0].violations.map((v) => v.width), [599, 320])
})

// A width condition that changes above the widest window measured (a min-width above it, a max-width at or above it)
// leaves the page on the other side of the change unmeasured, so a page that overflows only there would pass. The page's
// style sheets are read as the browser holds them, and a condition above the range fails the page, naming where it was
// found and how far to raise the widest window (conditions.test.mjs holds the rule that judges a condition; these cases
// hold that every place a condition can sit is read). The widest window here is 1440px.
test('a style sheet with a condition at 1600px fails the page, naming the sheet, the condition and the width to raise to; the same rule at 1280px passes', async (t) => {
  const withRule = (width) => page(`<style>body{margin:0}@media (min-width: ${width}px){body{margin:0}}</style>`, '<p>x</p>')
  const above = (await measure(t, { 'index.html': withRule(1600) })).pages[0]
  assert.equal(above.problems.length, 1)
  assert.match(above.problems[0], /<style> no\. 1/)
  assert.match(above.problems[0], /@media \(min-width: 1600px\)/)
  assert.match(above.problems[0], /1440px/)
  assert.match(above.problems[0], /1600/)
  assert.match(above.problems[0], /widths\.mjs/)
  assert.deepEqual(above.violations, [])

  const inside = (await measure(t, { 'index.html': withRule(1280) })).pages[0]
  assert.deepEqual(inside.problems, [])
  assert.deepEqual(inside.violations, [])
})

// Every place a width condition can sit in what the page holds, each with the condition at 1600px: a reader that skips
// a place leaves that case red, and the failure names the style sheet the condition was found in.
const rule1600 = '@media (min-width: 1600px){p{margin:0}}'
const places = [
  ['a linked file', { head: '<link rel="stylesheet" href="/site.css">', files: { 'site.css': rule1600 } }, /\/site\.css/, /@media \(min-width: 1600px\)/],
  ['the second of two style elements', { head: `<style>p{margin:0}</style><style>${rule1600}</style>` }, /<style> no\. 2/, /@media \(min-width: 1600px\)/],
  ['a container query on a named container', { head: '<style>@container side (min-width: 1600px){p{margin:0}}</style>' }, /<style> no\. 1/, /@container side \(min-width: 1600px\)/],
  ['a container query on inline-size', { head: '<style>@container (min-inline-size: 1600px){p{margin:0}}</style>' }, /<style> no\. 1/, /@container \(min-inline-size: 1600px\)/],
  ['an @layer block', { head: `<style>@layer base{${rule1600}}</style>` }, /<style> no\. 1/, /@media \(min-width: 1600px\)/],
  ['an @supports block', { head: `<style>@supports (display:grid){${rule1600}}</style>` }, /<style> no\. 1/, /@media \(min-width: 1600px\)/],
  ['a style rule it is nested in', { head: '<style>.a{@media (min-width: 1600px){margin:0}}</style>' }, /<style> no\. 1/, /@media \(min-width: 1600px\)/],
  ['the media of an @import', { head: '<style>@import url("/b.css") (min-width: 1600px);</style>', files: { 'b.css': 'p{margin:0}' } }, /<style> no\. 1/, /@import .*\/b\.css.*\(min-width: 1600px\)/],
  ['the rules of an @imported sheet', { head: '<style>@import url("/b.css");</style>', files: { 'b.css': rule1600 } }, /\/b\.css/, /@media \(min-width: 1600px\)/],
  ['the media of a link', { head: '<link rel="stylesheet" href="/site.css" media="(min-width: 1600px)">', files: { 'site.css': 'p{margin:0}' } }, /\/site\.css/, /<link media="\(min-width: 1600px\)">/],
  ['the media of a style element', { head: '<style media="(min-width: 1600px)">p{margin:0}</style>' }, /<style> no\. 1/, /<style media="\(min-width: 1600px\)">/],
  ['an inline SVG style element', { body: `<svg width="10" height="10"><style>${rule1600}</style></svg>` }, /<style> no\. 1/, /@media \(min-width: 1600px\)/],
  ['the media of an inline SVG style element', { body: '<svg width="10" height="10"><style media="(min-width: 1600px)">rect{fill:red}</style></svg>' }, /<style> no\. 1/, /<style media="\(min-width: 1600px\)">/],
  [
    'a constructed style sheet',
    { body: `<script>const sheet = new CSSStyleSheet(); sheet.replaceSync('${rule1600}'); document.adoptedStyleSheets = [sheet]</script>` },
    /constructed style sheet/,
    /@media \(min-width: 1600px\)/,
  ],
]
for (const [name, { head = '', body = '', files = {} }, sheet, rule] of places) {
  test(`${name} with a condition at 1600px fails the page, naming where it was found`, async (t) => {
    const { pages } = await measure(t, { 'index.html': page(head, `<p>x</p>${body}`), ...files })
    assert.equal(pages[0].problems.length, 1, pages[0].problems.join('\n'))
    assert.match(pages[0].problems[0], sheet)
    assert.match(pages[0].problems[0], rule)
    assert.match(pages[0].problems[0], /1600/)
    assert.deepEqual(pages[0].violations, [])
  })
}

test('an @supports test on a property that is called min-width is not a condition on the window', async (t) => {
  const { pages } = await measure(t, { 'index.html': page('<style>@supports (min-width: 1700px){p{margin:0}}</style>', '<p>x</p>') })
  assert.deepEqual(pages[0].problems, [])
})

// A media condition's `em` is the browser's initial font size, so the page's own font size does not move the bound:
// 90em is 1440px and passes, 100em is 1600px and fails, even with the page at 10px.
for (const [em, expected] of [[100, 1], [90, 0]]) {
  test(`min-width: ${em}em on a page whose own font size is 10px ${expected ? 'fails' : 'passes'}`, async (t) => {
    const head = `<style>html{font-size:10px}@media (min-width: ${em}em){p{margin:0}}</style>`
    const { pages } = await measure(t, { 'index.html': page(head, '<p>x</p>') })
    assert.equal(pages[0].problems.length, expected, pages[0].problems.join('\n'))
  })
}

// In a container query `em` and `rem` follow the font size of the container and of the page's root element, not the
// browser's initial one, so a bound written in them cannot be told from the text: the page fails and is told to use px.
for (const unit of ['rem', 'em']) {
  test(`min-width: 90${unit} in a container query fails the page, because the container's font size is not the initial one`, async (t) => {
    const head = `<style>html{font-size:20px}@container (min-width: 90${unit}){p{margin:0}}</style>`
    const { pages } = await measure(t, { 'index.html': page(head, '<p>x</p>') })
    assert.equal(pages[0].problems.length, 1, pages[0].problems.join('\n'))
    assert.match(pages[0].problems[0], new RegExp(`@container \\(min-width: 90${unit}\\)`))
    assert.match(pages[0].problems[0], new RegExp(`cannot read.*90${unit}`))
  })
}
