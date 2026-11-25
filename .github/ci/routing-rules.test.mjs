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
    ['package.json', ['home']],
    ['pnpm-lock.yaml', ['home']],
    ['pnpm-workspace.yaml', ['home']],
    ['packages/.gitkeep', ['home']],
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
    ['apps/home/tsconfig.client.json', ['home']]
  ]
  const hit = new Set()
  for (const [path, expected] of cases) {
    const { select, pattern } = classifyPath(path, config)
    // A path no rule matches selects every scope, which with one scope is also what a home rule selects: without
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

// Whether the CI gate requires width-check for a pull request that changes only `paths`: the gate is given the scopes
// those paths select and every job's result except width-check's, which is the one tried.
const widthCheckVerdict = (paths, widthCheckResult) => {
  const { scopes } = classifyPaths(paths, config)
  const outputs = Object.fromEntries(Object.entries(scopes).map(([name, on]) => [name, String(on)]))
  const needs = {
    changes: { result: 'success', outputs },
    'repo-policy': { result: 'success' },
    'home-checks': { result: scopes.home ? 'success' : 'skipped' },
    'width-check': { result: widthCheckResult }
  }
  return gateFailures(needs, config)
}

test('a change to only the width check, or only to the homepage, requires width-check, and a change to only documents does not', () => {
  for (const path of ['packages/site-check/src/check-sites.mjs', 'packages/site-check/sites/home.json', 'apps/home/public/index.html']) {
    assert.deepEqual(widthCheckVerdict([path], 'success'), [], path)
    assert.deepEqual(widthCheckVerdict([path], 'failure'), ['width-check: failure (selected)'], path)
    assert.deepEqual(widthCheckVerdict([path], 'skipped'), ['width-check: skipped (selected)'], path)
  }
  assert.deepEqual(widthCheckVerdict(['README.md'], 'skipped'), [])
})
