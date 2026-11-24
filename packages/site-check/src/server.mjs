// A static server standing in for Cloudflare Pages: it answers the way the host does for a built site, so the pages
// are measured at the addresses and with the content types a visitor gets. Fixtures answer the paths a page asks of
// its own backend, which a static build does not have.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
}

async function fileAt(path) {
  const info = await stat(path).catch(() => null)
  return info?.isFile() ? path : null
}

// What the host would serve at the URL path: the file itself, x for x.html, x/ for x/index.html. Never a
// directory listing and never anything outside the dist.
async function find(dist, pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const path = resolve(join(dist, decoded))
  if (path !== dist && !path.startsWith(dist + sep)) return null
  if (decoded.endsWith('/')) return fileAt(join(path, 'index.html'))
  return (await fileAt(path)) ?? (await fileAt(`${path}.html`))
}

export async function startServer({ dist, fixtures = [] }) {
  const root = resolve(dist)
  const answers = new Map(fixtures.map((f) => [f.path, JSON.stringify(f.json)]))
  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://local')
    if (answers.has(pathname)) {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      return res.end(answers.get(pathname))
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405)
      return res.end()
    }
    const file = await find(root, pathname)
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      return res.end('not found')
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(req.method === 'HEAD' ? undefined : await readFile(file))
  })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => (server.close(done), server.closeAllConnections())),
  }
}
