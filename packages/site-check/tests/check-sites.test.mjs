// The command `pnpm --filter @aloong-planet/site-check run check`, run on small workspaces made for the purpose:
// app-sites::QR-001/AC-01 is only guarded if a site nobody told the check about is still found, built and measured, and
// anything that stops a site from being measured makes the run fail instead of passing without it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { tree } from './helpers/tree.mjs'

const CLI = new URL('../src/check-sites.mjs', import.meta.url).pathname

function run(args, env = {}) {
  return new Promise((resolve) => {
    execFile(process.execPath, [CLI, ...args], { env: { ...process.env, ...env }, timeout: 120_000 }, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, output: stdout + stderr })
    })
  })
}

const html = (body) => `<!doctype html><meta charset="utf-8"><title>t</title><style>body{margin:0}</style><body>${body}</body>`
const fits = html('<p>fits</p>')
const wide = html('<div style="width:2000px">wide</div>')

// A site under apps/<name> whose build writes the given pages into dist, and its config file under cfg/.
function site(name, pages, { build = 'node build.mjs', config = { origin: 'https://example.com' } } = {}) {
  const script = `import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
for (const [file, content] of Object.entries(${JSON.stringify(pages)})) {
  mkdirSync(dirname(\`dist/\${file}\`), { recursive: true })
  writeFileSync(\`dist/\${file}\`, content)
}
`
  return {
    [`apps/${name}/package.json`]: JSON.stringify({ name, private: true, scripts: build ? { build } : {} }),
    [`apps/${name}/build.mjs`]: script,
    ...(config ? { [`cfg/${name}.json`]: JSON.stringify(config) } : {}),
  }
}

test('a site nobody listed is found, built and measured; one that fails fails the run, and so does anything that stops a site being measured', async (t) => {
  const root = await tree(t, {
    ...site('good', { 'index.html': fits, 'about.html': fits }),
    ...site('bad', { 'index.html': wide }),
    ...site('lost', { 'index.html': fits }, { config: null }),
    ...site('nobuild', { 'index.html': fits }, { build: null }),
    ...site('broken', { 'index.html': fits }, { build: 'node -e "console.log(\'boom from the build\'); process.exit(3)"' }),
  })
  const { code, output } = await run(['--root', root, '--config-dir', join(root, 'cfg')])
  assert.equal(code, 1)
  assert.match(output, /^good: 2 pages x 1121 widths, 0 violations$/m)
  assert.match(output, /^bad: 1 page x 1121 widths, 1121 violations$/m)
  assert.match(output, /^ {2}\/ is wider than the window at 320-1440: the page is 2000px wide in a 320px window$/m)
  assert.match(output, /^lost: .*no config for the site lost/m)
  assert.match(output, /^nobuild: .*no build script/m)
  assert.match(output, /^broken: the build of broken failed[^]*boom from the build/m)
})

test('sites that all fit pass the run, and --no-build measures what is already built without running the build', async (t) => {
  const root = await tree(t, {
    ...site('ok', { 'index.html': fits }, { build: 'node -e "process.exit(9)"' }),
    'apps/ok/dist/index.html': fits,
  })
  const { code, output } = await run(['--root', root, '--config-dir', join(root, 'cfg'), '--no-build'])
  assert.equal(code, 0, output)
  assert.match(output, /^ok: 1 page x 1121 widths, 0 violations$/m)
})

test('a workspace with no site fails the run', async (t) => {
  const root = await tree(t, { 'packages/x/package.json': '{}' })
  const { code, output } = await run(['--root', root, '--config-dir', join(root, 'cfg')])
  assert.equal(code, 1)
  assert.match(output, /no site/i)
})

test('an option the command does not know fails the run instead of being ignored', async (t) => {
  const root = await tree(t, { ...site('ok', { 'index.html': fits }) })
  const { code, output } = await run(['--root', root, '--no-bild'])
  assert.equal(code, 1)
  assert.match(output, /unknown option --no-bild/)
})

test('a missing browser fails the run and says how to install it, instead of skipping the measuring', async (t) => {
  const root = await tree(t, { ...site('ok', { 'index.html': fits }), 'apps/ok/dist/index.html': fits })
  const empty = await mkdtemp(join(tmpdir(), 'no-browsers-'))
  const { code, output } = await run(['--root', root, '--config-dir', join(root, 'cfg'), '--no-build'], { PLAYWRIGHT_BROWSERS_PATH: empty })
  assert.equal(code, 1)
  assert.match(output, /playwright install --only-shell chromium/)
})
