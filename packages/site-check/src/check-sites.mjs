#!/usr/bin/env node
// The width check: opens every page of every site in the workspace in a real browser, at every whole window width from
// 320px to 1440px, and fails when any page is wider than the window (app-sites::QR-001/AC-01). It also fails a page
// whose style sheets hold a width condition that changes above 1440px, because the page is not measured beyond the change.
//
// What it does, in order: finds the sites (every folder of apps/ with a package.json), builds each with its own
// `build` script, finds the pages in each build's dist/ (every .html file, no list kept by hand), serves the dist
// the way Cloudflare Pages would, and measures. Each site has a config in packages/site-check/sites/<folder>.json
// (see site-config.mjs). Anything that stops a site from being measured is a failure of the run: no site, no config, no
// build, no page, no browser.
//
// What this check does NOT cover. Each item says what slips through and when it has to be added.
//   1. Non-integer widths. Windows are whole pixels (320, 321, ...); a page that overflows only at 400.5px, which
//      browser zoom and some displays produce, is not seen. Add them when a layout depends on fractional widths
//      (rounding of vw, rem or percentage widths) or a visitor reports an overflow that no whole width shows.
//   2. Classic scrollbars. The headless browser draws none, as on a phone, so the window is as wide as the page area. On a
//      desktop with classic scrollbars the page area is about 15px narrower and a page that fits with less than that to
//      spare overflows. Add a run with scrollbars (launch with ignoreDefaultArgs: ['--hide-scrollbars']) when any page
//      comes within about 15px of the window width at some width.
//   3. Overflowing content clipped by `overflow`. Content wider than the window inside an element with overflow hidden,
//      clip or auto does not widen the page, so it is not seen, and it is cut off or scrolled inside its own box. Add a
//      check of every element's right edge when a site clips or scrolls content by design and what it hides matters.
//   4. Open states. Each page is measured at rest. A menu opened by hover or click, a dialog or an accordion is not
//      opened, and a panel that is display:none at rest takes no room. A site that has an open state to measure adds a
//      per-site state hook that opens it before the widths are read.
//   5. Languages switched only by script. Each built file is measured in the language it is built in, so a site with a
//      file per language is covered. A language chosen at run time (a script swaps the text from a cookie, the browser's
//      language or a switch) is measured in its first state only. Such a site adds a per-site state hook that selects each
//      language, or builds a file for each.
//   6. Windows wider than 1440px. The requirement (app-sites::QR-001/AC-01) says "320px wide or wider" with no upper
//      end; the check measures up to 1440px (WIDEST in widths.mjs). A page whose style sheets hold a width condition
//      that changes above it (a media or container query, an @import's media, a <link> or <style> media, a constructed
//      sheet: a min-width above 1440px, or a max-width of 1440px or more) fails and is told how far to raise WIDEST, so a
//      rule such as a min-width of 1500px cannot hide an overflow. An em or rem bound in a container query fails too: it
//      follows the container's font size, which the style sheet does not give. Still not seen above 1440px: a script
//      that reads the window's width; sizes worked out from the window's width without a condition (calc(100vw - 1440px));
//      a condition on aspect-ratio, which a window above 1440px (900px high here) can bring about; a style sheet that a
//      script adds in answer to the window's width or that sits in a shadow root. Add what a site needs when it relies on
//      one of these.
//   7. A layout decided once, when the page loads. Each page is loaded at 320px and the window is then made each width
//      in turn, as a visitor who resizes would; a script that reads the window's width once at load and has no resize
//      handler is therefore seen only as it was set up at 320px. Add a second pass that loads the page afresh at each
//      width (or a per-site state hook) when a site has such a script.
// Windows narrower than 320px are outside the requirement and so outside the check.
//
// Usage: pnpm --filter @aloong-planet/site-check run check [--root <dir>] [--config-dir <dir>] [--no-build]
//   --root        the workspace (default: this repository)
//   --config-dir  the folder of site configs (default: packages/site-check/sites)
//   --no-build    measure what is already in each dist/ without building (for the tests of this check)
// Exit code 0 when every page of every site fits at every width, else 1.
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { measureSite } from './measure.mjs'
import { listSites } from './pages.mjs'
import { loadSiteConfig } from './site-config.mjs'
import { formatWidths } from './widths.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const INSTALL = 'pnpm --filter @aloong-planet/site-check exec playwright install --only-shell chromium'

function parseArgs(argv) {
  const options = { root: resolve(here, '../../..'), configDir: resolve(here, '../sites'), build: true }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--no-build') options.build = false
    else if (arg === '--root' || arg === '--config-dir') {
      if (argv[i + 1] === undefined) throw new Error(`${arg} needs a folder`)
      options[arg === '--root' ? 'root' : 'configDir'] = resolve(argv[++i])
    } else throw new Error(`unknown option ${arg}`)
  }
  return options
}

// Runs the site's own build script with the site as the working folder.
function build(site) {
  return new Promise((done, fail) => {
    const child = spawn('pnpm', ['run', 'build'], { cwd: site.dir, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.on('error', (error) => fail(new Error(`could not run the build of ${site.name}: ${error.message}`)))
    child.on('close', (code) => (code === 0 ? done() : fail(new Error(`the build of ${site.name} failed (exit code ${code}):\n${output.trim()}`))))
  })
}

async function requireBuildScript(site) {
  const manifest = JSON.parse(await readFile(join(site.dir, 'package.json'), 'utf8'))
  if (!manifest.scripts?.build) throw new Error(`${site.name} has no build script in its package.json, so there is nothing to measure`)
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function describe(name, pages, widthCount) {
  const violations = pages.reduce((sum, p) => sum + p.violations.length + p.problems.length, 0)
  const lines = [`${name}: ${plural(pages.length, 'page')} x ${widthCount} widths, ${plural(violations, 'violation')}`]
  for (const page of pages) {
    if (page.violations.length > 0) {
      const widths = formatWidths(page.violations.map((v) => v.width))
      lines.push(`  ${page.url} is wider than the window at ${widths}: ${page.violations[0].problem}`)
    }
    for (const problem of page.problems) lines.push(`  ${page.url}: ${problem}`)
  }
  return { violations, lines }
}

async function launch() {
  try {
    return await chromium.launch()
  } catch (error) {
    if (/Executable doesn't exist/.test(error.message)) throw new Error(`the browser is not installed, so nothing can be measured: run ${INSTALL}`)
    throw new Error(`the browser did not start: ${error.message}`)
  }
}

export async function main(argv) {
  const options = parseArgs(argv)
  const sites = await listSites(options.root)
  const browser = await launch()
  let failed = false
  try {
    for (const site of sites) {
      try {
        const config = await loadSiteConfig(options.configDir, site.name)
        if (options.build) {
          await requireBuildScript(site)
          console.log(`building ${site.name}`)
          await build(site)
        }
        const { pages } = await measureSite({ browser, dist: join(site.dir, 'dist'), config })
        const { violations, lines } = describe(site.name, pages, pages[0].measured)
        console.log(lines.join('\n'))
        if (violations > 0) failed = true
      } catch (error) {
        console.log(`${site.name}: ${error.message}`)
        failed = true
      }
    }
  } finally {
    await browser.close()
  }
  return failed ? 1 : 0
}

function isMain() {
  return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
}

if (isMain()) {
  try {
    process.exitCode = await main(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
