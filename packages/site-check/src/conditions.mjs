// Width conditions that start above the widest window the check measures. A rule such as `@media (min-width: 1600px)`
// is in effect in no measured window, so a page that overflows only there would pass; the check fails such a page
// instead, and says how far to raise the widest window (WIDEST in widths.mjs). This file judges the text of a
// condition; reading the conditions out of a page is measure.mjs's job.

// What `em` and `rem` are in a media condition: the browser's initial font size, not the page's own.
const FONT_SIZE = 16

// A function whose result is a value, not a condition: `calc(1700px)` is read as 1700px, the others are not read.
const VALUE_FUNCTIONS = new Set(['calc', 'min', 'max', 'clamp', 'var', 'env', 'attr'])

const GROUP = /([a-z-]*)\(([^()]*)\)/i
const LENGTH = /^([+-]?(?:\d+\.?\d*|\.\d+))(px|em|rem)$/i
const NO_LENGTH_UNIT = /^[+-]?0*\.?0+$/
const FEATURE = /^\s*(?:(min|max)-)?(?:device-)?(?:width|inline-size)\s*:\s*(.*?)\s*$/i
const RANGE_FEATURE = /^(?:device-)?(?:width|inline-size)$/i
const FLIPPED = { '<': '>', '<=': '>=', '>': '<', '>=': '<=', '=': '=' }

// The width in pixels a bound is written as, or null when it is not a plain length.
const lengthInPixels = (text) => {
  const value = text.trim()
  if (NO_LENGTH_UNIT.test(value)) return 0
  const match = LENGTH.exec(value)
  if (!match) return null
  return Number(match[1]) * (match[2].toLowerCase() === 'px' ? 1 : FONT_SIZE)
}

// The smallest whole width at which a comparison against the bound B has changed state from what it was at the widths
// below: ceil(B) where it turns on at B (`>=`) or off just short of it (`<`), floor(B)+1 where it turns off just past
// B (`<=`, `=`) or on just past it (`>`). Whole widths, because the check measures whole widths.
const changesAt = (op, bound) => (op === '>=' || op === '<' ? Math.ceil(bound) : Math.floor(bound) + 1)

// Judges the text of a media or container condition against `widest`, the widest window measured. Returns
// { raiseTo, unreadable }: raiseTo is the widest window the check must measure for no comparison on the window's width
// to change state above it, null when none does; unreadable is the text of the bounds that could not be read as a
// length, null when all could. Over-counting is accepted (a contradiction such as `(min-width: 1600px) and
// (max-width: 1000px)` counts), a miss is not.
export function judgeCondition(text, widest) {
  const values = []
  const changes = []
  const unreadable = []

  const compare = (op, bound) => {
    const token = /^\u0000(\d+)\u0000$/.exec(bound)
    const pixels = token ? null : lengthInPixels(bound)
    if (pixels === null) unreadable.push(token ? values[Number(token[1])] : bound.trim())
    else changes.push(changesAt(op, pixels))
  }

  const judgeGroup = (inner) => {
    const feature = FEATURE.exec(inner)
    if (feature) {
      compare({ min: '>=', max: '<=' }[feature[1]?.toLowerCase()] ?? '=', feature[2])
      return
    }
    // Range syntax: `width > 1500px`, `1500px < width`, `1000px <= width <= 1600px`.
    const [a, op1, b, op2, c] = inner.split(/(<=|>=|<|>|=)/).map((part) => part.trim())
    if (op2 === undefined && op1 !== undefined) {
      if (RANGE_FEATURE.test(a)) compare(op1, b)
      else if (RANGE_FEATURE.test(b)) compare(FLIPPED[op1], a)
    } else if (op2 !== undefined && RANGE_FEATURE.test(b)) {
      compare(FLIPPED[op1], a)
      compare(op2, c)
    }
  }

  // Innermost group first, each replaced by a stand-in so that the group around it is read without what it holds.
  let rest = text
  for (let match = GROUP.exec(rest); match; match = GROUP.exec(rest)) {
    const [whole, name, inner] = match
    let standIn = '\u0001'
    if (VALUE_FUNCTIONS.has(name.toLowerCase())) {
      if (name.toLowerCase() === 'calc' && lengthInPixels(inner) !== null) standIn = inner.trim()
      else standIn = `\u0000${values.push(whole) - 1}\u0000`
    } else {
      judgeGroup(inner)
    }
    rest = rest.slice(0, match.index) + standIn + rest.slice(match.index + whole.length)
  }

  const top = Math.max(...changes)
  return {
    raiseTo: changes.length > 0 && top > widest ? top : null,
    unreadable: unreadable.length > 0 ? unreadable.join(', ') : null,
  }
}

// `found` is [{ sheet, rule, condition }]: the style sheet a rule was found in, the rule as it is shown ("@media (...)"),
// and the condition's text. Returns the sentences for the rules the check cannot stand behind, in the order found.
export function ceilingProblems(found, widest) {
  const problems = []
  for (const { sheet, rule, condition } of found) {
    const { raiseTo, unreadable } = judgeCondition(condition, widest)
    if (unreadable !== null) {
      problems.push(
        `${sheet} has ${rule}, and the check cannot read "${unreadable}" as a width, so it cannot tell whether the page is measured where the rule applies; write the width in px, em or rem`,
      )
    }
    if (raiseTo !== null) {
      problems.push(
        `${sheet} has ${rule}, which changes the page above the widest window the check measures (${widest}px): raise WIDEST in packages/site-check/src/widths.mjs to at least ${raiseTo}`,
      )
    }
  }
  return problems
}
