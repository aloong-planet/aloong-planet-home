// This repository's routing rules (.github/ci/routing.json). Written for the repository from the github-ops
// skill's template; ci-routing.test.mjs beside it tests the fixed behaviour and is not edited.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyPath, classifyPaths, readConfig } from './ci-scope.mjs'
import { gateFailures } from './ci-gate.mjs'

const config = readConfig()

test('each pattern of routing.json routes a real path to the scopes written here', () => {
  // [a tracked path, the scopes it must select]. Take each path from the repository's tracked tree, and write
  // the scopes as literals: computing them from routing.json would only repeat it.
  const cases = [
    ['package.json', ['home', 'agentshed', 'justsnap', 'site_kit']],
    ['pnpm-lock.yaml', ['home', 'agentshed', 'justsnap', 'site_kit']],
    ['pnpm-workspace.yaml', ['home', 'agentshed', 'justsnap', 'site_kit']],
    ['packages/.gitkeep', ['home', 'agentshed', 'justsnap', 'site_kit']],
    ['packages/site-check/sites/agentshed.json', ['home', 'agentshed', 'justsnap', 'site_kit']],
    ['packages/site-kit/src/Icon.astro', ['home', 'agentshed', 'justsnap', 'site_kit']],
    ['README.md', []],
    ['AGENTS.md', []],
    ['docs/agents/docs-layout.md', []],
    ['docs/adr/0001-app-websites-in-this-repository.md', []],
    ['docs/specs/blog.md', []],
    ['docs/ops/deployment.md', []],
    ['docs/assets/sources.json', []],
    ['docs/prototypes/homepage/prototype-home.html', []],
    ['apps/home/package.json', ['home']],
    ['apps/home/assets/golden-wag/config.json', ['home']],
    ['apps/home/content/posts.json', ['home']],
    ['apps/home/public/index.html', ['home']],
    ['apps/home/scripts/build.mjs', ['home']],
    ['apps/home/tests/blog.test.mjs', ['home']],
    ['apps/home/functions/api/visitor.js', ['home']],
    ['apps/home/migrations/0001_visitors.sql', ['home']],
    ['apps/home/tools/screenshots/transfer-fixture.js', ['home']],
    ['apps/home/wrangler.jsonc', ['home']],
    ['apps/home/deployment.config.json', ['home']],
    ['apps/home/tsconfig.json', ['home']],
    ['apps/home/tsconfig.client.json', ['home']],
    ['apps/agentshed/package.json', ['agentshed']],
    ['apps/agentshed/astro.config.mjs', ['agentshed']],
    ['apps/agentshed/eslint.config.js', ['agentshed']],
    ['apps/agentshed/src/pages/index.astro', ['agentshed']],
    ['apps/agentshed/public/shots/overview-en.png', ['agentshed']],
    ['apps/agentshed/test/support/browser.ts', ['agentshed']],
    ['apps/agentshed/README.md', ['agentshed']],
    ['apps/justsnap/package.json', ['justsnap']],
    ['apps/justsnap/astro.config.mjs', ['justsnap']],
    ['apps/justsnap/src/pages/index.astro', ['justsnap']],
    ['apps/justsnap/public/shots/hero-zh.png', ['justsnap']],
    ['apps/justsnap/test/built-site.test.ts', ['justsnap']],
    ['apps/justsnap/README.md', ['justsnap']]
  ]
  const hit = new Set()
  for (const [path, expected] of cases) {
    const { select, pattern } = classifyPath(path, config)
    // A path no rule matches selects every scope, which is also what the "shared input" rule selects: without
    // this line a path whose rule is missing would pass through that fallback
    assert.notEqual(pattern, null, `${path} matches no rule`)
    assert.deepEqual(select, expected, path)
    hit.add(pattern)
  }
  // Every pattern needs a case of its own; a pattern no case reaches is a rule nothing here checks
  const patterns = config.rules.flatMap((rule) => rule.patterns.map(({ pattern }) => pattern))
  assert.ok(patterns.length > 0)
  assert.deepEqual(patterns.filter((pattern) => !hit.has(pattern)), [])
})

// What the CI gate says for a pull request that changes only `paths`: the gate is given the scopes those paths select,
// each site's checks as run when their scope is selected and skipped when not, and the result of `tried`, the one job
// whose result is varied.
const gateVerdict = (paths, tried, triedResult) => {
  const { scopes } = classifyPaths(paths, config)
  const outputs = Object.fromEntries(Object.entries(scopes).map(([name, on]) => [name, String(on)]))
  const siteChecks = (scope) => ({ result: scopes[scope] ? 'success' : 'skipped' })
  const needs = {
    changes: { result: 'success', outputs },
    'repo-policy': { result: 'success' },
    'home-checks': siteChecks('home'),
    'agentshed-checks': siteChecks('agentshed'),
    'justsnap-checks': siteChecks('justsnap'),
    'site-kit-checks': siteChecks('site_kit'),
    'width-check': { result: 'success' }
  }
  needs[tried] = { result: triedResult }
  return gateFailures(needs, config)
}

test('a change to only the width check, only to the homepage, or only to either app\'s site requires width-check, and a change to only documents does not', () => {
  for (const path of [
    'packages/site-check/src/check-sites.mjs', 'packages/site-check/sites/home.json', 'packages/site-check/sites/agentshed.json',
    'apps/home/public/index.html', 'apps/agentshed/src/pages/index.astro', 'apps/justsnap/src/pages/index.astro'
  ]) {
    assert.deepEqual(gateVerdict([path], 'width-check', 'success'), [], path)
    assert.deepEqual(gateVerdict([path], 'width-check', 'failure'), ['width-check: failure (selected)'], path)
    assert.deepEqual(gateVerdict([path], 'width-check', 'skipped'), ['width-check: skipped (selected)'], path)
  }
  assert.deepEqual(gateVerdict(['README.md'], 'width-check', 'skipped'), [])
})

test('a change to only Agentshed\'s site requires agentshed-checks and not home-checks, and a change to only the homepage the reverse', () => {
  const site = 'apps/agentshed/public/shots/overview-en.png'
  assert.deepEqual(gateVerdict([site], 'agentshed-checks', 'failure'), ['agentshed-checks: failure (selected)'])
  assert.deepEqual(gateVerdict([site], 'agentshed-checks', 'skipped'), ['agentshed-checks: skipped (selected)'])
  assert.deepEqual(gateVerdict([site], 'home-checks', 'skipped'), [])
  const home = 'apps/home/public/index.html'
  assert.deepEqual(gateVerdict([home], 'home-checks', 'failure'), ['home-checks: failure (selected)'])
  assert.deepEqual(gateVerdict([home], 'agentshed-checks', 'skipped'), [])
  // The shared input, and a document, which no site's checks depend on
  assert.deepEqual(gateVerdict(['pnpm-lock.yaml'], 'agentshed-checks', 'skipped'), ['agentshed-checks: skipped (selected)'])
  assert.deepEqual(gateVerdict(['docs/specs/agentshed-site.md'], 'agentshed-checks', 'skipped'), [])
})

test('a change to only JustSnap\'s site requires justsnap-checks and neither of the other sites\' checks, and a change to either of those does not require it', () => {
  const site = 'apps/justsnap/public/shots/hero-zh.png'
  assert.deepEqual(gateVerdict([site], 'justsnap-checks', 'failure'), ['justsnap-checks: failure (selected)'])
  assert.deepEqual(gateVerdict([site], 'justsnap-checks', 'skipped'), ['justsnap-checks: skipped (selected)'])
  assert.deepEqual(gateVerdict([site], 'agentshed-checks', 'skipped'), [])
  assert.deepEqual(gateVerdict([site], 'home-checks', 'skipped'), [])
  assert.deepEqual(gateVerdict(['apps/agentshed/src/pages/index.astro'], 'justsnap-checks', 'skipped'), [])
  assert.deepEqual(gateVerdict(['apps/home/public/index.html'], 'justsnap-checks', 'skipped'), [])
  // The shared input, and a document, which no site's checks depend on
  assert.deepEqual(gateVerdict(['pnpm-lock.yaml'], 'justsnap-checks', 'skipped'), ['justsnap-checks: skipped (selected)'])
  assert.deepEqual(gateVerdict(['docs/specs/justsnap-site.md'], 'justsnap-checks', 'skipped'), [])
})

test('a change to the shared site code requires site-kit-checks beside both sites\' checks, and a change to a site, the homepage or a document does not require it', () => {
  const kit = 'packages/site-kit/src/Icon.astro'
  assert.deepEqual(gateVerdict([kit], 'site-kit-checks', 'failure'), ['site-kit-checks: failure (selected)'])
  assert.deepEqual(gateVerdict([kit], 'site-kit-checks', 'skipped'), ['site-kit-checks: skipped (selected)'])
  // Every site renders the component, so each site's checks and the width check run for the same change
  assert.deepEqual(gateVerdict([kit], 'agentshed-checks', 'skipped'), ['agentshed-checks: skipped (selected)'])
  assert.deepEqual(gateVerdict([kit], 'justsnap-checks', 'skipped'), ['justsnap-checks: skipped (selected)'])
  assert.deepEqual(gateVerdict([kit], 'width-check', 'skipped'), ['width-check: skipped (selected)'])
  for (const path of ['apps/agentshed/src/pages/index.astro', 'apps/justsnap/src/pages/index.astro', 'apps/home/public/index.html', 'docs/specs/app-sites.md']) {
    assert.deepEqual(gateVerdict([path], 'site-kit-checks', 'skipped'), [], path)
  }
})
