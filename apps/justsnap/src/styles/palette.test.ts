// The page's palette (justsnap-site::QR-002, failure D1): every colour token is declared for the light appearance
// and again for the dark one, every text colour keeps at least 4.5:1 against the surface it sits on, and the text the
// page is read in takes the body colour. The accent is the blue the spec gives (justsnap-site::REQ-010).
//
// Not covered: that the page's ground and text colours are the values of the app's history page (justsnap-site::REQ-010),
// which the app's code holds, and that the interface icons are Lucide's: both were checked by comparing with the source.
import { readFileSync } from 'node:fs'
import { palette } from '@aloong-planet/site-kit/testing/palette'
import postcss, { type Root } from 'postcss'
import { describe, expect, test } from 'vitest'

const sheet = new URL('./global.css', import.meta.url)
const root: Root = postcss.parse(readFileSync(sheet, 'utf8'))
const { light, dark } = palette(sheet)

/** WCAG relative luminance of a #rrggbb colour */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

describe('the tokens', () => {
  test('every token is declared in light and again in dark, equal values or not', () => {
    expect(light.size).toBeGreaterThan(10)
    expect([...dark.keys()].sort()).toEqual([...light.keys()].sort())
  })
})

// justsnap-site::REQ-010: the spec's values, written out here as literals
describe('the accent is the "type" blue of the app', () => {
  test.each([
    { name: 'light', scheme: light, blue: '#1553b2' },
    { name: 'dark', scheme: dark, blue: '#9bc0ff' }
  ])('$name: $blue', ({ scheme, blue }) => {
    expect(scheme.get('--accent')).toBe(blue)
  })
})

describe('contrast of text on its surface (QR-002)', () => {
  /** [text token, surface token]: each pair that occurs in the page */
  const pairs: [string, string][] = [
    ['--text', '--window'],
    ['--text', '--surface'],
    ['--text', '--soft'],
    ['--muted', '--window'],
    ['--muted', '--surface'],
    ['--accent', '--window'],
    ['--accent', '--surface'],
    ['--accent', '--soft'],
    ['--on-accent', '--accent'],
    ['--on-accent', '--accent-hover']
  ]
  for (const [name, scheme] of [['light', light], ['dark', dark]] as const) {
    test.each(pairs)(`${name}: %s on %s is at least 4.5:1`, (text, surface) => {
      expect(contrast(scheme.get(text)!, scheme.get(surface)!)).toBeGreaterThanOrEqual(4.5)
    })
  }

  test('the check can fail: the muted colour on a surface it was not chosen for does not reach 4.5:1', () => {
    expect(contrast('#8a929d', '#f1f3f6')).toBeLessThan(4.5)
  })
})

describe('reading text', () => {
  const declared = (selector: string, prop: string): string[] => {
    const values: string[] = []
    root.walkRules((rule) => {
      if (rule.parent?.type !== 'root' && !(rule.parent?.type === 'atrule' && rule.parent.name === 'media')) return
      if (!rule.selectors.includes(selector)) return
      rule.walkDecls(prop, (d) => void values.push(d.value))
    })
    return values
  }

  test('the body is set in the body colour', () => {
    expect(declared('body', 'color')).toEqual(['var(--text)'])
  })

  // QR-002/AC-01: the hero's description, the features' text, the cards' text and the download area's line are in the
  // body colour, which they take by setting no colour of their own
  test.each(['.hero p.lead', '.f-head p', '.deck-text p', '.fs-step p', '.card p', '.dlbox .ver'])('%s sets no colour of its own', (selector) => {
    expect(declared(selector, 'color')).toEqual([])
  })

  test.each(['.dl .meta', '.foot'])('%s, a note, is in the muted colour', (selector) => {
    expect(declared(selector, 'color')).toEqual(['var(--muted)'])
  })
})
