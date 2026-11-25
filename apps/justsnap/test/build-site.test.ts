// The build the checks read (test/build-site.ts) is the build that is deployed (app-sites::REQ-003/AC-01). The Deploy
// workflow builds the checked revision and runs none of the checks again, so a check that read another build than the
// deployed one would pass on a page that never ships.
//
// The deployed build is made as `astro build` makes it when the build script runs it: a process of its own, with the
// machine's environment and nothing of Vitest's. Vitest's worker carries NODE_ENV=test and the variables it sets for the
// modules it runs (DEV, PROD, MODE, SSR, BASE_URL), and a build that read them would take the dev server's choices, so
// that a page that reads import.meta.env.DEV or .PROD would come out differently. No page does today, so the two builds
// are the same today; this test is what makes the day one does show.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inject, expect, test } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

/** Each file of a directory, by its path in the directory, with the hash of its bytes */
function hashes(directory: string): Record<string, string> {
  const found: Record<string, string> = {}
  for (const entry of readdirSync(directory, { recursive: true, encoding: 'utf8' }).sort()) {
    const path = join(directory, entry)
    if (statSync(path).isFile()) found[entry] = createHash('sha256').update(readFileSync(path)).digest('hex')
  }
  return found
}

test('the site the checks read is built exactly as the deployed one is', () => {
  const manifest = createRequire(import.meta.url).resolve('astro/package.json')
  const bin = (JSON.parse(readFileSync(manifest, 'utf8')) as { bin: string | Record<string, string> }).bin
  const astro = join(dirname(manifest), typeof bin === 'string' ? bin : bin.astro)
  const cache = join(root, 'node_modules', '.cache')
  mkdirSync(cache, { recursive: true })
  const outDir = mkdtempSync(join(cache, 'justsnap-deployed-'))
  const env: Record<string, string> = { ASTRO_TELEMETRY_DISABLED: '1' }
  for (const name of ['PATH', 'HOME', 'TMPDIR']) {
    const value = process.env[name]
    if (value !== undefined) env[name] = value
  }
  try {
    const built = spawnSync(process.execPath, [astro, 'build', '--outDir', outDir], { cwd: root, encoding: 'utf8', env })
    expect(built.stderr).toBe('')
    expect(built.status).toBe(0)
    const deployed = hashes(outDir)
    expect(Object.keys(deployed)).toContain('index.html')
    expect(hashes(inject('builtSite'))).toEqual(deployed)
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
}, 60_000)
