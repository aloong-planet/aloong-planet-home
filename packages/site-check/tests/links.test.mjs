// A link inside a site must land on something the check measured or on a file of the build: otherwise the page it
// points at is a page nobody measures (app-sites::QR-001/AC-01 holds for every page).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyLink, linkResolves } from '../src/links.mjs'

const where = { localOrigin: 'http://127.0.0.1:4173', siteOrigin: 'https://aloongplanet.com' }

// What the browser reports for `a.href`: already resolved against the page's address.
const classes = [
  ['a relative link, resolved against the local server', 'http://127.0.0.1:4173/blog/a', { kind: 'site', path: '/blog/a' }],
  ['a link to the site\'s own domain', 'https://aloongplanet.com/blog', { kind: 'site', path: '/blog' }],
  ['a link to the own domain, written in capitals', 'HTTPS://ALOONGPLANET.COM/Blog', { kind: 'site', path: '/Blog' }],
  ['a link to the own domain over http', 'http://aloongplanet.com/blog', { kind: 'site', path: '/blog' }],
  ['a link with a query and a fragment, which do not choose a page', 'https://aloongplanet.com/blog?x=1#top', { kind: 'site', path: '/blog' }],
  ['a link to the root of the own domain', 'https://aloongplanet.com', { kind: 'site', path: '/' }],
  ['a link to another subdomain of the own domain', 'https://app.aloongplanet.com/', { kind: 'other' }],
  ['a link to another site', 'https://github.com/aloong-planet', { kind: 'other' }],
  ['a link on another port of the own host', 'https://aloongplanet.com:8443/blog', { kind: 'other' }],
  ['a mail link', 'mailto:hi@aloongplanet.com', { kind: 'other' }],
  ['a script link', 'javascript:void(0)', { kind: 'other' }],
]
for (const [name, href, expected] of classes) {
  test(`${name} is ${expected.kind === 'site' ? `the site's own page ${expected.path}` : 'not a link inside the site'}`, () => {
    assert.deepEqual(classifyLink(href, where), expected)
  })
}

const files = ['404.html', 'blog.html', 'blog/a.html', 'blog/index.html', 'img/logo.svg', 'index.html', 'site.css', 'notes.html']
const lands = [
  ['/', true],
  ['/index.html', true],
  ['/blog', true],
  ['/blog/', true],
  ['/blog.html', true],
  ['/blog/a', true],
  ['/site.css', true],
  ['/img/logo.svg', true],
  ['/nope', false],
  ['/blog/b', false],
  ['/img/', false],
  ['/notes/', false],
  ['/site', false],
]
for (const [path, expected] of lands) {
  test(`${path} ${expected ? 'lands on a page or a file of the build' : 'lands on nothing'}`, () => {
    assert.equal(linkResolves(path, files), expected)
  })
}
