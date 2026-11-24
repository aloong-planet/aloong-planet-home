// What a site tells the check about itself, read from packages/site-check/sites/<apps folder name>.json:
//   origin          the site's own https origin; links to it count as links inside the site
//   fixtures        [{ path, json }] answers for requests the page makes to its own backend (the check serves a
//                   static build only, so the backend is not there)
//   linkExceptions  [{ path, reason }] links inside the site that land on no built file because only a rewrite or a
//                   function answers them; one exact path and one reason each, never a class of paths
// The file lives with the check, not with the site, so loosening it is a change to packages/site-check and the
// routing rules run every site's checks for that.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

function fail(file, message) {
  throw new Error(`${file}: ${message}`)
}

function noUnknownKeys(file, value, allowed, where) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(file, `unknown key "${key}"${where}`)
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

export async function loadSiteConfig(dir, site) {
  const file = join(dir, `${site}.json`)
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`no config for the site ${site}: expected ${file}, which names its origin`)
    throw error
  }
  let config
  try {
    config = JSON.parse(text)
  } catch (error) {
    fail(file, `not valid JSON (${error.message})`)
  }
  if (!isObject(config)) fail(file, 'must be a JSON object')
  noUnknownKeys(file, config, ['origin', 'fixtures', 'linkExceptions'], '')

  let origin
  try {
    origin = new URL(config.origin)
  } catch {
    fail(file, 'origin is required: the site\'s own https origin, such as https://example.com')
  }
  if (origin.protocol !== 'https:' || origin.origin !== config.origin) fail(file, `origin ${config.origin} must be an https origin without a path, such as https://example.com`)

  const fixtures = config.fixtures ?? []
  if (!Array.isArray(fixtures)) fail(file, 'fixtures must be a list')
  for (const f of fixtures) {
    if (!isObject(f)) fail(file, 'each fixture must be an object { path, json }')
    noUnknownKeys(file, f, ['path', 'json'], ' in a fixture')
    if (typeof f.path !== 'string' || !f.path.startsWith('/')) fail(file, `a fixture path must start with "/", got ${JSON.stringify(f.path)}`)
    if (!('json' in f)) fail(file, `the fixture for ${f.path} has no json: the answer to send`)
  }

  const linkExceptions = config.linkExceptions ?? []
  if (!Array.isArray(linkExceptions)) fail(file, 'linkExceptions must be a list')
  for (const e of linkExceptions) {
    if (!isObject(e)) fail(file, 'each link exception must be an object { path, reason }')
    noUnknownKeys(file, e, ['path', 'reason'], ' in a link exception')
    if (typeof e.path !== 'string' || !e.path.startsWith('/')) fail(file, `a link exception path must start with "/", got ${JSON.stringify(e.path)}`)
    if (e.path.includes('*')) fail(file, `the link exception ${e.path} must be one exact path: "*" would exempt a class of pages`)
    if (typeof e.reason !== 'string' || e.reason.trim() === '') fail(file, `the link exception ${e.path} needs a reason`)
  }
  return { origin: config.origin, fixtures, linkExceptions }
}
