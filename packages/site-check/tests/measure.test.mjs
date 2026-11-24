// Measuring a built site in a real browser: app-sites::QR-001/AC-01. These cases run the check on small built sites
// made for the purpose and read what it says, so each one is a way the check could pass a page it should not, or
// fail one it should not.
//
// Not covered here, because this server cannot produce it: a page answered with a success other than 200. The page's
// own status is judged by the same rule as every other answer from the local server (a status of 400 or more fails
// the page), and the server answers a page with 200 or 404 only.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
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

// A page that writes a long number into a line that cannot wrap, after asking its own backend for it.
const counter = page('<style>body{margin:0}#n{white-space:nowrap}</style>', '<p id="n">…</p><script>fetch("/api/visitor").then((r) => r.json()).then((d) => { document.getElementById("n").textContent = d.total })</script>')
const huge = '9'.repeat(200)

test('a request to the site\'s own backend is answered from the site\'s fixture, and the page is measured with the answer in it', async (t) => {
  const site = { ...config, fixtures: [{ path: '/api/visitor', json: { total: huge } }] }
  const { pages } = await measure(t, { 'index.html': counter }, { site })
  assert.deepEqual(pages[0].problems, [])
  assert.ok(pages[0].violations.some((v) => v.width === 320))
})

test('without a fixture the same request fails the page instead of being passed over', async (t) => {
  const { pages } = await measure(t, { 'index.html': counter })
  assert.equal(pages[0].problems.length, 1)
  assert.match(pages[0].problems[0], /\/api\/visitor.*404/)
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

test('a page that changes itself when the window is resized is measured after it has changed', async (t) => {
  const script = '<script>addEventListener("resize", () => { document.getElementById("box").style.width = innerWidth < 600 ? "700px" : "100px" })</script>'
  const html = page('<style>body{margin:0}</style>', `<div id="box" style="width:100px">x</div>${script}`)
  const { pages } = await measure(t, { 'index.html': html }, { widths: [1440, 700, 599, 320, 600] })
  assert.deepEqual(pages[0].violations.map((v) => v.width), [599, 320])
})
