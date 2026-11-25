// Colour arithmetic and a token reader that the browser cases of the homepage site share. Colours are the strings a browser gives
// for a computed colour (`rgb(r, g, b)` or `rgba(r, g, b, a)`); the contrast is WCAG 2's.
const channels = (css) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

export const luminance = (css) => {
  const [r, g, b] = channels(css)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export const rgbaOf = (css) => {
  const [r, g, b, a = 1] = (css.match(/[\d.]+/g) ?? []).map(Number)
  return { r, g, b, a }
}

/** Runs in the page: what each of the given custom properties (`--paper`, ...) is in the appearance the page shows now, as a computed colour. */
export function readTokens(names) {
  const colourOf = (value) => {
    const probe = document.createElement('i')
    probe.style.color = value
    document.body.append(probe)
    const colour = getComputedStyle(probe).color
    probe.remove()
    return colour
  }
  return Object.fromEntries(names.map((name) => [name, colourOf(`var(${name})`)]))
}
