// The page's font (justsnap-site::CON-006): the text is set in the system font stack and the page loads no web font.
// Read from what the build produced: every font declaration of the stylesheets names only families of the system
// stack; no stylesheet declares a @font-face, imports another stylesheet or points at a font file; no page links a
// stylesheet or a font from another origin; and the built site holds no font file.
//
// Not covered: which installed face a browser picks from the stack.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import postcss from 'postcss'
import { beforeAll, describe, expect, inject, test } from 'vitest'

/** The families the page's stack may name: the system's interface faces, the CJK system faces, and the generic family */
const SYSTEM_FAMILIES = ['-apple-system', 'blinkmacsystemfont', 'system-ui', 'segoe ui', 'pingfang sc', 'hiragino sans gb', 'sans-serif', 'inherit']
const FONT_FILE = /\.(?:woff2?|ttf|otf|eot)(?![a-z0-9])/i

const files: string[] = []
const stylesheets: { name: string; css: string }[] = []
const pages: { name: string; document: Document }[] = []

/** Every file under a directory, as paths relative to it */
function walk(dir: string, prefix = ''): string[] {
  return readdirSync(join(dir, prefix), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(dir, join(prefix, entry.name)) : [join(prefix, entry.name)]
  )
}

beforeAll(() => {
  const outDir = inject('builtSite')
  files.push(...walk(outDir))
  for (const name of files) {
    if (name.endsWith('.css')) stylesheets.push({ name, css: readFileSync(join(outDir, name), 'utf8') })
    if (name.endsWith('.html')) {
      const document = new JSDOM(readFileSync(join(outDir, name), 'utf8')).window.document
      pages.push({ name, document })
      // Astro may inline a small stylesheet into the page
      document.querySelectorAll('style').forEach((style, i) => stylesheets.push({ name: `${name} <style> ${i + 1}`, css: style.textContent ?? '' }))
    }
  }
})

/** The families a `font` or `font-family` value names, in order, as the browser reads them */
function families(prop: string, value: string): string[] {
  const list = prop === 'font' ? value.replace(/^.*?\d(?:px|rem|em|%)(?:\/[\d.]+(?:px|rem|em|%)?)?\s+/, '') : value
  return list.split(',').map((family) => family.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
}

describe('the text is set in the system font stack', () => {
  test('every font declaration of the stylesheets names only families of the system stack', () => {
    const declared: { where: string; family: string }[] = []
    for (const { name, css } of stylesheets) {
      postcss.parse(css).walkDecls(/^font(?:-family)?$/, (decl) => {
        const value = decl.value.replace(/\s+/g, ' ')
        // `font: inherit` and the like name no family of their own
        for (const family of families(decl.prop, value)) declared.push({ where: `${name}: ${decl.prop}: ${value}`, family })
      })
    }
    // The page declares at least the body's stack, and the zero-iteration case would pass for any stylesheet
    expect(declared.length).toBeGreaterThan(0)
    expect(declared.filter((d) => !SYSTEM_FAMILIES.includes(d.family)).map((d) => d.where)).toEqual([])
  })

  test('the body names the system faces, in order, ending on the generic family', () => {
    let stack: string[] = []
    for (const { css } of stylesheets) {
      postcss.parse(css).walkRules('body', (rule) => {
        rule.walkDecls('font', (decl) => void (stack = families('font', decl.value.replace(/\s+/g, ' '))))
      })
    }
    expect(stack).toEqual(['-apple-system', 'blinkmacsystemfont', 'segoe ui', 'pingfang sc', 'hiragino sans gb', 'sans-serif'])
  })
})

describe('the page loads no web font', () => {
  test('the build holds stylesheets and pages to check, and no font file', () => {
    expect(stylesheets.length).toBeGreaterThan(0)
    expect(pages.map((p) => p.name).sort()).toEqual(['en/index.html', 'index.html'])
    expect(files.filter((name) => FONT_FILE.test(name))).toEqual([])
  })

  test('no stylesheet declares a @font-face, imports another stylesheet or points at a font file', () => {
    const found: string[] = []
    for (const { name, css } of stylesheets) {
      const root = postcss.parse(css)
      root.walkAtRules(/^(?:font-face|import)$/i, (rule) => void found.push(`${name}: @${rule.name} ${rule.params}`))
      root.walkDecls((decl) => {
        if (FONT_FILE.test(decl.value)) found.push(`${name}: ${decl.prop}: ${decl.value}`)
      })
    }
    expect(found).toEqual([])
  })

  test.each(['index.html', 'en/index.html'])('%s links no stylesheet and no font from another origin', (name) => {
    const document = pages.find((p) => p.name === name)!.document
    const links = [...document.querySelectorAll('link[rel~="stylesheet"], link[as="font"]')]
    expect(links.filter((link) => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(link.getAttribute('href') ?? '')).map((link) => link.outerHTML)).toEqual([])
  })
})
