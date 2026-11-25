// site-languages in a real browser, on the built homepage site (helpers/home-site.mjs builds apps/home and serves it, so this rebuilds apps/home/dist:
// run it when no dev server is serving that folder; this package's `test` script runs its files one at a time).
//
// What it covers: site-languages::REQ-003/AC-05, the language switch showing in the header at every window width, on every kind of
// page in each language; and site-languages::REQ-003/AC-03 with blog::US-003/AC-01, the navigation script reading its page's kind
// from its mount, which decides where the switch leads and which tab is marked.
// What it does not: the switch's markup (apps/home/tests/site-languages.test.mjs reads the navigation's markup), and the look of the
// switch beyond staying inside the header (checked by eye in the evidence screenshots). The visitor line and the dog are in
// visitor-counter.test.mjs and homepage-dog.test.mjs.
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startHomeSite, stopHomeSite, withPage } from './helpers/home-site.mjs'

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

describe('site-languages in a real browser on the built homepage site', { timeout: 300_000 }, () => {
  let site
  let browser
  let server
  let post

  before(
    async () => {
      site = await startHomeSite()
      ;({ browser, server, post } = site)
    },
    { timeout: 180_000 },
  )

  after(() => stopHomeSite(site))

  // Every kind of page in each language: the homepage, the Blog page, the not-found page, and a post page, which has no English version.
  const pages = () => ['/', '/en/', '/blog', '/en/blog', '/404', '/en/404', `/blog/${post}`]

  for (const width of WIDTHS) {
    test(`site-languages::REQ-003/AC-05: the switch shows inside the header, clear of the other items, at ${width}px on every page`, { timeout: TEST_LIMIT }, async () => {
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

  // The navigation script reads the kind of page from its mount (`data-page`). The kind decides where the language switch leads
  // (site-languages::REQ-003/AC-03) and which tab is marked as the current one (blog::US-003/AC-01), so one page of each kind is opened in each
  // language and both are read as the visitor's browser has them. The expected values are written out, not derived from the navigation.
  test('site-languages::REQ-003/AC-03: on a page of each kind the switch leads to the page\'s counterpart and the Blog tab is marked as the kind says', { timeout: TEST_LIMIT }, async () => {
    const cases = [
      ['/', '/en/', [null, null, null, null]],
      ['/en/', '/', [null, null, null, null]],
      ['/blog', '/en/blog', [null, null, 'page', null]],
      ['/en/blog', '/blog', [null, null, 'page', null]],
      [`/blog/${post}`, '/en/blog', [null, null, 'true', null]],
      ['/404', '/en/', [null, null, null, null]],
      ['/en/404', '/', [null, null, null, null]],
    ]
    const seen = []
    for (const [path, href, marks] of cases) {
      const read = await withPage(browser, [server.origin], server.origin + path, (page) =>
        page.evaluate(() => ({
          switchHref: document.querySelector('.ap-lang a')?.getAttribute('href'),
          tabMarks: [...document.querySelectorAll('.ap-nav a:not(.ap-menu-item)')].map((tab) => tab.getAttribute('aria-current')),
        })),
      )
      assert.deepEqual(read, { switchHref: href, tabMarks: marks }, path)
      seen.push(path)
    }
    assert.deepEqual(seen, cases.map(([path]) => path))
  })
})
