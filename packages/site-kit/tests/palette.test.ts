// The palette reader the sites' palette and colour tests share: a stylesheet's `:root` custom properties, as the light
// appearance's tokens (top-level `:root`) and the dark one's (`:root` under the dark media query).
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { palette } from '../src/testing/palette'

let dir: string
let count = 0
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'site-kit-palette-'))
})
afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

/** A stylesheet with this text, as a file the reader can take a URL of */
function sheet(css: string): URL {
  const file = join(dir, `sheet-${count++}.css`)
  writeFileSync(file, css)
  return pathToFileURL(file)
}

test('the top-level :root is the light palette and the :root under the dark media query is the dark one', () => {
  const { light, dark } = palette(
    sheet(`
      :root { --window: #ffffff; --text: #1d1d1f; }
      @media (prefers-color-scheme: dark) { :root { --window: #1c1c1e; --text: #f5f5f7; } }
    `)
  )
  expect([...light]).toEqual([['--window', '#ffffff'], ['--text', '#1d1d1f']])
  expect([...dark]).toEqual([['--window', '#1c1c1e'], ['--text', '#f5f5f7']])
})

describe('what is not a palette', () => {
  test('a :root under another media query is neither appearance', () => {
    const { light, dark } = palette(
      sheet(`
        :root { --a: #111111; }
        @media (min-width: 600px) { :root { --b: #222222; } }
        @media (prefers-color-scheme: light) { :root { --c: #333333; } }
        @media (prefers-color-scheme: dark) { :root { --d: #444444; } }
      `)
    )
    expect([...light.keys()]).toEqual(['--a'])
    expect([...dark.keys()]).toEqual(['--d'])
  })

  test('a declaration that is not a custom property is left out', () => {
    const { light, dark } = palette(
      sheet(`
        :root { color-scheme: light dark; --a: #111111; }
        @media (prefers-color-scheme: dark) { :root { background: #000000; --a: #eeeeee; } }
      `)
    )
    expect([...light.keys()]).toEqual(['--a'])
    expect([...dark.keys()]).toEqual(['--a'])
  })

  test('a rule that is not :root is left out', () => {
    const { light, dark } = palette(
      sheet(`
        :root { --a: #111111; }
        body { --b: #222222; }
        @media (prefers-color-scheme: dark) { :root { --a: #eeeeee; } .card { --c: #333333; } }
      `)
    )
    expect([...light.keys()]).toEqual(['--a'])
    expect([...dark.keys()]).toEqual(['--a'])
  })
})

test('a value is read with its white space collapsed and in lower case, so equal colours compare equal', () => {
  const { light } = palette(
    sheet(`:root {
      --shadow: 0 1px  2px
        RGBA(0, 0, 0, .1);
      --accent: #ABCDEF;
    }`)
  )
  expect(light.get('--shadow')).toBe('0 1px 2px rgba(0, 0, 0, .1)')
  expect(light.get('--accent')).toBe('#abcdef')
})

test('a stylesheet with no dark block has an empty dark palette', () => {
  const { light, dark } = palette(sheet(':root { --a: #111111; }'))
  expect(light.size).toBe(1)
  expect(dark.size).toBe(0)
})
