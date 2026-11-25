// The page's own palette, light and dark (agentshed-site::REQ-006, Failure D1): every token is declared in both
// appearances. The site owns its colours, so nothing here compares them with the app's theme file (ADR-0001 of this
// repository, option 8).
import { expect, test } from 'vitest'
import { palette } from '@aloong-planet/site-kit/testing/palette'

const site = palette(new URL('./global.css', import.meta.url))

test('every token is declared in light and again in dark', () => {
  expect(site.light.size).toBeGreaterThan(10)
  expect([...site.dark.keys()].sort()).toEqual([...site.light.keys()].sort())
})
