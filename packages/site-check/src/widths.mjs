// The window widths a page is measured at, and the rule a measurement is judged by.

// Every whole pixel from 320 to 1440. Overflow does not grow steadily with the window (a media query can switch a
// fixed-width box on at 600px and off again at 700px), so sampling widths could step over the widths that fail.
export const WIDTHS = Array.from({ length: 1440 - 320 + 1 }, (_, i) => 320 + i)

// `measured` is what the browser reports at `width`: the window's own width, and the scroll width of the document
// element and of the body. The body is read as well because `overflow-x: hidden` on both html and body holds the
// document element to the window while the body is still wider. Returns null when the page fits, else a sentence.
export function widthProblem({ inner, doc, body }, width) {
  if (inner !== width) return `the window is ${inner}px wide, not the requested ${width}px, so this measures another width`
  const widest = Math.max(doc, body)
  if (widest > inner) return `the page is ${widest}px wide in a ${inner}px window`
  return null
}

// [320, 321, 322, 400] -> "320-322, 400". Expects the widths in ascending order.
export function formatWidths(widths) {
  const runs = []
  for (const w of widths) {
    const last = runs[runs.length - 1]
    if (last && w === last[1] + 1) last[1] = w
    else runs.push([w, w])
  }
  return runs.map(([from, to]) => (from === to ? `${from}` : `${from}-${to}`)).join(', ')
}
