// Which pages and sites there are to measure, found by looking: app-sites::QR-001/AC-01 holds for every page of every
// site, so none of them may come from a hand-kept list.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listSites, pageUrl, readDist } from '../src/pages.mjs'
import { tree } from './helpers/tree.mjs'

const urls = [
  ['index.html', '/'],
  ['blog.html', '/blog'],
  ['blog/index.html', '/blog/'],
  ['blog/a.html', '/blog/a'],
  ['404.html', '/404'],
]
for (const [file, url] of urls) {
  test(`the built file ${file} is served at ${url}`, () => {
    assert.equal(pageUrl(file), url)
  })
}

test('every html file in a dist is a page, and the other files are only files', async (t) => {
  const dist = await tree(t, {
    'index.html': '<p>home</p>',
    'blog.html': '<p>blog</p>',
    'blog/index.html': '<p>index</p>',
    'blog/a.html': '<p>a</p>',
    '404.html': '<p>nf</p>',
    'site.css': 'p{}',
    'img/logo.svg': '<svg/>',
  })
  const found = await readDist(dist)
  assert.deepEqual(found.pages.map((p) => p.url), ['/', '/404', '/blog', '/blog/', '/blog/a'])
  assert.deepEqual(found.pages.map((p) => p.file), ['index.html', '404.html', 'blog.html', 'blog/index.html', 'blog/a.html'])
  assert.deepEqual(found.files, ['404.html', 'blog.html', 'blog/a.html', 'blog/index.html', 'img/logo.svg', 'index.html', 'site.css'])
})

const unusable = [
  ['a dist that does not exist', async () => '/nonexistent/dist', /no dist.*not been built/i],
  ['a dist without a page', (t) => tree(t, { 'site.css': 'p{}' }), /no pages/i],
  ['an .htm file, which the host does not serve as a page', (t) => tree(t, { 'index.html': '<p/>', 'old.htm': '<p/>' }), /old\.htm/],
  ['an .xhtml file, which the host does not serve as a page', (t) => tree(t, { 'index.html': '<p/>', 'x.xhtml': '<p/>' }), /x\.xhtml/],
]
for (const [name, make, expected] of unusable) {
  test(`${name} is an error, not an empty list`, async (t) => {
    const dist = await make(t)
    await assert.rejects(readDist(dist), expected)
  })
}

test('the sites are the folders of apps/ that are packages', async (t) => {
  const root = await tree(t, {
    'apps/home/package.json': '{}',
    'apps/agentshed/package.json': '{}',
    'apps/notes/readme.md': 'not a package',
    'packages/site-check/package.json': '{}',
    'apps/stray.txt': 'a file, not a folder',
  })
  const sites = await listSites(root)
  assert.deepEqual(sites.map((s) => s.name), ['agentshed', 'home'])
  assert.deepEqual(sites.map((s) => s.dir), [`${root}/apps/agentshed`, `${root}/apps/home`])
})

test('a workspace with no site is an error, so a check that finds nothing cannot pass', async (t) => {
  const root = await tree(t, { 'packages/site-check/package.json': '{}', 'apps/notes/readme.md': 'x' })
  await assert.rejects(listSites(root), /no site/i)
})

const awkward = [
  ['100%.html', '/100%25'],
  ['what?.html', '/what%3F'],
  ['a#b.html', '/a%23b'],
]
for (const [file, url] of awkward) {
  test(`the built file ${file} is asked for as ${url}, so the address names that file and nothing else`, () => {
    assert.equal(pageUrl(file), url)
  })
}
