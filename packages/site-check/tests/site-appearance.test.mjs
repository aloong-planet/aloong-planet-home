// site-appearance::REQ-001 and site-appearance::QR-001/AC-01 in a real browser. This tests the homepage site's behaviour, not the
// checker: it builds apps/home, serves the build the way the width check does (src/server.mjs, with the answers sites/home.json
// gives for the homepage's backend) and switches Chromium between the appearances the system can ask for. It lives in this
// package because this package is the project's browser suite. It builds apps/home/dist (once per run of the package's tests,
// tests/global-setup.mjs, and the other browser files read that one build), so run it when no dev server is serving that folder.
// The palette the stylesheets declare is checked without a browser by apps/home/tests/palette.test.mjs. What the menus, the not-found
// buttons and the covers that fail to load look like in each appearance is read by the browser file of each of those features
// (nav-menus.test.mjs, not-found.test.mjs, blog.test.mjs), because it is that feature's rule they assert.
//
// Every page of the build is opened: the pages are the .html files of dist, found on disk, and each is classified into a page kind by
// what it contains. A page that fits no kind fails a case of its own, so a new kind of page cannot go unmeasured. The languages are
// those the pages declare, so a language the site starts to serve is measured without an edit here.
//
// What this does not cover. Each item says what slips through and when it has to be added.
//   1. One browser. Chromium (Playwright's headless shell) stands for the browsers that follow prefers-color-scheme; add a second
//      engine when the site relies on a feature Chromium alone has.
//   2. The two states the system can ask for, plus no stated preference. Forced colours and other appearances are out of scope
//      (site-appearance's Out of Scope).
//   3. Text inside image files is not read, as the spec excludes it. A text drawn by a script onto a canvas is not read either; the
//      homepage has none.
//   4. Where a text sits inside a drawing, its ground is what the browser says is painted under the text's centre. A shape that takes
//      no pointer (pointer-events: none) is invisible to that, so a drawing that puts text over such a shape would be measured on
//      the ground beneath it. A text whose ground the browser cannot name at all fails the case instead of passing.
//   5. A figure that shows other texts after a click (the article and prototype views of the super-agent post, a playback's later steps)
//      is read in the state it loads in. Those texts are drawn in the figure's own colours, which are the same in both appearances
//      on the sheet; add the figure's controls to the case if a figure ever draws a state in a colour that is not.
//   6. A switch is recognised by what it says: a control (a button, a link, a summary, anything with a role, tabindex or click handler)
//      whose label, text, title, value, class, id or data attribute names an appearance (theme, mode, dark, light, night, contrast and
//      the Chinese words for them). A switch that calls itself something else slips through, and so does one that keeps its choice
//      only in memory; what shows that the page needs none is the next case, where every page follows the system with nothing clicked.
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { readDist } from '../src/pages.mjs'
import { contrast, luminance, rgbaOf } from './helpers/colour.mjs'
import { home, openPage, startHome } from './helpers/built-home.mjs'

const WIDTHS = [1280, 390]
const WINDOW_HEIGHT = 900
const TEST_LIMIT = 120_000
// Set to a folder to keep a screenshot of the first page of each kind and language at both widths, in both appearances.
const SHOTS = process.env.APPEARANCE_SHOTS_DIR

// The kinds of page the site has: what marks each, and the line of body text read in it (set in the page's own text colour).
const KINDS = [
  { name: 'homepage', marker: '.ap-hero', line: '.ap-intro h1' },
  { name: 'Blog page', marker: '.ap-blog', line: '.ap-blog h1' },
  { name: 'post page', marker: '.ap-article-page', line: '.ap-article-body p' },
  { name: 'not-found page', marker: '.ap-notfound', line: '.ap-notfound h1' },
]

// Runs in the page: the colours the page is painted in now, what the browser draws by itself in this appearance, what the page has
// kept, and a mark that only a page that has not been reloaded still carries.
function readAppearance(line) {
  const colourOf = (value) => {
    const probe = document.createElement('i')
    probe.style.color = value
    document.body.append(probe)
    const colour = getComputedStyle(probe).color
    probe.remove()
    return colour
  }
  // A form control that no stylesheet of the site styles: the colour the browser gives it follows the page's color-scheme.
  const field = document.createElement('input')
  document.body.append(field)
  const fieldGround = getComputedStyle(field).backgroundColor
  field.remove()
  // Every control that says it is an appearance switch (a button, a link, a summary, or anything with a role, a
  // tabindex or a click handler), by what the control says: its label, text, title, value, class, id or a data attribute names an
  // appearance (theme, mode, dark, light, night, contrast, and the Chinese words for them).
  function findSwitches() {
    const NAMES = /\b(theme|themes|appearance|mode|dark|light|night|day|moon|sun|contrast|scheme)\b|主题|外观|深色|浅色|暗色|亮色|夜间|日间|黑夜|白天|模式|配色/i
    return [...document.querySelectorAll('button, summary, a, input, select, textarea, [role], [tabindex], [onclick]')]
      .map((control) => {
        const said = [
          control.getAttribute('aria-label'),
          control.getAttribute('title'),
          control.getAttribute('value'),
          control.id,
          typeof control.className === 'string' ? control.className : '',
          ...[...control.attributes].filter((attribute) => attribute.name.startsWith('data-')).map((attribute) => `${attribute.name}=${attribute.value}`),
          // A link's words count only when they are as short as a switch's name; a post's title may well say "dark".
          control.tagName === 'A' && (control.textContent ?? '').trim().length > 12 ? null : (control.textContent ?? '').trim().slice(0, 40),
        ].filter(Boolean)
        return NAMES.test(said.join(' | ')) ? `${control.tagName.toLowerCase()} ${said.join(' | ')}` : null
      })
      .filter(Boolean)
  }
  const text = document.querySelector(line)
  return {
    ground: getComputedStyle(document.body).backgroundColor,
    paper: colourOf('var(--paper)'),
    text: text ? getComputedStyle(text).color : null,
    kept: window.keptAcrossChange === true,
    stored: localStorage.length + sessionStorage.length + document.cookie.split(';').filter((cookie) => cookie.trim()).length,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
    fieldGround,
    switches: findSwitches(),
  }
}

// Runs in the page: the figures of a post that draw a diagram (an svg that is not the larger-view button's icon), each with the
// element that carries the drawing in the page, whether it offers a larger view, what each of its drawings is on, and the colours of
// everything drawn in it. A figure whose drawing is an image file has no svg and is not listed.
function readDiagrams() {
  const PROPS = ['fill', 'stroke', 'stopColor', 'floodColor', 'color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor', 'boxShadow', 'textShadow']
  const drawn = (root) => [...root.querySelectorAll('*')].map((el) => `${el.tagName.toLowerCase()}.${typeof el.className === 'string' ? el.className : ''}\t${PROPS.map((property) => getComputedStyle(el)[property]).join('|')}`)
  const figures = [...document.querySelectorAll('.ap-article-body figure.fig')]
  return figures.flatMap((figure, at) => {
    const carrier = [...figure.children].find((child) => child.tagName !== 'FIGCAPTION' && !child.matches('.zoom-btn') && (child instanceof SVGSVGElement || child.querySelector('svg')))
    if (!carrier) return []
    const sheet = getComputedStyle(carrier)
    // What each drawing is on: the first background found from the drawing up to the figure.
    const grounds = [...(carrier instanceof SVGSVGElement ? [carrier] : []), ...carrier.querySelectorAll('svg')].map((svg) => {
      for (let node = svg; node && node !== figure; node = node.parentElement) {
        const background = getComputedStyle(node).backgroundColor
        if (!/^rgba\(.*, 0\)$/.test(background) && background !== 'transparent') return background
      }
      return 'none'
    })
    return [{ at, offersView: carrier.classList.contains('zoomable'), carrier: sheet.backgroundColor, sheetText: sheet.color, grounds, drawn: drawn(carrier) }]
  })
}

// Runs in the page: opens the larger view of figure `at`, as a click on its drawing area does, and says what it shows.
function openView(at) {
  const figure = document.querySelectorAll('.ap-article-body figure.fig')[at]
  const area = [...figure.children].find((child) => child.classList.contains('zoomable'))
  area.click()
  return !document.querySelector('.lightbox').hidden
}

// Runs in the page: the open larger view's sheet, its caption and the colours of the copy of the drawing.
function readView() {
  const PROPS = ['fill', 'stroke', 'stopColor', 'floodColor', 'color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor', 'boxShadow', 'textShadow']
  const sheet = document.querySelector('.lb-sheet')
  const holder = document.querySelector('.lb-figure')
  return {
    sheet: getComputedStyle(sheet).backgroundColor,
    sheetText: getComputedStyle(sheet).color,
    caption: getComputedStyle(document.querySelector('.lb-caption')).color,
    scrim: getComputedStyle(document.querySelector('.lightbox')).backgroundColor,
    drawn: [...holder.querySelectorAll('*')].map((el) => `${el.tagName.toLowerCase()}.${typeof el.className === 'string' ? el.className : ''}\t${PROPS.map((property) => getComputedStyle(el)[property]).join('|')}`),
  }
}

// Runs in the page: whether any image (or the dog's canvas), or anything it sits inside, is filtered, faded or blended; and what backs the given images.
function readImages(backed) {
  const staining = []
  // The homepage's dog is drawn by its idle image or, while it wags, by a canvas, and the page shows one and hides the other
  // (opacity 0 on the one not shown); so for those two the opacity is read as a pair below, and every other property here.
  const hidesOther = (node) => node.matches('.golden-idle, .golden-canvas')
  for (const img of document.querySelectorAll('img, canvas')) {
    for (let node = img; node; node = node.parentElement) {
      const style = getComputedStyle(node)
      const faded = style.opacity !== '1' && !(node === img && hidesOther(node))
      if (style.filter !== 'none' || faded || style.mixBlendMode !== 'normal' || style.backdropFilter !== 'none' || (style.maskImage ?? 'none') !== 'none') {
        staining.push(`${node === img ? 'image' : 'its ancestor'} ${node.tagName.toLowerCase()}.${node.className} (${img.getAttribute('src')})`)
      }
    }
  }
  const dog = [...document.querySelectorAll('.golden-idle, .golden-canvas')].map((node) => getComputedStyle(node).opacity).sort().join()
  if (dog && dog !== '0,1') staining.push(`the dog is shown by one of its idle image and its canvas at full opacity, not ${dog}`)
  const backing = []
  for (const selector of backed) {
    for (const img of document.querySelectorAll(selector)) {
      for (let node = img; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node)
        const bare = (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') && style.backgroundImage === 'none' && style.boxShadow === 'none' && style.borderTopWidth === '0px' && style.outlineStyle === 'none'
        if (!bare) backing.push(`${selector}: ${node === img ? 'itself' : node.tagName.toLowerCase() + '.' + node.className} has a background, border or shadow`)
      }
    }
  }
  return { count: document.querySelectorAll('img').length, staining, backing, found: backed.map((selector) => document.querySelectorAll(selector).length) }
}

// Runs in the page (Playwright serialises it, so it uses nothing outside itself): the colour of every line of visible text and the
// ground it is drawn on, read from what the browser painted in the current appearance. This is how the contrast of text is
// measured, since a stylesheet read alone cannot say what a text sits on when a drawing, a card or a sheet is between it and the page.
//
// The ground of an HTML text is the backgrounds from its element up to the first opaque one, laid over each other. The ground of
// a text inside a drawing is the first filled shape painted under the text's centre (the browser says which, by hit testing), and
// beneath that the HTML ground of the drawing. A text with an outline painted first (a halo, as a drawing's labels have where a line
// crosses them) is drawn on the halo, so the halo's colour laid over that ground is the ground it is measured on. Text in an image
// file is not text to the page and is not read.
//
// `accents` are the colours (as the browser writes them) of the post accent: text in one of them is held to 5:1, all other text to 4.5:1.
// Returns one row per visible text node: its first words, the element, the ratio it reached and the lowest it may reach, and the
// colours, and, for the language switch, whether the text is an item of it, whether that item is marked as current and whether it is a link.
function measureTexts(accents) {
  const parse = (value) => {
    const found = /^rgba?\(([^)]+)\)$/.exec(value.trim()) ?? /^color\(srgb ([^)]+)\)$/.exec(value.trim())
    if (!found) return null
    const scale = value.trim().startsWith('color(') ? 255 : 1
    const [r, g, b, a] = found[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    return { r: r * scale, g: g * scale, b: b * scale, a: a ?? 1 }
  }
  const over = (top, under) => {
    const a = top.a + under.a * (1 - top.a)
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
    const mix = (c) => (top[c] * top.a + under[c] * under.a * (1 - top.a)) / a
    return { r: mix('r'), g: mix('g'), b: mix('b'), a }
  }
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  const ancestorHidden = (el) => {
    for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).display === 'none') return true
    return false
  }
  const opacityOf = (el) => {
    let o = 1
    for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
    return o
  }
  const lay = (layers) => layers.reverse().reduce((under, layer) => over(layer, under), { r: 255, g: 255, b: 255, a: 1 })
  const htmlGround = (start) => {
    const layers = []
    for (let n = start; n; n = n.parentElement) {
      const bg = parse(getComputedStyle(n).backgroundColor)
      if (bg && bg.a > 0) {
        layers.push(bg)
        if (bg.a >= 1) break
      }
    }
    return lay(layers)
  }
  const rgb = (c) => `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)})`
  // Hit testing skips what takes no pointer, so while the page is read every element takes one.
  const takeAll = document.createElement('style')
  takeAll.textContent = '* { pointer-events: auto !important; }'
  document.head.append(takeAll)
  const rows = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const words = node.textContent.replace(/\s+/g, ' ').trim()
    const el = node.parentElement
    if (!words || !el || /^(SCRIPT|STYLE|NOSCRIPT|TITLE)$/.test(el.tagName)) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    let box = range.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) continue
    const style = getComputedStyle(el)
    if (style.visibility !== 'visible' || style.display === 'none') continue
    const drawn = el instanceof SVGElement
    const fg = parse(drawn ? style.fill : style.color)
    if (!fg) continue
    let ground
    let known = true
    if (!drawn) ground = htmlGround(el)
    else {
      // Hit testing sees only what is inside the window, so the drawing is brought into it first.
      if (box.top < 0 || box.bottom > innerHeight) {
        scrollTo({ top: scrollY + box.top - innerHeight / 2, behavior: 'instant' })
        box = range.getBoundingClientRect()
      }
      // A drawing that a script plays back shows and hides its groups while this runs; a text that has gone is not on the page now.
      // (Chromium still lays out a text that sets its own display inside a group that is hidden, so each ancestor is asked as well.)
      if (!el.checkVisibility({ checkVisibilityCSS: true }) || ancestorHidden(el)) continue
      const hits = document.elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2)
      const own = hits.indexOf(el)
      const layers = []
      known = own >= 0
      for (const hit of hits.slice(own + 1)) {
        if (hit instanceof SVGElement && !(hit instanceof SVGSVGElement)) {
          const shape = getComputedStyle(hit)
          const fill = shape.fill === 'none' ? null : parse(shape.fill)
          if (!fill) continue
          fill.a *= Number(shape.fillOpacity) * opacityOf(hit)
          if (fill.a > 0) {
            layers.push(fill)
            if (fill.a >= 1) break
          }
        } else {
          layers.push(htmlGround(hit))
          break
        }
      }
      ground = lay(layers)
      const halo = style.stroke === 'none' || !/^stroke/.test(style.paintOrder) || !(parseFloat(style.strokeWidth) > 0) ? null : parse(style.stroke)
      if (halo) ground = over({ ...halo, a: halo.a * Number(style.strokeOpacity) }, ground)
    }
    const shown = over({ ...fg, a: fg.a * opacityOf(el) * (drawn ? Number(style.fillOpacity) : 1) }, ground)
    const colour = rgb(drawn ? parse(style.fill) : parse(style.color))
    const minimum = accents.includes(colour) ? 5 : 4.5
    const classes = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : []
    rows.push({
      words: words.slice(0, 40),
      element: [el.tagName.toLowerCase(), ...classes].join('.'),
      drawing: drawn,
      known,
      ratio: Number(ratio(shown, ground).toFixed(2)),
      minimum,
      text: rgb(shown),
      ground: rgb(ground),
      inSwitch: Boolean(el.closest('.ap-lang')),
      current: el.hasAttribute('aria-current'),
      link: Boolean(el.closest('a')),
    })
  }
  takeAll.remove()
  scrollTo({ top: 0, behavior: 'instant' })
  return rows
}

describe('site-appearance on the built homepage site', { timeout: 600_000 }, () => {
  let browser
  let server
  let pages = []
  let unclassified = []

  const open = (context, url) => openPage(server, context, url)

  /** The first page of each kind and language: where one page stands for its kind. */
  const representatives = () => pages.filter((entry, at) => pages.findIndex((other) => other.kind === entry.kind && other.lang === entry.lang) === at)

  before(
    async () => {
      ;({ server, browser } = await startHome())
      const context = await browser.newContext({ viewport: { width: WIDTHS[0], height: WINDOW_HEIGHT } })
      const { pages: built } = await readDist(join(home, 'dist'))
      for (const { url } of built) {
        const page = await open(context, url)
        const found = await page.evaluate((kinds) => ({ lang: document.documentElement.lang, kind: kinds.find((kind) => document.querySelector(kind.marker))?.name ?? null }), KINDS)
        await page.close()
        if (found.kind) pages.push({ url, ...found, line: KINDS.find((kind) => kind.name === found.kind).line })
        else unclassified.push(url)
      }
      await context.close()
    },
    { timeout: 300_000 },
  )

  after(async () => {
    await Promise.allSettled([browser?.close(), server?.close()])
  })

  test('every built page is of one of the four kinds, and every kind is built', () => {
    assert.deepEqual(unclassified, [], 'a page that is none of the homepage, the Blog page, a post page or the not-found page')
    assert.deepEqual([...new Set(pages.map((entry) => entry.kind))].sort(), KINDS.map((kind) => kind.name).sort())
    assert.ok(pages.every((entry) => entry.lang), 'every page declares its language')
  })

  // A floor under site-appearance::REQ-001 for the pages of site-languages::REQ-001. The cases below take their pages and their languages
  // from the built folder, so a build that lost one language's pages, or pages that declare another language than their own, would leave
  // them measuring the other language alone and still pass. This asks for the three kinds of page that have a version in each language;
  // a post page is not one of them, and the first case above holds that every kind is built.
  test('the homepage, the Blog page and the not-found page are each read in Chinese and in English', () => {
    const read = [...new Set(pages.map((entry) => `${entry.kind} (${entry.lang})`))].sort()
    for (const lang of ['zh-CN', 'en']) {
      for (const kind of ['homepage', 'Blog page', 'not-found page']) {
        assert.ok(read.includes(`${kind} (${lang})`), `no ${kind} in ${lang} was read; the pages read are ${read.join(', ')}`)
      }
    }
  })

  test('every page follows the system from light to dark and back without a reload, at both widths, and offers no switch', { timeout: TEST_LIMIT * 10 }, async (t) => {
    for (const entry of pages) {
      await t.test(`${entry.kind} ${entry.url} (${entry.lang})`, { timeout: TEST_LIMIT }, async () => {
        const context = await browser.newContext({ colorScheme: 'light', viewport: { width: WIDTHS[0], height: WINDOW_HEIGHT } })
        try {
          const page = await open(context, entry.url)
          await page.evaluate(() => {
            window.keptAcrossChange = true
          })
          const shoot = SHOTS && representatives().includes(entry)
          if (shoot) await mkdir(SHOTS, { recursive: true })
          for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: WINDOW_HEIGHT })
            const seen = []
            for (const scheme of ['light', 'dark', 'light']) {
              await page.emulateMedia({ colorScheme: scheme })
              await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
              // The change starts the transitions some elements have (the navigation links' colour, the buttons' fill); they end before
              // the page is read and shot, so a screenshot shows the appearance and not a colour halfway between the two.
              await page.evaluate(() => Promise.all(document.getAnimations().filter((animation) => animation instanceof CSSTransition).map((animation) => animation.finished.catch(() => {}))))
              seen.push({ scheme, ...(await page.evaluate(readAppearance, entry.line)) })
              if (shoot && seen.length < 3) await page.screenshot({ path: join(SHOTS, `${entry.kind.replace(/\W+/g, '-')}-${entry.lang}-${width}-${scheme}.png`) })
            }
            const [light, dark, back] = seen
            const at = `at ${width}px`
            assert.ok(luminance(light.ground) > 0.85 && luminance(light.text) < 0.2, `${at}: light is not a dark text on a light ground: ${JSON.stringify(light)}`)
            assert.ok(luminance(dark.ground) < 0.05 && luminance(dark.text) > 0.5, `${at}: dark is not a light text on a dark ground: ${JSON.stringify(dark)}`)
            assert.equal(dark.ground, dark.paper, `${at}: the dark ground is the page's own colour token`)
            assert.equal(light.ground, light.paper, `${at}: the light ground is the page's own colour token`)
            assert.deepEqual([back.ground, back.text], [light.ground, light.text], `${at}: back in light the page is as it was`)
            for (const state of seen) {
              assert.ok(state.kept, `${at}: the page was reloaded when the system changed to ${state.scheme}`)
              assert.ok(contrast(state.text, state.ground) >= 4.5, `${at}: ${state.scheme}: the line of text reads ${contrast(state.text, state.ground).toFixed(2)}:1`)
              assert.equal(state.stored, 0, 'the page keeps nothing in the browser (no storage, no cookie)')
              assert.deepEqual(state.switches, [], 'the page offers no switch')
              // The page tells the browser it has both appearances, so what the browser draws itself (a form control, the scroll bar,
              // the canvas before the first paint) is drawn in the appearance the system asks for.
              assert.equal(state.colorScheme, 'light dark', `${at}: the page's color-scheme`)
              if (state.scheme === 'dark') assert.ok(luminance(state.fieldGround) < 0.15, `${at}: a form control the browser draws is ${state.fieldGround} in dark`)
              else assert.ok(luminance(state.fieldGround) > 0.85, `${at}: a form control the browser draws is ${state.fieldGround} in light`)
            }
          }
        } finally {
          await context.close()
        }
      })
    }
  })

  test('with no stated preference every kind of page shows its light appearance', { timeout: TEST_LIMIT * 4 }, async (t) => {
    for (const entry of representatives()) {
      await t.test(`${entry.kind} (${entry.lang})`, { timeout: TEST_LIMIT }, async () => {
        const context = await browser.newContext({ colorScheme: 'no-preference', viewport: { width: WIDTHS[0], height: WINDOW_HEIGHT } })
        try {
          const page = await open(context, entry.url)
          const state = await page.evaluate(readAppearance, entry.line)
          assert.ok(luminance(state.ground) > 0.85 && luminance(state.text) < 0.2, JSON.stringify(state))
        } finally {
          await context.close()
        }
      })
    }
  })

  test('in dark the first frame is already dark, before any script could have changed it', { timeout: TEST_LIMIT * 4 }, async (t) => {
    for (const entry of representatives()) {
      await t.test(`${entry.kind} (${entry.lang})`, { timeout: TEST_LIMIT }, async () => {
        const context = await browser.newContext({ colorScheme: 'dark', viewport: { width: WIDTHS[0], height: WINDOW_HEIGHT } })
        try {
          // The first animation frame of a page runs just before its first paint, once the stylesheets in its head have been applied.
          await context.addInitScript(() => {
            window.firstFrame = null
            requestAnimationFrame(() => {
              window.firstFrame = document.body ? getComputedStyle(document.body).backgroundColor : 'no body'
            })
          })
          const page = await open(context, entry.url)
          const first = await page.evaluate(() => window.firstFrame)
          assert.ok(first && luminance(first) < 0.05, `the first frame's ground is ${first}`)
        } finally {
          await context.close()
        }
      })
    }
  })

  test('with scripting off the dark appearance is still shown, and a page still follows the system', { timeout: TEST_LIMIT * 4 }, async (t) => {
    const helper = await (await browser.newContext()).newPage()
    /** The colour a one-pixel screenshot holds, decoded in a page that has scripting. */
    const pixel = async (png) =>
      helper.evaluate(async (base64) => {
        const image = new Image()
        image.src = `data:image/png;base64,${base64}`
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0)
        return [...context.getImageData(0, 0, 1, 1).data]
      }, png.toString('base64'))
    // The left margin of every page, below the header, is the page's ground.
    const clip = { x: 2, y: 600, width: 1, height: 1 }
    for (const entry of representatives()) {
      await t.test(`${entry.kind} (${entry.lang})`, { timeout: TEST_LIMIT }, async () => {
        const context = await browser.newContext({ colorScheme: 'dark', javaScriptEnabled: false, viewport: { width: WIDTHS[0], height: WINDOW_HEIGHT } })
        try {
          const page = await context.newPage()
          await page.route('**/*', (route) => (new URL(route.request().url()).origin === server.origin ? route.continue() : route.abort()))
          await page.goto(server.origin + entry.url, { waitUntil: 'load' })
          const [dark] = await pixel(await page.screenshot({ clip }))
          assert.ok(dark < 60, `with scripting off in dark the page's ground reads ${dark} of 255`)
          await page.emulateMedia({ colorScheme: 'light' })
          const [light] = await pixel(await page.screenshot({ clip }))
          assert.ok(light > 200, `with scripting off, a system that changes to light shows a ground that reads ${light} of 255`)
        } finally {
          await context.close()
        }
      })
    }
    await helper.context().close()
  })

  for (const scheme of ['light', 'dark']) {
    test(`every text of every page keeps its contrast in the ${scheme} appearance`, { timeout: TEST_LIMIT * 10 }, async (t) => {
      for (const entry of pages) {
        await t.test(`${entry.kind} ${entry.url} (${entry.lang})`, { timeout: TEST_LIMIT }, async () => {
          const context = await browser.newContext({ colorScheme: scheme, viewport: { width: WIDTHS[0], height: WINDOW_HEIGHT } })
          try {
            const page = await open(context, entry.url)
            // The post accent is the colour of the page's green tokens; only a page with an article has them.
            const accents = await page.evaluate(() => {
              if (!document.querySelector('.ap-article')) return []
              return ['var(--green)', 'var(--green-deep)'].map((value) => {
                const probe = document.createElement('i')
                probe.style.color = value
                document.querySelector('.ap-article').append(probe)
                const colour = getComputedStyle(probe).color.replace(/^rgb\((\d+), (\d+), (\d+)\)$/, 'rgb($1 $2 $3)')
                probe.remove()
                return colour
              })
            })
            const rows = await page.evaluate(measureTexts, accents)
            assert.ok(rows.length >= 5, `only ${rows.length} texts were read`)
            // A floor under site-appearance::QR-001/AC-01 for the language switch (site-languages::REQ-003/AC-02): its item for the page's own
            // language and its link must be among the rows, so a page whose switch is missing from its markup, whose header is not mounted or
            // whose switch is display: none fails here and not unmeasured; the ratio check below holds each row to its minimum.
            const items = rows.filter((row) => row.inSwitch)
            const own = items.filter((row) => row.current)
            const others = items.filter((row) => !row.current)
            assert.equal(own.length, 1, `the language switch holds ${own.length} items marked as the page's language (${items.map((row) => row.words).join(', ')})`)
            assert.ok(!own[0].link, 'the page\'s own language is marked text, not a link')
            assert.ok(others.length >= 1 && others.every((row) => row.link), `the language switch's other items are links (${others.map((row) => row.words).join(', ')})`)
            const unknown = rows.filter((row) => !row.known).map((row) => `${row.element} "${row.words}"`)
            assert.deepEqual(unknown, [], 'a drawing text whose ground the browser could not name')
            const below = rows.filter((row) => row.ratio < row.minimum)
            const grouped = new Map()
            for (const row of below) {
              const key = `${row.drawing ? 'drawing' : 'page'} ${row.element} ${row.text} on ${row.ground} is ${row.ratio}:1, under ${row.minimum}:1`
              grouped.set(key, [...(grouped.get(key) ?? []), row.words])
            }
            assert.deepEqual([...grouped].map(([key, words]) => `${words.length} x ${key} (${words.slice(0, 3).join(' | ')})`), [])
          } finally {
            await context.close()
          }
        })
      }
    })
  }

  const same = (before, after) => before.map((line, at) => (line === after[at] ? null : `${line.split('\t')[0]}: ${line.split('\t')[1]} became ${after[at]?.split('\t')[1]}`)).filter(Boolean)

  test('in dark a diagram sits on a light sheet and keeps its light colours, in the page and in the larger view', { timeout: TEST_LIMIT * 10 }, async (t) => {
    let diagrams = 0
    let views = 0
    for (const entry of pages.filter((candidate) => candidate.kind === 'post page')) {
      await t.test(`${entry.url}`, { timeout: TEST_LIMIT }, async () => {
        const context = await browser.newContext({ colorScheme: 'dark', viewport: { width: WIDTHS[0], height: WINDOW_HEIGHT } })
        try {
          const page = await open(context, entry.url)
          const dark = await page.evaluate(readDiagrams)
          await page.emulateMedia({ colorScheme: 'light' })
          const light = await page.evaluate(readDiagrams)
          assert.equal(dark.length, light.length)
          diagrams += dark.length
          dark.forEach((figure, at) => {
            const name = `figure ${figure.at}`
            assert.ok(figure.grounds.length > 0, `${name}: no drawing found`)
            for (const ground of figure.grounds) assert.ok(ground !== 'none' && luminance(ground) >= 0.8 && rgbaOf(ground).a === 1, `${name}: in dark a drawing is on ${ground}`)
            // A drawing area with no ground of its own in light (the figure sits straight on the page) gets the sheet; one that has its
            // own (a post's frame of cells) keeps it, in the same colour.
            if (rgbaOf(light[at].carrier).a === 0) assert.ok(luminance(figure.carrier) >= 0.8 && rgbaOf(figure.carrier).a === 1, `${name}: in dark the drawing area's sheet is ${figure.carrier}`)
            else assert.equal(figure.carrier, light[at].carrier, `${name}: the drawing area's own ground`)
            assert.equal(figure.sheetText, light[at].sheetText, `${name}: the text colour of the drawing area`)
            assert.deepEqual(same(light[at].drawn, figure.drawn), [], `${name}: a colour inside the drawing changed with the appearance`)
          })
          // The larger view, for every figure that offers one: it is the same figure on a white sheet in both appearances.
          for (const figure of dark.filter((candidate) => candidate.offersView)) {
            const seen = []
            for (const scheme of ['dark', 'light']) {
              await page.emulateMedia({ colorScheme: scheme })
              assert.ok(await page.evaluate(openView, figure.at), `figure ${figure.at} did not open its larger view`)
              seen.push(await page.evaluate(readView))
              await page.keyboard.press('Escape')
            }
            const [inDark, inLight] = seen
            views++
            assert.equal(inDark.sheet, 'rgb(255, 255, 255)', `figure ${figure.at}: the larger view's sheet in dark`)
            assert.equal(inLight.sheet, 'rgb(255, 255, 255)', `figure ${figure.at}: the larger view's sheet in light`)
            assert.equal(inDark.caption, inLight.caption, `figure ${figure.at}: the caption sits on the white sheet in both appearances`)
            assert.ok(contrast(inDark.caption, inDark.sheet) >= 4.5, `figure ${figure.at}: the caption on the sheet`)
            assert.equal(inDark.sheetText, inLight.sheetText)
            assert.ok(inDark.drawn.length > 0, `figure ${figure.at}: the larger view shows no drawing`)
            assert.deepEqual(same(inLight.drawn, inDark.drawn), [], `figure ${figure.at}: a colour inside the larger view changed with the appearance`)
            assert.notEqual(inDark.scrim, inLight.scrim, 'the see-through layer is set for each appearance')
          }
        } finally {
          await context.close()
        }
      })
    }
    assert.ok(diagrams >= 20, `only ${diagrams} diagrams were found in the posts`)
    assert.ok(views >= 10, `only ${views} larger views were opened`)
  })

  test('a .ground that holds only an image gets no sheet in either appearance', { timeout: TEST_LIMIT * 2 }, async () => {
    for (const scheme of ['light', 'dark']) {
      const context = await browser.newContext({ colorScheme: scheme, viewport: { width: WIDTHS[0], height: WINDOW_HEIGHT } })
      try {
        let imageGrounds = 0
        for (const entry of pages.filter((candidate) => candidate.kind === 'post page')) {
          const page = await open(context, entry.url)
          const grounds = await page.evaluate(() => [...document.querySelectorAll('.fig > .ground')].filter((ground) => !ground.querySelector('svg')).map((ground) => getComputedStyle(ground).backgroundColor))
          for (const ground of grounds) assert.equal(rgbaOf(ground).a, 0, `${entry.url} in ${scheme}: a figure of an image has a ground: ${ground}`)
          imageGrounds += grounds.length
          await page.close()
        }
        assert.ok(imageGrounds >= 1, 'no figure of an image was found')
      } finally {
        await context.close()
      }
    }
  })

  test('no image is filtered, faded or blended in either appearance, and the site icon has one colour scheme', { timeout: TEST_LIMIT * 4 }, async (t) => {
    const backed = ['.ap-person', '.golden-idle', '.ap-notfound-dog']
    let found = [0, 0, 0]
    for (const scheme of ['light', 'dark']) {
      for (const entry of pages) {
        await t.test(`${scheme} ${entry.url}`, { timeout: TEST_LIMIT }, async () => {
          const context = await browser.newContext({ colorScheme: scheme, viewport: { width: WIDTHS[0], height: WINDOW_HEIGHT } })
          try {
            const page = await open(context, entry.url)
            const images = await page.evaluate(readImages, backed)
            assert.deepEqual(images.staining, [])
            // The portrait and the dog show over the page's ground with nothing behind them (the transparent image over the dark ground).
            assert.deepEqual(images.backing, [])
            found = found.map((count, at) => count + images.found[at])
            const icons = await page.evaluate(() => [...document.querySelectorAll('link[rel~="icon"]')].map((link) => link.getAttribute('media')))
            assert.deepEqual(icons, icons.length ? [null] : [], 'the page has one site icon and it does not depend on the appearance')
          } finally {
            await context.close()
          }
        })
      }
    }
    assert.ok(found.every((count) => count > 0), `the portrait, the dog and the not-found dog were each found, counts ${found}`)
    const icon = await (await fetch(`${server.origin}/favicon.svg`)).text()
    assert.doesNotMatch(icon, /prefers-color-scheme/, 'the site icon is one image in both appearances')
  })
})
