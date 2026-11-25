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
// What this does not cover. Each item says what slips through and when it has to be added.
//   1. The frame only. That the date, title, summary and link of each post still work without the cover is not read here.
//   2. One browser. Chromium (Playwright's headless shell) stands for the browsers that follow prefers-color-scheme.
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { contrast } from './helpers/colour.mjs'
import { pagesHolding, startHome } from './helpers/built-home.mjs'

const WIDTH = 1280
const WINDOW_HEIGHT = 900
const TEST_LIMIT = 120_000

describe('blog on the built homepage site', { timeout: 600_000 }, () => {
  let browser
  let server
  let listings = []

  before(
    async () => {
      ;({ server, browser } = await startHome())
      listings = await pagesHolding(server, browser, '.ap-blog')
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
})
