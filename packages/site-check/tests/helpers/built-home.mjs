// What the browser cases of the homepage site (apps/home) share: its build, the server and browser that open it, a page opened the way
// the width check opens one, and the pages of the build that hold a given element.
//
// The build is made once for a whole run of this package's tests: tests/global-setup.mjs (named by the package's test script as
// --test-global-setup) builds apps/home/dist before any test file starts and says so in SITE_CHECK_HOME_BUILT, which every test file
// inherits. A file run on its own, without that setup, builds the folder itself, so it never reads a build left by an earlier change.
// Every file only reads the folder after that, so the files can run side by side.
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from 'playwright'
import { readDist } from '../../src/pages.mjs'
import { startServer } from '../../src/server.mjs'
import { loadSiteConfig } from '../../src/site-config.mjs'

export const root = fileURLToPath(new URL('../../../..', import.meta.url))
export const home = join(root, 'apps/home')
export const BUILT = 'SITE_CHECK_HOME_BUILT'

/** Builds apps/home/dist, unless this run's global setup has just done so. */
export async function buildHome() {
  if (process.env[BUILT] === '1') return
  await promisify(execFile)('pnpm', ['run', 'build'], { cwd: home, timeout: 120_000 })
}

/** The build, a server that answers it the way the host does (with the fixtures sites/home.json gives), and a browser. */
export async function startHome() {
  await buildHome()
  const config = await loadSiteConfig(join(root, 'packages/site-check/sites'), 'home')
  const server = await startServer({ dist: join(home, 'dist'), fixtures: config.fixtures })
  const browser = await chromium.launch()
  return { server, browser }
}

/** Opens a page the way the width check does: only the local server answers, so the page is measured without the network. */
export async function openPage(server, context, url) {
  const page = await context.newPage()
  await page.route('**/*', (route) => (new URL(route.request().url()).origin === server.origin ? route.continue() : route.abort()))
  await page.goto(server.origin + url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  return page
}

/** The addresses of the pages of the build that hold an element matching `selector`, in every language the build has. */
export async function pagesHolding(server, browser, selector) {
  const { pages } = await readDist(join(home, 'dist'))
  const context = await browser.newContext()
  const found = []
  try {
    for (const { url } of pages) {
      const page = await openPage(server, context, url)
      if (await page.evaluate((marker) => document.querySelector(marker) !== null, selector)) found.push(url)
      await page.close()
    }
  } finally {
    await context.close()
  }
  return found
}
