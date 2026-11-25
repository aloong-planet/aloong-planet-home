// The built homepage site in a real browser, for the browser cases of this package that open apps/home: it builds apps/home (through
// buildHome() of built-home.mjs, so the build the package's global setup has made is not made again), serves the build the way the
// width check does (src/server.mjs, with an answer for the visitor request) and launches headless Chromium. A case run on its own
// builds apps/home/dist itself, so it runs when no dev server is serving that folder, and this package's `test` script runs its files
// one at a time.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { startServer } from '../../src/server.mjs'
import { buildHome } from './built-home.mjs'

const root = fileURLToPath(new URL('../../../..', import.meta.url))
export const home = join(root, 'apps/home')

/**
 * Builds the homepage site, serves it twice (the visitor total is 1234 on `server`, 1 on `single`) and launches the browser.
 * `post` is the slug of the newest post, whose page the cases open as the page kind that has no English version.
 */
export async function startHomeSite() {
  await buildHome()
  const post = JSON.parse(await readFile(join(home, 'content/posts.json'), 'utf8'))[0].slug
  const server = await startServer({ dist: join(home, 'dist'), fixtures: [{ path: '/api/visitor', json: { total: 1234 } }] })
  const single = await startServer({ dist: join(home, 'dist'), fixtures: [{ path: '/api/visitor', json: { total: 1 } }] })
  const browser = await chromium.launch()
  return { browser, server, single, post }
}

export async function stopHomeSite(site) {
  await Promise.allSettled([site?.browser?.close(), site?.server?.close(), site?.single?.close()])
}

/**
 * Opens a page in a browser context where only the given origins answer (the page is measured without the network, as the width check
 * does) and hands the page to the check. The context is closed afterwards, whatever the check does. A request whose path matches
 * one of `blocked` (regular expressions) fails, as it would for a visitor whose connection drops it.
 */
export async function withPage(browser, origins, url, check, { width = 1280, blocked = [], ...context } = {}) {
  const browserContext = await browser.newContext({ viewport: { width, height: 900 }, ...context })
  try {
    const page = await browserContext.newPage()
    await page.route('**/*', (route) => {
      const { origin, pathname } = new URL(route.request().url())
      return origins.includes(origin) && !blocked.some((rule) => rule.test(pathname)) ? route.continue() : route.abort()
    })
    await page.goto(url, { waitUntil: 'networkidle' })
    return await check(page)
  } finally {
    await browserContext.close()
  }
}
