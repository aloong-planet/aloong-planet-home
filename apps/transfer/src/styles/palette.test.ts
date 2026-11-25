// The page's palette: every colour token of the stylesheet is declared for the light appearance and again for the dark one,
// so a token added for one appearance cannot reach the other unchanged by being forgotten (AGENTS.md, "Transfer's site").
// A token whose value is a colour (a hex or an rgb() value, a shadow's included) is a colour token; the radius, the width
// and the font stack are not.
//
// Not covered: that a colour reaches a rule only through a token (the stylesheet and the components' own styles hold a few
// literals, such as the primary button's white text), and the contrast of text on its surface: neither is a requirement of
// this site's spec, and the contrast of its brand-coloured text is a finding in the delivery note of the move.
import { palette } from '@aloong-planet/site-kit/testing/palette'
import { expect, test } from 'vitest'

const { light, dark } = palette(new URL('./global.css', import.meta.url))
const colourTokens = [...light].filter(([, value]) => /#[0-9a-f]{3,8}\b|rgba?\(/.test(value)).map(([token]) => token)

test('every colour token is declared in light and again in dark, equal values or not', () => {
  // The rule must reach the tokens: a reader that found none would pass the check below with nothing to check
  expect(colourTokens.length).toBeGreaterThanOrEqual(10)
  expect(colourTokens.filter((token) => !dark.has(token))).toEqual([])
})

test('the dark block declares no token the light block does not', () => {
  expect([...dark.keys()].filter((token) => !light.has(token))).toEqual([])
})
