// Measuring a built site in a real browser: the build output is served locally, every page is opened, and at every
// width the page is asked how wide it is. What the page asks of the outside world is answered or refused here, so
// the measurement does not depend on the network.
import { affectsLayout } from './requests.mjs'
import { classifyLink, linkResolves } from './links.mjs'
import { readDist } from './pages.mjs'
import { startServer } from './server.mjs'
import { WIDTHS, widthProblem } from './widths.mjs'

const WINDOW_HEIGHT = 900
const PAGES_AT_ONCE = 8

// Read after the window has been resized and the page has had its turn to react (resize and media-query handlers
// run before the next frame), in the frame itself so that what is read is the laid-out page.
const readWidths = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() =>
      resolve({ inner: innerWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }),
    ),
  )

const readLinks = () =>
  [...document.querySelectorAll('a[href], area[href]')].map((a) => {
    try {
      return new URL(a.getAttribute('href'), a.baseURI).href
    } catch {
      return a.getAttribute('href')
    }
  })

const readText = () => document.body?.innerText.trim().length ?? 0

// An image marked loading="lazy" is fetched only once it is near the window, and a visitor scrolls to it, so every one
// is loaded before anything is measured: a wide image far below the first screen would otherwise never take its room.
// An image that fails to load counts as done here; its failure is reported by the request listeners.
const loadLazyImages = () =>
  Promise.all(
    [...document.images].map((image) => {
      image.loading = 'eager'
      if (image.complete) return undefined
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true })
        image.addEventListener('error', resolve, { once: true })
      })
    }),
  )

async function measurePage({ context, origin, url, files, config, widths }) {
  const problems = []
  const blocked = []
  const page = await context.newPage()
  try {
    // Everything that is not the local server is refused. A refused stylesheet, font, image or video changes what is
    // measured, so it fails the page and is named; the site then serves its own copy, or the check is given a fixture.
    await page.route('**/*', (route) => {
      const request = route.request()
      if (new URL(request.url()).origin === origin) return route.continue()
      blocked.push({ url: request.url(), type: request.resourceType() })
      return route.abort()
    })
    // A request to the local server that gets no good answer is a page that was not measured as a visitor sees it. The
    // browser also reports a stylesheet answered with 404 as a failed request, so one fault is reported once per URL.
    const reported = new Set()
    page.on('response', (response) => {
      if (new URL(response.url()).origin !== origin || response.status() < 400) return
      reported.add(response.url())
      problems.push(`${response.url()} was answered with ${response.status()}`)
    })
    page.on('requestfailed', (request) => {
      if (new URL(request.url()).origin !== origin || reported.has(request.url())) return
      problems.push(`${request.url()} failed: ${request.failure()?.errorText}`)
    })
    // A script that stopped with an error left the page as it was at that moment, not as a visitor gets it.
    page.on('pageerror', (error) => problems.push(`a script on the page threw: ${error.message}`))

    await page.setViewportSize({ width: widths[0], height: WINDOW_HEIGHT })
    await page.goto(origin + url, { waitUntil: 'networkidle' })
    await page.evaluate(loadLazyImages)
    await page.evaluate(() => document.fonts.ready)
    if ((await page.evaluate(readText)) === 0) problems.push('the page has no visible text')

    const violations = []
    let measured = 0
    for (const width of widths) {
      await page.setViewportSize({ width, height: WINDOW_HEIGHT })
      const problem = widthProblem(await page.evaluate(readWidths), width)
      measured += 1
      if (problem) violations.push({ width, problem })
    }
    if (measured !== widths.length) problems.push(`measured ${measured} of ${widths.length} widths`)

    const exceptions = new Set(config.linkExceptions.map((e) => e.path))
    const seen = new Set()
    for (const href of await page.evaluate(readLinks)) {
      const link = classifyLink(href, { localOrigin: origin, siteOrigin: config.origin })
      if (link.kind !== 'site' || seen.has(link.path)) continue
      seen.add(link.path)
      if (!linkResolves(link.path, files) && !exceptions.has(link.path)) problems.push(`link to ${link.path} lands on no built page or file`)
    }

    for (const request of blocked) {
      if (affectsLayout(request.type)) problems.push(`${request.type} ${request.url} is on another origin and is not loaded, so the page was measured without it`)
    }
    return { url, measured, violations, problems: [...new Set(problems)], blocked }
  } finally {
    await page.close()
  }
}

// Measures every page of `dist` at every width. Returns { pages: [{ url, measured, violations: [{ width, problem }],
// problems: [text], blocked: [{ url, type }] }] }, in the order of the pages' addresses. A page that does not fit has
// violations; a page that could not be measured as a visitor would see it has problems.
export async function measureSite({ browser, dist, config, widths = WIDTHS }) {
  const { files, pages } = await readDist(dist)
  const server = await startServer({ dist, fixtures: config.fixtures })
  let context
  try {
    context = await browser.newContext({ viewport: { width: widths[0], height: WINDOW_HEIGHT } })
    const results = new Array(pages.length)
    let next = 0
    const worker = async () => {
      while (next < pages.length) {
        const i = next++
        results[i] = await measurePage({ context, origin: server.origin, url: pages[i].url, files, config, widths })
      }
    }
    await Promise.all(Array.from({ length: Math.min(PAGES_AT_ONCE, pages.length) }, worker))
    return { pages: results }
  } finally {
    // Both are let go whatever happened: a context that cannot close (its browser is gone) must not leave the server
    // listening, which would keep the process alive, and closing neither may hide the error that is already on its way.
    await Promise.allSettled([context?.close(), server.close()])
  }
}
