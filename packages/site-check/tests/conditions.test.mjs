// Which width conditions in a page's style sheets change state above the widest window the check measures, so that the
// page on the other side of the change is not measured: the guard of the upper end of app-sites::QR-001/AC-01. The rule
// judges the text of a condition, so it is tested without a browser; the reading of the page is tested in
// measure.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { judgeCondition, ceilingProblems } from '../src/conditions.mjs'

const WIDEST = 1440

// [condition, the width the check must be raised to, or null when the condition is in effect in a measured window].
// The expected widths are worked out from where each comparison changes state, not from the rule's own arithmetic.
const counted = [
  ['(min-width: 1441px)', 1441],
  ['(max-width: 1440px)', 1441],
  ['(width > 1440px)', 1441],
  ['(width <= 1440px)', 1441],
  ['(width = 1440px)', 1441],
  ['(width: 1440px)', 1441],
  ['(1000px <= width <= 1600px)', 1601],
  ['(1600px < width)', 1601],
  ['(1600px <= width)', 1600],
  ['(1500px >= width)', 1501],
  ['(min-width: 1440.5px)', 1441],
  ['(max-width: 1440.5px)', 1441],
  ['(min-width: 100em)', 1600],
  ['(min-width: 100rem)', 1600],
  ['(min-width: calc(1700px))', 1700],
  ['screen and (min-width: 1500px), print', 1500],
  ['(MIN-WIDTH:1500PX)', 1500],
  ['not (min-width: 1500px)', 1500],
  ['(min-width: 1000px) and ((max-width: 1200px) or (min-width: 1700px))', 1700],
  ['(min-width: 1500px) and (max-width: 1600px)', 1601],
  ['(min-device-width: 1800px)', 1800],
  ['side (width > 1500px)', 1501],
  ['(min-inline-size: 1550px)', 1550],
  ['(inline-size > 1500px)', 1501],
  ['width (min-width: 1500px)', 1500],
]
const inside = [
  '(min-width: 1440px)',
  '(max-width: 1439px)',
  '(width >= 1440px)',
  '(width < 1440px)',
  '(width < 1000px)',
  '(width > 1439px)',
  '(1440px > width)',
  '(min-width: 1439.5px)',
  '(max-width: 1439.5px)',
  '(min-width: 90em)',
  '(min-width: 90rem)',
  '(min-width: 0)',
  '(min-width: 600px) and (max-width: 900px)',
  'screen and (min-width: 1000px), print',
  '(min-height: 2000px)',
  '(height > 2000px)',
  '(hover: hover)',
  '(prefers-reduced-motion: reduce)',
  '(orientation: landscape)',
  '(aspect-ratio: 16/9)',
  '(min-resolution: 2dppx)',
  '(width)',
  'print',
  '',
]
const unreadable = [
  ['(min-width: calc(10em + 1500px))', 'calc(10em + 1500px)'],
  ['(min-width: 50vw)', '50vw'],
  ['(min-width: min(1700px, 90vw))', 'min(1700px, 90vw)'],
  ['(1000px <= width <= var(--Wide))', 'var(--Wide)'],
]

for (const [condition, raiseTo] of counted) {
  test(`${condition} is in effect only above ${WIDEST}px and needs the check raised to ${raiseTo}px`, () => {
    assert.deepEqual(judgeCondition(condition, WIDEST), { raiseTo, unreadable: null })
  })
  test(`${condition} is in effect in a measured window once the check is raised to ${raiseTo}px, and not one pixel below`, () => {
    assert.deepEqual(judgeCondition(condition, raiseTo), { raiseTo: null, unreadable: null })
    assert.deepEqual(judgeCondition(condition, raiseTo - 1), { raiseTo, unreadable: null })
  })
}

for (const condition of inside) {
  test(`"${condition}" is in effect in a window the check measures`, () => {
    assert.deepEqual(judgeCondition(condition, WIDEST), { raiseTo: null, unreadable: null })
  })
}

for (const [condition, part] of unreadable) {
  test(`${condition} has a width the check cannot read, and says which`, () => {
    assert.deepEqual(judgeCondition(condition, WIDEST), { raiseTo: null, unreadable: part })
  })
}

// In a container query `em` and `rem` are the font sizes of the container and of the page's root element, which the
// check cannot tell from the text; in a media query they are the browser's initial font size and are read as 16px.
for (const [condition, part] of [['(min-width: 90rem)', '90rem'], ['(min-width: 50em)', '50em'], ['side (width > 100em)', '100em'], ['(min-width: calc(90rem))', 'calc(90rem)']]) {
  test(`${condition} in a container query has a width the check cannot read, and says which`, () => {
    assert.deepEqual(judgeCondition(condition, WIDEST, { container: true }), { raiseTo: null, unreadable: part })
  })
}

test('a container query in px is read like a media query', () => {
  assert.deepEqual(judgeCondition('side (width > 1500px)', WIDEST, { container: true }), { raiseTo: 1501, unreadable: null })
  assert.deepEqual(judgeCondition('(min-width: 1000px)', WIDEST, { container: true }), { raiseTo: null, unreadable: null })
})

test('a condition with a width above the range and another that cannot be read reports both', () => {
  assert.deepEqual(judgeCondition('(min-width: 1500px) and (max-width: 50vw)', WIDEST), { raiseTo: 1500, unreadable: '50vw' })
})

const found = (rule, condition) => ({ sheet: '/assets/site.css', rule, condition })

test('a condition above the range is a problem naming the style sheet, the rule, the width to raise to and widths.mjs', () => {
  const problems = ceilingProblems([found('@media (min-width: 1600px)', '(min-width: 1600px)')], WIDEST)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /\/assets\/site\.css/)
  assert.match(problems[0], /@media \(min-width: 1600px\)/)
  assert.match(problems[0], /1440px/)
  assert.match(problems[0], /1600/)
  assert.match(problems[0], /widths\.mjs/)
})

test('a condition whose width cannot be read is a problem naming the style sheet, the rule and the width, and not widths.mjs', () => {
  const problems = ceilingProblems([found('@media (min-width: 50vw)', '(min-width: 50vw)')], WIDEST)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /\/assets\/site\.css/)
  assert.match(problems[0], /@media \(min-width: 50vw\)/)
  assert.match(problems[0], /cannot read.*50vw/)
})

test('a container query in em or rem is a problem that says to write the width in px', () => {
  const problems = ceilingProblems([{ ...found('@container (min-width: 90rem)', '(min-width: 90rem)'), container: true }], WIDEST)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /@container \(min-width: 90rem\)/)
  assert.match(problems[0], /cannot read.*90rem/)
  assert.match(problems[0], /\bpx\b/)
})

test('conditions inside the range are no problem, and neither is no condition', () => {
  assert.deepEqual(ceilingProblems([found('@media (min-width: 1280px)', '(min-width: 1280px)')], WIDEST), [])
  assert.deepEqual(ceilingProblems([], WIDEST), [])
})

test('each rule above the range is its own problem, in the order found', () => {
  const problems = ceilingProblems(
    [found('@media (min-width: 1600px)', '(min-width: 1600px)'), found('@media (min-width: 1280px)', '(min-width: 1280px)'), found('@container (min-width: 1700px)', '(min-width: 1700px)')],
    WIDEST,
  )
  assert.equal(problems.length, 2)
  assert.match(problems[0], /1600px\)/)
  assert.match(problems[1], /@container \(min-width: 1700px\)/)
})
