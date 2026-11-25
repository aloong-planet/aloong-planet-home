// Run once, before any test file of this package, by `node --test --test-global-setup` (the package's test script). It builds
// apps/home/dist so the browser cases of the homepage site, each in a file of its own, read one build instead of making one each:
// a build takes 2 to 4 seconds and one per file would grow with the number of files (and two files building into the same folder
// at once cancel each other). The files see the flag below because the runner starts them after this has run.
//
// The package's test script still runs its files one at a time (--test-concurrency=1), for a reason that is not the build: the
// focus cases of nav-menus.test.mjs read where an element lands once the page's smooth scroll has settled and give it 5 seconds, and
// with every browser file running beside it on one machine the 390px case ran out of them (seen on 2026-11-25, 1 of 345 tests).
import { BUILT, buildHome } from './helpers/built-home.mjs'

export async function globalSetup() {
  await buildHome()
  process.env[BUILT] = '1'
}
