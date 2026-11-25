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
// Returns one row per text node: its first words, the element, the ratio it reached and the lowest it may reach, and the colours.
export function measureTexts(accents) {
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
    })
  }
  takeAll.remove()
  scrollTo({ top: 0, behavior: 'instant' })
  return rows
}
