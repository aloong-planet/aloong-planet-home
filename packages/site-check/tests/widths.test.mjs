// The width rule and the widths it is applied at: app-sites::QR-001/AC-01.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WIDTHS, widthProblem, formatWidths } from '../src/widths.mjs'

test('the widths are every whole number of pixels from 320 to 1440', () => {
  assert.equal(WIDTHS.length, 1121)
  assert.equal(WIDTHS[0], 320)
  assert.equal(WIDTHS[1], 321)
  assert.equal(WIDTHS[1119], 1439)
  assert.equal(WIDTHS[1120], 1440)
  // Neighbours differ by exactly 1, so no width is skipped anywhere in between.
  const steps = WIDTHS.slice(1).map((w, i) => w - WIDTHS[i])
  assert.equal(steps.length, 1120)
  assert.ok(steps.every((s) => s === 1))
})

const fits = [
  ['a page exactly as wide as the window', { inner: 400, doc: 400, body: 400 }, 400],
  ['a page narrower than the window', { inner: 400, doc: 380, body: 380 }, 400],
]
for (const [name, measured, width] of fits) {
  test(`${name} has no width problem`, () => {
    assert.equal(widthProblem(measured, width), null)
  })
}

const problems = [
  ['the document one pixel wider than the window', { inner: 400, doc: 401, body: 400 }, 400, /401.*400/],
  ['the body wider while the document is held to the window (overflow-x hidden on html and body)', { inner: 320, doc: 320, body: 500 }, 320, /500.*320/],
  ['a window that is not the requested width, so the measurement is of another width', { inner: 500, doc: 500, body: 500 }, 400, /window.*500.*400/],
]
for (const [name, measured, width, expected] of problems) {
  test(`${name} is a width problem`, () => {
    assert.match(widthProblem(measured, width), expected)
  })
}

const ranges = [
  [[320, 321, 322, 400], '320-322, 400'],
  [[500], '500'],
  [[500, 501], '500-501'],
  [[320, 322, 324], '320, 322, 324'],
  [[], ''],
]
for (const [widths, expected] of ranges) {
  test(`widths ${JSON.stringify(widths)} are written as "${expected}"`, () => {
    assert.equal(formatWidths(widths), expected)
  })
}
