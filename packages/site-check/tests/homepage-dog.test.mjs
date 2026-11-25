// homepage-dog::REQ-002 in a real browser, on the built homepage site (helpers/home-site.mjs serves the build of apps/home, which this package's `test` script
// makes once before any file (tests/global-setup.mjs) and runs the files one at a time; run on its own, a file builds it itself, so run it
// when no dev server is serving apps/home/dist).
//
// What it covers: the dog says each of its five status lines in the page's language, wired from the data attributes of the page to the dog
// script: the wagging and the greeting (with reduced motion) once its motion images are ready, the paused line when the button stops it, the resting
// line when the button stops it under reduced motion, and the unavailable line when its motion images fail to load. What it does not: the
// dog's animation (checked by eye), and the lines the built page carries (apps/home/tests/homepage-dog.test.mjs reads them).
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startHomeSite, stopHomeSite, withPage } from './helpers/home-site.mjs'

const TEST_LIMIT = 60_000

// The lines, written out as each page words them.
const LINES = {
  '/': { resting: '静静陪着你', greeting: '很高兴见到你', wagging: '见到你，就忍不住摇尾巴', paused: '好啦，乖乖坐好', unavailable: '小狗先静静陪着你，刷新后再试试' },
  '/en/': { resting: 'Sitting quietly beside you', greeting: 'Nice to see you', wagging: "Can't help wagging my tail when I see you", paused: 'All right, sitting nicely', unavailable: 'The dog is keeping you company quietly for now; refresh to try again' },
}

describe('the dog on the built homepage site in a real browser', { timeout: 300_000 }, () => {
  let site

  before(async () => {
    site = await startHomeSite()
  }, { timeout: 180_000 })

  after(() => stopHomeSite(site))

  const status = (page, line) => page.waitForFunction((wanted) => document.getElementById('goldenStatus')?.textContent === wanted, line, { timeout: 15_000 }).then(() => page.textContent('#goldenStatus'))
  // Presses the dog's button and reads the line in the same breath: the script answers a press at once, and the line it shows then stays only
  // as long as the dog takes to settle.
  const press = (page) => page.evaluate(() => {
    document.getElementById('goldenTrigger').click()
    return document.getElementById('goldenStatus').textContent
  })

  for (const [path, lines] of Object.entries(LINES)) {
    test(`homepage-dog::REQ-002: ${path} says "${lines.wagging}" when its dog wags`, { timeout: TEST_LIMIT }, async () => {
      assert.equal(await withPage(site.browser, [site.server.origin], site.server.origin + path, (page) => status(page, lines.wagging)), lines.wagging)
    })

    test(`homepage-dog::REQ-002: ${path} says "${lines.greeting}" when its dog greets with a still frame under reduced motion`, { timeout: TEST_LIMIT }, async () => {
      assert.equal(await withPage(site.browser, [site.server.origin], site.server.origin + path, (page) => status(page, lines.greeting), { reducedMotion: 'reduce' }), lines.greeting)
    })

    test(`homepage-dog::REQ-002: ${path} says "${lines.paused}" when the button stops the wagging dog`, { timeout: TEST_LIMIT }, async () => {
      const said = await withPage(site.browser, [site.server.origin], site.server.origin + path, async (page) => {
        await status(page, lines.wagging)
        return press(page)
      })
      assert.equal(said, lines.paused)
    })

    test(`homepage-dog::REQ-002: ${path} says "${lines.resting}" when the button stops the dog under reduced motion`, { timeout: TEST_LIMIT }, async () => {
      const said = await withPage(site.browser, [site.server.origin], site.server.origin + path, async (page) => {
        await status(page, lines.greeting)
        return press(page)
      }, { reducedMotion: 'reduce' })
      assert.equal(said, lines.resting)
    })

    test(`homepage-dog::REQ-002: ${path} says "${lines.unavailable}" when the dog's motion images fail to load`, { timeout: TEST_LIMIT }, async () => {
      const said = await withPage(site.browser, [site.server.origin], site.server.origin + path, (page) => status(page, lines.unavailable), { blocked: [/\/assets\/golden-wag\/motion-\d+\.webp$/] })
      assert.equal(said, lines.unavailable)
    })
  }
})
