// The static server that stands in for Cloudflare Pages while the check measures a build. It is test infrastructure
// of the check, so the cases here guard the check itself: a page served at the wrong address, or with the wrong
// content type, would be measured as something the host never serves (app-sites::QR-001/AC-01).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { get } from 'node:http'
import { startServer } from '../src/server.mjs'
import { tree } from './helpers/tree.mjs'

async function serve(t, files, fixtures = []) {
  const root = await tree(t, { 'secret.txt': 'outside the dist', ...Object.fromEntries(Object.entries(files).map(([k, v]) => [`dist/${k}`, v])) })
  const server = await startServer({ dist: `${root}/dist`, fixtures })
  t.after(() => server.close())
  return server
}

const site = {
  'index.html': '<p>home</p>',
  'blog.html': '<p>blog</p>',
  'blog/index.html': '<p>blog index</p>',
  'blog/a.html': '<p>post a</p>',
  'only/index.html': '<p>only index</p>',
  'site.css': 'p{color:red}',
  'app.js': 'console.log(1)',
  'img/logo.svg': '<svg/>',
}

const served = [
  ['/', '<p>home</p>', 'text/html'],
  ['/index.html', '<p>home</p>', 'text/html'],
  ['/blog', '<p>blog</p>', 'text/html'],
  ['/blog/', '<p>blog index</p>', 'text/html'],
  ['/blog/a', '<p>post a</p>', 'text/html'],
  ['/only/', '<p>only index</p>', 'text/html'],
  ['/site.css', 'p{color:red}', 'text/css'],
  ['/app.js', 'console.log(1)', 'text/javascript'],
  ['/img/logo.svg', '<svg/>', 'image/svg+xml'],
]
for (const [path, body, type] of served) {
  test(`${path} is answered with ${body} as ${type}`, async (t) => {
    const server = await serve(t, site)
    const response = await fetch(server.origin + path)
    assert.equal(response.status, 200)
    assert.ok(response.headers.get('content-type').startsWith(type), response.headers.get('content-type'))
    assert.equal(await response.text(), body)
  })
}

const missing = ['/nope', '/blog/b', '/only', '/img/', '/img', '/site']
for (const path of missing) {
  test(`${path} is not found, as on the host`, async (t) => {
    const server = await serve(t, site)
    assert.equal((await fetch(server.origin + path)).status, 404)
  })
}

test('a path that climbs out of the dist is not served', async (t) => {
  const server = await serve(t, site)
  const status = await new Promise((resolve, reject) => {
    get(`${server.origin}/..%2fsecret.txt`, (res) => (res.resume(), resolve(res.statusCode))).on('error', reject)
  })
  assert.equal(status, 404)
})

test('a fixture is answered to any method and with any query', async (t) => {
  const server = await serve(t, site, [{ path: '/api/visitor', json: { total: 9999999999 } }])
  for (const [method, query] of [['GET', ''], ['POST', ''], ['GET', '?page=1'], ['PUT', '?a=b']]) {
    const response = await fetch(`${server.origin}/api/visitor${query}`, { method })
    assert.equal(response.status, 200, `${method} ${query}`)
    assert.match(response.headers.get('content-type'), /^application\/json/)
    assert.deepEqual(await response.json(), { total: 9999999999 })
  }
})

test('a path the site does not fix is not answered as a fixture, and a file answers to GET only', async (t) => {
  const server = await serve(t, site, [{ path: '/api/visitor', json: { total: 1 } }])
  assert.equal((await fetch(`${server.origin}/api/other`)).status, 404)
  assert.equal((await fetch(`${server.origin}/site.css`, { method: 'POST' })).status, 405)
})
