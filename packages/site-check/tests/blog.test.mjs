// blog::US-002/AC-07's failure mode in a real browser: a cover that fails to load leaves its frame at the same size on the page's
// ground, in each appearance the system can ask for. This tests the homepage site's behaviour, not the checker: it builds apps/home,
// serves the build the way the width check does (src/server.mjs, with the answers sites/home.json gives for the homepage's backend)
// and fails the requests for the covers. It lives in this package because this package is the project's browser suite. It builds
// apps/home/dist (once per run of the package's tests, tests/global-setup.mjs), so run it when no dev server is serving that folder.
//
// "The page's ground" is read as: the frame keeps its size and its own colour is within 1.3:1 of the page's ground (the tag colour
// against the page colour, in both appearances), not a lit box. The covers are the .webp files the posts name; every request for one
// is aborted, and the page is scrolled through so the covers below the lead (which load when they come near the window) are asked for too.
//
// blog::QR-001 in a real browser: how far down the first screen the homepage list reaches. The list is measured to the bottom of its link
// to all posts, in a short window and in a tall one, on every homepage the build has. The texts of the entries are replaced in the page
// before it is measured, so that every case has the line counts it names whatever the posts currently say: every title and summary at
// the two lines the page allows, or the same with one summary at a single line. Each case first reads back how many lines every text
// took, so a case that did not get the lines it names fails there instead of passing on a shorter list.
//
// What this does not cover. Each item says what slips through and when it has to be added.
//   1. The frame only. That the date, title, summary and link of each post still work without the cover is not read here.
//   2. One browser. Chromium (Playwright's headless shell) stands for the browsers that follow prefers-color-scheme.
//   3. The list's height. The title and the summary have fixed line heights, so their lines measure the same on every machine; the date
//      above them and the link beneath take the height of the machine's own font, so the margin the stylesheet leaves under the allowed
//      cut is what absorbs a machine with another font. Add a machine with other fonts to the runs if that margin proves too thin.
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { contrast } from './helpers/colour.mjs'
import { openPage, pagesHolding, startHome } from './helpers/built-home.mjs'

const WIDTH = 1280
const WINDOW_HEIGHT = 900
const TEST_LIMIT = 120_000

// The window sizes and the cut that blog::QR-001 names.
const SHORT_WINDOW = { width: 1366, height: 650 }
const TALL_WINDOW = { width: 1440, height: 790 }
const ALLOWED_CUT = 20

const LONG_TEXT = 'A text long enough to take every line the page gives it. '.repeat(40)
const SHORT_TEXT = 'A short text.'

/**
 * Opens the homepage at `url` in a window of `viewport`, sets every entry's title and summary to a text that takes the page's two lines
 * (the summary of entry `oneLineSummaryAt`, when given, to a text of one line), and reads where the list's link to all posts ends in
 * the window, along with the lines each text took.
 */
async function measureList(browser, server, url, viewport, oneLineSummaryAt = -1) {
  const context = await browser.newContext({ viewport })
  try {
    const page = await openPage(server, context, url)
    return await page.evaluate(
      ({ long, short, oneLineSummaryAt }) => {
        const entries = [...document.querySelectorAll('.ap-home-post')]
        entries.forEach((entry, index) => {
          entry.querySelector('h2').textContent = long
          entry.querySelector('p').textContent = index === oneLineSummaryAt ? short : long
        })
        const linesOf = (element) => Math.round(element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight))
        return {
          lines: entries.map((entry) => ({ title: linesOf(entry.querySelector('h2')), summary: linesOf(entry.querySelector('p')) })),
          bottom: document.querySelector('.ap-home-blog-all').getBoundingClientRect().bottom,
        }
      },
      { long: LONG_TEXT, short: SHORT_TEXT, oneLineSummaryAt },
    )
  } finally {
    await context.close()
  }
}

describe('blog on the built homepage site', { timeout: 600_000 }, () => {
  let browser
  let server
  let listings = []
  let homepages = []

  before(
    async () => {
      ;({ server, browser } = await startHome())
      listings = await pagesHolding(server, browser, '.ap-blog')
      homepages = await pagesHolding(server, browser, '.ap-home-posts')
    },
    { timeout: 180_000 },
  )

  after(async () => {
    await Promise.allSettled([browser?.close(), server?.close()])
  })

  test('blog::US-002/AC-07: a cover that fails to load leaves its frame at the same size on the page ground, in both appearances', { timeout: TEST_LIMIT * 2 }, async () => {
    assert.ok(listings.length >= 1, 'the build has no Blog page')
    for (const scheme of ['light', 'dark']) {
      for (const url of listings) {
        const read = async (failing) => {
          const context = await browser.newContext({ colorScheme: scheme, viewport: { width: WIDTH, height: WINDOW_HEIGHT } })
          try {
            const page = await context.newPage()
            await page.route('**/*', (route) => {
              const address = new URL(route.request().url())
              if (address.origin !== server.origin || (failing && address.pathname.endsWith('.webp'))) return route.abort()
              return route.continue()
            })
            await page.goto(server.origin + url, { waitUntil: 'networkidle' })
            // The covers below the lead load when they come near the window, so the page is scrolled through.
            await page.evaluate(async () => {
              for (let y = 0; y <= document.documentElement.scrollHeight; y += 600) {
                scrollTo({ top: y, behavior: 'instant' })
                await new Promise((done) => setTimeout(done, 50))
              }
              scrollTo({ top: 0, behavior: 'instant' })
            })
            await page.waitForLoadState('networkidle')
            return await page.evaluate(() => ({
              ground: getComputedStyle(document.body).backgroundColor,
              broken: [...document.querySelectorAll('.ap-post-cover img')].filter((img) => img.complete && img.naturalWidth === 0).length,
              frames: [...document.querySelectorAll('.ap-post-cover')].map((frame) => ({ box: [frame.offsetWidth, frame.offsetHeight], background: getComputedStyle(frame).backgroundColor })),
            }))
          } finally {
            await context.close()
          }
        }
        const [loaded, failed] = [await read(false), await read(true)]
        assert.ok(failed.frames.length >= 2, `${url} lists posts`)
        assert.equal(failed.broken, failed.frames.length, `${url} in ${scheme}: every cover request failed`)
        assert.deepEqual(failed.frames.map((frame) => frame.box), loaded.frames.map((frame) => frame.box), `${url} in ${scheme}: a failed cover keeps its frame's size`)
        for (const frame of failed.frames) assert.ok(contrast(frame.background, failed.ground) <= 1.3, `${url} in ${scheme}: the frame without its cover is ${frame.background} on ${failed.ground}`)
      }
    }
  })

  test('blog::QR-001/AC-01: in a tall window, the whole homepage list shows within the first screen with every title and summary at two lines', { timeout: TEST_LIMIT }, async () => {
    assert.ok(homepages.length >= 2, 'the build has a homepage in each language')
    for (const url of homepages) {
      const { lines, bottom } = await measureList(browser, server, url, TALL_WINDOW)
      assert.deepEqual(lines, Array(4).fill({ title: 2, summary: 2 }), `${url}: the list has four entries, each at two lines`)
      assert.ok(bottom <= TALL_WINDOW.height, `${url}: the list's link ends at ${bottom} in a window ${TALL_WINDOW.height} high`)
    }
  })

  test('blog::QR-001/AC-02: in a short window, with every entry at two lines, the homepage list is cut by no more than the allowed amount', { timeout: TEST_LIMIT }, async () => {
    assert.ok(homepages.length >= 2, 'the build has a homepage in each language')
    for (const url of homepages) {
      const { lines, bottom } = await measureList(browser, server, url, SHORT_WINDOW)
      assert.deepEqual(lines, Array(4).fill({ title: 2, summary: 2 }), `${url}: the list has four entries, each at two lines`)
      assert.ok(bottom - SHORT_WINDOW.height <= ALLOWED_CUT, `${url}: the list's link ends at ${bottom} in a window ${SHORT_WINDOW.height} high, cut by ${bottom - SHORT_WINDOW.height}`)
    }
  })

  test('blog::QR-001/AC-02: in a short window, with one summary at a single line, the whole homepage list shows within the first screen', { timeout: TEST_LIMIT }, async () => {
    assert.ok(homepages.length >= 2, 'the build has a homepage in each language')
    for (const url of homepages) {
      const { lines, bottom } = await measureList(browser, server, url, SHORT_WINDOW, 1)
      const expected = Array(4).fill({ title: 2, summary: 2 })
      expected[1] = { title: 2, summary: 1 }
      assert.deepEqual(lines, expected, `${url}: the list has four entries, the second with a one-line summary`)
      assert.ok(bottom <= SHORT_WINDOW.height, `${url}: the list's link ends at ${bottom} in a window ${SHORT_WINDOW.height} high`)
    }
  })
})
