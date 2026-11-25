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

// A page that fits at every width it is measured at and has a rule that starts at the given width.
const stepped = (width) => html(`<style>@media (min-width: ${width}px){p{margin:0}}</style><p>fits</p>`)

// A page whose only fault is not its width: a stylesheet of its own site that is not built.
const unstyled = '<!doctype html><meta charset="utf-8"><title>t</title><link rel="stylesheet" href="/missing.css"><body><p>fits</p></body>'

// Each of these is the only site in the workspace, so the exit code can only come from that one failure.
const failures = [
  [
    'a page wider than the window',
    site('bad', { 'index.html': wide }),
    [/^bad: 1 page x 1121 widths, 1121 violations$/m, /^ {2}\/ is wider than the window at 320-1440: the page is 2000px wide in a 320px window$/m],
  ],
  [
    'a page that fits but could not be measured as a visitor sees it',
    site('stale', { 'index.html': unstyled }),
    [/^stale: 1 page x 1121 widths, 1 violation$/m, /^ {2}\/: .*\/missing\.css was answered with 404$/m],
  ],
  [
    'a page with a width condition above the widest window measured',
    site('tall', { 'index.html': stepped(1600) }),
    [/^tall: 1 page x 1121 widths, 1 violation$/m, /^ {2}\/: <style> no\. 2 has @media \(min-width: 1600px\).*widths\.mjs to at least 1600$/m],
  ],
  ['a site with no config', site('lost', { 'index.html': fits }, { config: null }), [/^lost: .*no config for the site lost/m]],
  ['a site with no build script', site('nobuild', { 'index.html': fits }, { build: null }), [/^nobuild: .*no build script/m]],
  [
    'a site whose build fails',
    site('broken', { 'index.html': fits }, { build: 'node -e "console.log(\'boom from the build\'); process.exit(3)"' }),
    [/^broken: the build of broken failed[^]*boom from the build/m],
  ],
]
for (const [name, files, expected] of failures) {
  test(`${name} fails the run, and the run says why`, async (t) => {
    const root = await tree(t, files)
    const { code, output } = await run(['--root', root, '--config-dir', join(root, 'cfg')])
    assert.equal(code, 1, output)
    for (const line of expected) assert.match(output, line)
  })
}

test('a site nobody listed is found, built and measured, and a site that fails does not stop the sites after it being measured', async (t) => {
  // The sites are taken in the order of their names: bad, broken, good, lost, nobuild.
  const root = await tree(t, {
    ...site('good', { 'index.html': fits, 'about.html': fits }),
    ...site('bad', { 'index.html': wide }),
    ...site('lost', { 'index.html': fits }, { config: null }),
    ...site('nobuild', { 'index.html': fits }, { build: null }),
    ...site('broken', { 'index.html': fits }, { build: 'node -e "process.exit(3)"' }),
  })
  const { code, output } = await run(['--root', root, '--config-dir', join(root, 'cfg')])
  assert.equal(code, 1, output)
  assert.match(output, /^good: 2 pages x 1121 widths, 0 violations$/m)
  assert.match(output, /^nobuild: .*no build script/m)
})

test('sites that all fit pass the run, one with a width condition inside the range among them, and --no-build measures what is already built without running the build', async (t) => {
  const root = await tree(t, {
    ...site('ok', { 'index.html': fits }, { build: 'node -e "process.exit(9)"' }),
    'apps/ok/dist/index.html': fits,
    ...site('edge', { 'index.html': stepped(1280) }, { build: 'node -e "process.exit(9)"' }),
    'apps/edge/dist/index.html': stepped(1280),
  })
  const { code, output } = await run(['--root', root, '--config-dir', join(root, 'cfg'), '--no-build'])
  assert.equal(code, 0, output)
  assert.match(output, /^ok: 1 page x 1121 widths, 0 violations$/m)
  assert.match(output, /^edge: 1 page x 1121 widths, 0 violations$/m)
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
