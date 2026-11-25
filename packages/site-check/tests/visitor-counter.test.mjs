// visitor-counter::REQ-001/AC-02 in a real browser, on the built homepage site (helpers/home-site.mjs builds apps/home and serves it, so this
// rebuilds apps/home/dist: run it when no dev server is serving that folder; this package's `test` script runs its files one at a time).
//
// What it covers: the line each homepage shows for a total, with the number in the browser's own number format, which a browser whose format
// matches neither page's language (German) tells from the page's language. What it does not: the wording and plural of the line for other totals
// (apps/home/tests/visitor-client.test.mjs drives them, with the English-US and Chinese formats too), and what a page registers.
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startHomeSite, stopHomeSite, withPage } from './helpers/home-site.mjs'

const TEST_LIMIT = 60_000

describe('the visitor line in a real browser on the built homepage site', { timeout: 300_000 }, () => {
  let site

  before(async () => {
    site = await startHomeSite()
  }, { timeout: 180_000 })

  after(() => stopHomeSite(site))

  // The expected texts are written out: the format of 1234 for a German browser is 1.234.
  const counter = (page) => page.waitForFunction(() => document.querySelector('[data-visitor-counter]')?.textContent, null, { timeout: 15_000 }).then(() => page.textContent('[data-visitor-counter]'))
  for (const [path, expected] of [
    ['/', '本站累计访客 1.234 人'],
    ['/en/', '1.234 visitors so far'],
  ]) {
    test(`visitor-counter::REQ-001/AC-02: ${path} in a browser whose number format is de-DE reads "${expected}"`, { timeout: TEST_LIMIT }, async () => {
      assert.equal(await withPage(site.browser, [site.server.origin], site.server.origin + path, counter, { locale: 'de-DE' }), expected)
    })
  }

  test('visitor-counter::REQ-001/AC-02: the English homepage reads "1 visitor so far" for a total of 1', { timeout: TEST_LIMIT }, async () => {
    assert.equal(await withPage(site.browser, [site.single.origin], site.single.origin + '/en/', counter, { locale: 'en-US' }), '1 visitor so far')
  })
})
