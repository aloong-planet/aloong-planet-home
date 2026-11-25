// Vitest global setup: one fresh build of the site per test run, into a new temporary directory.
//
// The tests that read the built site read what the build produced, so they must never read an old one: a check of a
// stale dist/ looks exactly like a change that did not take. Building here, rather than in a `build && test` script,
// keeps a bare `vitest run` honest too. The tests only read the output, so they share it.
//
// The directory is made under the site's own node_modules/.cache, not the operating system's temporary directory:
// Astro moves the built assets into outDir with a rename, which fails (EXDEV) when outDir is on another filesystem
// than the site, as the temporary directory is on GitHub's runners.
//
// It is built as production, as `astro build` builds it: Vitest runs with NODE_ENV=test, and Vite takes a set NODE_ENV
// as given and builds as production only for "production", so the build would otherwise ship the dev server's choices.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    /** The build output directory */
    builtSite: string
  }
}

export default function setup(project: TestProject): () => void {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const cache = join(root, 'node_modules', '.cache')
  mkdirSync(cache, { recursive: true })
  const outDir = mkdtempSync(join(cache, 'transfer-site-'))
  try {
    execFileSync(process.execPath, [join(root, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'build', '--outDir', outDir], {
      cwd: root,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' },
    })
  } catch (error) {
    rmSync(outDir, { recursive: true, force: true })
    throw error
  }
  project.provide('builtSite', outDir)
  return () => rmSync(outDir, { recursive: true, force: true })
}
