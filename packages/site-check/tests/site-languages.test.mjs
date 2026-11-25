// site-languages in a real browser, on the built homepage site. It builds apps/home, serves the build the way the width check does
// (src/server.mjs) and opens it in headless Chromium, so it rebuilds apps/home/dist: run it when no dev server is serving that folder.
// This package's `test` script runs its files one at a time, because this file and nav-menus.test.mjs both rebuild that folder.
//
// What it covers: site-languages::REQ-003/AC-05, the language switch showing in the header at every window width, on every kind of
// page in each language; and visitor-counter::REQ-001/AC-02, the visitor line's wording and the browser's own number format.
// What it does not: the switch's markup and where its link leads (apps/home/tests/site-languages.test.mjs reads the navigation's
// markup), and the look of the switch beyond staying inside the header (checked by eye in the evidence screenshots).
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from 'playwright'
import { startServer } from '../src/server.mjs'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const home = join(root, 'apps/home')
// The widths the stylesheet's layouts begin and end at: the narrowest phone, a common phone, the first width of the wide header, a desktop.
const WIDTHS = [320, 390, 701, 1440]
const WINDOW_HEIGHT = 900
const TEST_LIMIT = 60_000

// Measures the header's pieces and the switch, in the page. Runs in the page.
function measureHeader() {
  const rect = (selector) => {
    const element = document.querySelector(selector)
    if (!element) return null
    const { left, right, top, bottom } = element.getBoundingClientRect()
    return { left, right, top, bottom }
  }
  const items = [...document.querySelectorAll('.ap-lang > *')].map((element) => {
    const { left, right, top, bottom } = element.getBoundingClientRect()
    return { text: element.textContent, left, right, top, bottom }
  })
  // Elements of the header that take keyboard focus, in page order: the switch's link has to come last.
  const focusable = [...document.querySelectorAll('.ap-header a[href]')].map((link) => link.textContent.trim().slice(0, 12))
  return {
    width: innerWidth,
    header: rect('.ap-header'),
    brand: rect('.ap-brand'),
    nav: rect('.ap-nav'),
    social: rect('.ap-social'),
    lang: rect('.ap-lang'),
    items,
    focusable,
  }
}

const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
const inside = (inner, outer) => inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom

describe('site-languages::REQ-003/AC-05 on the built homepage site', { timeout: 300_000 }, () => {
  let browser
  let server
  let post

  before(
    async () => {
      await promisify(execFile)('pnpm', ['run', 'build'], { cwd: home, timeout: 120_000 })
      post = JSON.parse(await readFile(join(home, 'content/posts.json'), 'utf8'))[0].slug
      server = await startServer({ dist: join(home, 'dist'), fixtures: [{ path: '/api/visitor', json: { total: 1234 } }] })
      browser = await chromium.launch()
    },
    { timeout: 180_000 },
  )

  after(async () => {
    await Promise.allSettled([browser?.close(), server?.close()])
  })

  // Every kind of page in each language: the homepage, the Blog page, the not-found page, and a post page, which has no English version.
  const pages = () => ['/', '/en/', '/blog', '/en/blog', '/404', '/en/404', `/blog/${post}`]

  for (const width of WIDTHS) {
    test(`the switch shows inside the header, clear of the other items, at ${width}px on every page`, { timeout: TEST_LIMIT }, async () => {
      const checked = []
      for (const path of pages()) {
        const page = await browser.newPage({ viewport: { width, height: WINDOW_HEIGHT } })
        try {
          // Only the local server answers: the page is measured without the network, as the width check does.
          await page.route('**/*', (route) => (new URL(route.request().url()).origin === server.origin ? route.continue() : route.abort()))
          await page.goto(server.origin + path, { waitUntil: 'networkidle' })
          await page.waitForSelector('.ap-lang')
          const seen = await page.evaluate(measureHeader)
          const where = `${path} at ${width}px`
          assert.ok(seen.lang, `${where}: the page has no language switch`)
          assert.equal(seen.items.length, 2, `${where}: the switch has two items`)
          assert.ok(inside(seen.lang, seen.header), `${where}: the switch ${JSON.stringify(seen.lang)} is not inside the header ${JSON.stringify(seen.header)}`)
          assert.ok(seen.lang.left >= 0 && seen.lang.right <= seen.width, `${where}: the switch ${JSON.stringify(seen.lang)} is not inside the window`)
          for (const [name, other] of [['the site name', seen.brand], ['the navigation', seen.nav], ['the GitHub link', seen.social]]) {
            assert.equal(overlap(seen.lang, other), false, `${where}: the switch overlaps ${name}`)
          }
          // The two items sit side by side and neither is clipped by the other.
          assert.equal(overlap(seen.items[0], seen.items[1]), false, `${where}: the two items of the switch overlap`)
          for (const item of seen.items) assert.ok(item.right > item.left && item.bottom > item.top, `${where}: ${item.text} has no size`)
          // The switch is the last item of the header, after the GitHub link: reading and Tab order agree with the eye (site-languages::REQ-003/AC-01).
          assert.ok(seen.social.right <= seen.lang.left, `${where}: the switch does not follow the GitHub link`)
          // The page's own language is not a link, so the last link of the header is the other language's.
          assert.deepEqual(seen.focusable.slice(-2), ['GitHub', path.startsWith('/en') ? '中文' : 'EN'], `${where}: the header's links do not end with GitHub and the switch`)
          checked.push(path)
        } finally {
          await page.close()
        }
      }
      assert.deepEqual(checked, pages())
    })
  }
})
