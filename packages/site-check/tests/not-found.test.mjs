// not-found::US-001/AC-03 in a real browser: the colours of the not-found page's two buttons, in each appearance the system can ask for
// and while the outlined one is hovered. This tests the homepage site's behaviour, not the checker: it builds apps/home, serves the
// build the way the width check does (src/server.mjs, with the answers sites/home.json gives for the homepage's backend) and
// switches Chromium between the appearances. It lives in this package because this package is the project's browser suite. It
// builds apps/home/dist (once per run of the package's tests, tests/global-setup.mjs), so run it when no dev server is serving that folder.
//
// The pages are those of the build that hold the not-found page's marker, found on disk and in the page, so a not-found page in
// another language is read without an edit here.
//
// What this does not cover. Each item says what slips through and when it has to be added.
//   1. The buttons' colours only. Layout, size, corners, the focus ring and the buttons' keyboard order are recorded runs, listed in
//      the header of apps/home/tests/not-found.test.mjs. Add them here when the suite gains a layout check.
//   2. One browser. Chromium (Playwright's headless shell) stands for the browsers that follow prefers-color-scheme.
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readTokens, rgbaOf } from './helpers/colour.mjs'
import { openPage, pagesHolding, startHome } from './helpers/built-home.mjs'

const WIDTH = 1280
const WINDOW_HEIGHT = 900
const TEST_LIMIT = 60_000

describe('not-found on the built homepage site', { timeout: 300_000 }, () => {
  let browser
  let server
  let missing = []

  before(
    async () => {
      ;({ server, browser } = await startHome())
      missing = await pagesHolding(server, browser, '.ap-notfound')
    },
    { timeout: 180_000 },
  )

  after(async () => {
    await Promise.allSettled([browser?.close(), server?.close()])
  })

  test('not-found::US-001/AC-03: the solid button is the ink with the page colour\'s text, the outlined one is ink on the page and fills with the tag colour on hover, in each appearance', { timeout: TEST_LIMIT * 4 }, async (t) => {
    assert.ok(missing.length >= 1, 'the build has no not-found page')
    for (const url of missing) {
      for (const scheme of ['light', 'dark']) {
        await t.test(`${url} in ${scheme}`, { timeout: TEST_LIMIT }, async () => {
          const context = await browser.newContext({ colorScheme: scheme, viewport: { width: WIDTH, height: WINDOW_HEIGHT } })
          try {
            const page = await openPage(server, context, url)
            const paint = await page.evaluate(readTokens, ['--ink', '--paper', '--tag'])
            const buttons = await page.evaluate(() => {
              const read = (selector) => {
                const style = getComputedStyle(document.querySelector(selector))
                return { background: style.backgroundColor, color: style.color, border: style.borderTopColor }
              }
              return { primary: read('.ap-button-primary'), secondary: read('.ap-button-secondary') }
            })
            await page.hover('.ap-button-secondary')
            // The fill comes in over a short transition; it is read when it has arrived.
            await page.waitForFunction((tag) => getComputedStyle(document.querySelector('.ap-button-secondary')).backgroundColor === tag, paint['--tag'], { timeout: 5000 })
            const filled = await page.evaluate(() => getComputedStyle(document.querySelector('.ap-button-secondary')).backgroundColor)
            assert.deepEqual(buttons.primary, { background: paint['--ink'], color: paint['--paper'], border: paint['--ink'] }, `${scheme}: the solid button`)
            assert.deepEqual([buttons.secondary.color, buttons.secondary.border, filled], [paint['--ink'], paint['--ink'], paint['--tag']], `${scheme}: the outlined button and its hover`)
            assert.equal(rgbaOf(buttons.secondary.background).a, 0, `${scheme}: the outlined button has no fill until hovered`)
          } finally {
            await context.close()
          }
        })
      }
    }
  })
})
