// The type check fails when its checker is missing (the ticket's note on `astro check`, aloong-planet/aloong-planet-home#26).
//
// Tried on Astro 7.4.0 (TypeScript 6.0.3, @astrojs/check 0.9.10), in a project of its own without @astrojs/check and with
// no terminal on stdin, as CI runs: `astro check` prints its prompt to install the checker and exits 0, on a page with a
// type error too. `astro sync && astro-check` exits non-zero there (the binary is not found), and exits 1 on that type error
// once the checker is installed. So the script runs the checker's own binary, after the sync that writes the types it reads,
// and the checker is a declared dependency.
//
// Gap: that Astro and pnpm behave so is the experiment above, not a test; only the script's form and the declared
// dependency are pinned here. Run the experiment again when Astro is upgraded: if `astro check` then fails on a missing
// checker, the plain `astro check` of the other sites' packages is the form to go back to.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}

test('the check script runs the checker binary after astro sync, and the package declares the checker', () => {
  expect(manifest.scripts.check).toBe('astro sync && astro-check')
  expect(Object.keys(manifest.devDependencies)).toContain('@astrojs/check')
})
