// What each site tells the check about itself (packages/site-check/sites/<site>.json). The file is read strictly: an
// exception for a link, or a fixture, that is vaguer than "this path, for this reason" would quietly let a whole
// class of pages escape app-sites::QR-001/AC-01.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSiteConfig } from '../src/site-config.mjs'
import { tree } from './helpers/tree.mjs'

async function load(t, name, content) {
  const dir = await tree(t, content === undefined ? {} : { [`${name}.json`]: typeof content === 'string' ? content : JSON.stringify(content) })
  return loadSiteConfig(dir, name)
}

const origin = 'https://example.com'

test('a site that only names its origin has no fixtures and no link exceptions', async (t) => {
  assert.deepEqual(await load(t, 'shop', { origin }), { origin, fixtures: [], linkExceptions: [] })
})

test('fixtures and link exceptions are read as written', async (t) => {
  const written = {
    origin,
    fixtures: [{ path: '/api/visitor', json: { total: 9999999999 } }, { path: '/api/list', json: [] }],
    linkExceptions: [{ path: '/go/docs', reason: 'redirect rule in _redirects' }],
  }
  assert.deepEqual(await load(t, 'shop', written), written)
})

test('a site without a config file is an error: an unconfigured site is not measured by guesswork', async (t) => {
  await assert.rejects(load(t, 'shop', undefined), /no config.*shop/i)
})

const invalid = [
  ['not JSON', '{ origin', /shop\.json.*JSON/i],
  ['not an object', '[]', /shop\.json.*object/i],
  ['an origin that is missing', {}, /origin/],
  ['an origin that is not https', { origin: 'http://example.com' }, /origin.*https/],
  ['an origin with a path', { origin: 'https://example.com/blog' }, /origin.*https/],
  ['an unknown key', { origin, fixture: [] }, /unknown key "fixture"/],
  ['a fixture without json', { origin, fixtures: [{ path: '/api/x' }] }, /fixture.*json/],
  ['a fixture path that is not absolute', { origin, fixtures: [{ path: 'api/x', json: 1 }] }, /fixture.*path/],
  ['an unknown key in a fixture', { origin, fixtures: [{ path: '/a', json: 1, status: 500 }] }, /unknown key "status"/],
  ['an exception without a reason', { origin, linkExceptions: [{ path: '/go/docs' }] }, /reason/],
  ['an exception with an empty reason', { origin, linkExceptions: [{ path: '/go/docs', reason: '  ' }] }, /reason/],
  ['an exception for a class of paths', { origin, linkExceptions: [{ path: '/go/*', reason: 'redirects' }] }, /\*.*one path|exact path/i],
  ['an exception path that is not absolute', { origin, linkExceptions: [{ path: 'go/docs', reason: 'redirects' }] }, /exception.*path/],
  ['an unknown key in an exception', { origin, linkExceptions: [{ path: '/go', reason: 'r', until: 'x' }] }, /unknown key "until"/],
]
for (const [name, content, expected] of invalid) {
  test(`a config with ${name} is refused`, async (t) => {
    await assert.rejects(load(t, 'shop', content), expected)
  })
}
