// nav-menus::US-004/AC-03 in a real browser. This tests the homepage's behaviour, not the checker: it builds apps/home, serves the
// build the way the width check does (src/server.mjs, with the answers sites/home.json gives for the homepage's backend) and moves
// keyboard focus in Chromium. It lives in this package because this package is the project's browser suite. It rebuilds
// apps/home/dist, as the check does, so run it when no dev server is serving that folder.
//
// Each test opens a page, takes the first focusable element of its content that the page can scroll wholly above the window,
// puts that element in one place, focuses it, waits for the smooth scroll to settle, and reads where the element's top edge is
// against the header's bottom edge. There are two places, because they exercise different things. What is said of Chromium was
// measured at 1280px and 390px on this package's Playwright (1.62.0, Chrome Headless Shell 151):
//   - Wholly above the window. Chromium scrolls an element that is outside the window to about the middle of the window, whatever
//     the scroll padding is: a padding of 40px put the element within 30px of where the right padding puts it. So this case does
//     not read the padding; it fails only when focus stops bringing the element into view below the header at all.
//   - Inside the window with its top 2px under the header. Chromium aligns such an element to the edge of the area the scroll
//     padding leaves free, to within a pixel (0.1px short of the header's bottom edge at both widths). With a padding smaller than
//     the header's height it moves the element less, or not at all, so the element stays under the header and the test fails.
//     An element wholly under the header is not used: Chromium centres it when the padding covers the whole element, so a padding
//     of 60px, short of the header's 76px, would pass.
//
// What this does not cover. Each item says what slips through and when it has to be added.
//   1. Pages. Only the homepage and the blog list are opened. An article page has a sticky contents column whose links move when the
//      page scrolls, so a link picked by its place at the top of the page is not where the test puts it; the 404 page is as tall as
//      the window, so there is nothing to scroll under the header. Add them when a page sets a scroll padding or a header of its own.
//   2. Widths. 1280px and 390px stand for the stylesheet's two layouts, the wide one and the one at 700px and narrower, which have
//      different header heights. Add a width when the stylesheet gets a third layout of the header.
//   3. One element per page and placement, and focus moved by calling focus() on it, not by pressing Tab. Add the Tab key when a
//      page handles focus or keys of its own.
//   4. Motion. The test runs with Chromium's default, smooth scrolling on. A visitor whose system asks for reduced motion gets an
//      instant scroll, which this does not exercise.
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from 'playwright'
import { startServer } from '../src/server.mjs'
import { loadSiteConfig } from '../src/site-config.mjs'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const home = join(root, 'apps/home')
const WIDTHS = [1280, 390]
const PAGES = ['/', '/blog']
const WINDOW_HEIGHT = 900
// How much of the element's top edge sits behind the header when it is put under it, and how far above the window it is put.
const HIDDEN_BY = 2
const ABOVE_BY = 20
// Scroll offsets are whole pixels, so an element aligned to the padding's edge can land up to a pixel from it. A scroll padding
// that falls short of the header by a pixel or less is therefore not reliably caught.
const TOLERANCE = 1
const TEST_LIMIT = 60_000

// Marks the first focusable element outside the header that the page can scroll wholly above the window (so the element is not
// among the last on the page), and returns where it is. Runs in the page.
function markTarget(aboveBy) {
  const focusable = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
  const header = document.querySelector('.ap-header')
  const maxScroll = document.documentElement.scrollHeight - innerHeight
  const target = [...document.querySelectorAll(focusable)].find((el) => {
    const { top, height } = el.getBoundingClientRect()
    return !header.contains(el) && el.getClientRects().length > 0 && getComputedStyle(el).visibility === 'visible' && top + scrollY + height + aboveBy <= maxScroll
  })
  if (!target) return null
  target.setAttribute('data-focus-target', '')
  const { top, height } = target.getBoundingClientRect()
  const classes = (target.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean)
  return { top: top + scrollY, height, maxScroll, name: [target.tagName.toLowerCase(), ...classes].join('.') }
}

// Runs in the page: scrolls the page (at once, not smoothly) to `scrollTop` and says where the marked element is and how far the
// header reaches.
function placeTarget(scrollTop) {
  scrollTo({ top: scrollTop, behavior: 'instant' })
  const { top, bottom } = document.querySelector('[data-focus-target]').getBoundingClientRect()
  return { top, bottom, headerBottom: document.querySelector('.ap-header').getBoundingClientRect().bottom }
}

// Runs in the page: focuses the marked element, waits until the page has stopped scrolling (20 frames at the same place; a smooth
// scroll changes it in every frame), and says where the element and the header are then.
function focusTarget() {
  const target = document.querySelector('[data-focus-target]')
  target.focus()
  return new Promise((resolve, reject) => {
    const deadline = performance.now() + 5000
    let last = NaN
    let still = 0
    const tick = () => {
      still = scrollY === last ? still + 1 : 0
      last = scrollY
      if (still >= 20) {
        const { top } = target.getBoundingClientRect()
        resolve({ top, headerBottom: document.querySelector('.ap-header').getBoundingClientRect().bottom, focused: document.activeElement === target })
      } else if (performance.now() > deadline) reject(new Error('the page was still scrolling 5 seconds after focus moved'))
      else requestAnimationFrame(tick)
    }
    tick()
  })
}

// Each place: where to scroll so that the element is there (from its place in the page), and what must be true of it before focus.
const PLACES = [
  {
    name: 'wholly above the window',
    scrollTop: ({ top, height }) => top + height + ABOVE_BY,
    holds: ({ bottom }) => bottom < 0,
  },
  {
    name: 'inside the window and under the header',
    scrollTop: ({ top }, headerBottom) => top - (headerBottom - HIDDEN_BY),
    holds: ({ top, headerBottom }) => top > 0 && top < headerBottom,
  },
]

describe('nav-menus::US-004/AC-03 on the built homepage', { timeout: 300_000 }, () => {
  let browser
  let server

  before(
    async () => {
      await promisify(execFile)('pnpm', ['run', 'build'], { cwd: home, timeout: 120_000 })
      const config = await loadSiteConfig(join(root, 'packages/site-check/sites'), 'home')
      server = await startServer({ dist: join(home, 'dist'), fixtures: config.fixtures })
      browser = await chromium.launch()
    },
    { timeout: 180_000 },
  )

  after(async () => {
    await Promise.allSettled([browser?.close(), server?.close()])
  })

  for (const width of WIDTHS) {
    for (const url of PAGES) {
      for (const place of PLACES) {
        test(`focus on an element ${place.name} at ${width}px on ${url}`, { timeout: TEST_LIMIT }, async () => {
          const page = await browser.newPage({ viewport: { width, height: WINDOW_HEIGHT } })
          try {
            // Only the local server answers: the page is measured without the network, as the width check does.
            await page.route('**/*', (route) => (new URL(route.request().url()).origin === server.origin ? route.continue() : route.abort()))
            await page.goto(server.origin + url, { waitUntil: 'networkidle' })
            await page.waitForSelector('.ap-header')
            await page.evaluate(() => document.fonts.ready)

            const target = await page.evaluate(markTarget, ABOVE_BY)
            assert.ok(target, `${url} has no focusable element that can be scrolled wholly above the window, so there is nothing to test`)
            const headerBottom = await page.evaluate(() => document.querySelector('.ap-header').getBoundingClientRect().bottom)
            const scrollTop = place.scrollTop(target, headerBottom)
            assert.ok(scrollTop >= 0 && scrollTop <= target.maxScroll, `the page cannot be scrolled to put the element ${place.name} (it needs ${scrollTop}px of scroll, the page allows 0 to ${target.maxScroll}px)`)

            const placed = await page.evaluate(placeTarget, scrollTop)
            assert.ok(place.holds(placed), `${target.name} was not put ${place.name} before focus: ${JSON.stringify(placed)}`)

            const landed = await page.evaluate(focusTarget)
            assert.ok(landed.focused, 'the element did not take focus')
            assert.ok(
              landed.top >= landed.headerBottom - TOLERANCE,
              `after focus the top edge of ${target.name} is at ${landed.top}px, ${landed.headerBottom - landed.top}px under the header, whose bottom edge is at ${landed.headerBottom}px`,
            )
          } finally {
            await page.close()
          }
        })
      }
    }
  }
})
