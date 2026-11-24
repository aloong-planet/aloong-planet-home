// What there is to measure: the sites of the workspace and the pages of a site's build output. Both are found by
// looking at the disk, never from a list kept by hand, so a new page or a new site is measured without anyone
// remembering to add it.
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

// The address Cloudflare Pages serves a built file at: index.html at /, x.html at /x, x/index.html at /x/. A
// character that would end the path of a URL (%, ? and #) is written as an escape, so the address still names the file.
const escapeUrlSyntax = (path) => path.replace(/[%?#]/g, (c) => encodeURIComponent(c))

export function pageUrl(file) {
  if (file === 'index.html') return '/'
  if (file.endsWith('/index.html')) return `/${escapeUrlSyntax(file.slice(0, -'index.html'.length))}`
  return `/${escapeUrlSyntax(file.slice(0, -'.html'.length))}`
}

async function walk(dir, prefix = '') {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = prefix + entry.name
    if (entry.isDirectory()) found.push(...(await walk(join(dir, entry.name), `${path}/`)))
    else found.push(path)
  }
  return found
}

// { files: every file of the dist (relative, sorted), pages: [{ file, url }] sorted by url }.
export async function readDist(dist) {
  let files
  try {
    files = (await walk(dist)).sort()
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`no dist at ${dist}: the site has not been built`)
    throw error
  }
  const odd = files.find((f) => /\.(htm|xhtml)$/.test(f))
  if (odd) throw new Error(`${odd} is a page the host does not serve at a predictable address, so it cannot be measured; rename it to .html`)
  const pages = files
    .filter((f) => f.endsWith('.html'))
    .map((file) => ({ file, url: pageUrl(file) }))
    .sort((a, b) => (a.url < b.url ? -1 : 1))
  if (pages.length === 0) throw new Error(`no pages in ${dist}: a dist without a page would pass without measuring anything`)
  return { files, pages }
}

// [{ name, dir }] for every folder of apps/ that has a package.json, sorted by name.
export async function listSites(root) {
  const apps = join(root, 'apps')
  let names = []
  try {
    names = (await readdir(apps, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const sites = []
  for (const name of names.sort()) {
    const manifest = await stat(join(apps, name, 'package.json')).catch(() => null)
    if (manifest?.isFile()) sites.push({ name, dir: join(apps, name) })
  }
  if (sites.length === 0) throw new Error(`no site under ${apps}: a check of zero sites would pass without measuring anything`)
  return sites
}
