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
    ['package.json', ['home', 'agentshed']],
    ['pnpm-lock.yaml', ['home', 'agentshed']],
    ['pnpm-workspace.yaml', ['home', 'agentshed']],
    ['packages/.gitkeep', ['home', 'agentshed']],
    ['packages/site-check/sites/agentshed.json', ['home', 'agentshed']],
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
    ['apps/agentshed/README.md', ['agentshed']]
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
    'width-check': { result: 'success' }
  }
  needs[tried] = { result: triedResult }
  return gateFailures(needs, config)
}

test('a change to only the width check, only to the homepage, or only to Agentshed\'s site requires width-check, and a change to only documents does not', () => {
  for (const path of [
    'packages/site-check/src/check-sites.mjs', 'packages/site-check/sites/home.json', 'packages/site-check/sites/agentshed.json',
    'apps/home/public/index.html', 'apps/agentshed/src/pages/index.astro'
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
