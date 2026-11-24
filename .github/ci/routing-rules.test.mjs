// This repository's routing rules (.github/ci/routing.json). Written for the repository from the github-ops
// skill's template; ci-routing.test.mjs beside it tests the fixed behaviour and is not edited.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyPath, readConfig } from './ci-scope.mjs'

const config = readConfig()

test('each pattern of routing.json routes a real path to the scopes written here', () => {
  // [a tracked path, the scopes it must select]. Take each path from the repository's tracked tree, and write
  // the scopes as literals: computing them from routing.json would only repeat it.
  const cases = [
    ['package.json', ['home']],
    ['pnpm-lock.yaml', ['home']],
    ['README.md', []],
    ['AGENTS.md', []],
    ['docs/agents/docs-layout.md', []],
    ['docs/adr/0001-app-websites-in-this-repository.md', []],
    ['docs/specs/blog.md', []],
    ['docs/features/blog.md', []],
    ['docs/ops/deployment.md', []],
    ['docs/assets/sources.json', []],
    ['docs/prototypes/homepage/prototype-home.html', []],
    ['assets/golden-wag/config.json', ['home']],
    ['content/posts.json', ['home']],
    ['public/index.html', ['home']],
    ['scripts/build.mjs', ['home']],
    ['tests/blog.test.mjs', ['home']],
    ['functions/api/visitor.js', ['home']],
    ['migrations/0001_visitors.sql', ['home']],
    ['tools/screenshots/transfer-fixture.js', ['home']],
    ['wrangler.jsonc', ['home']],
    ['deployment.config.json', ['home']],
    ['tsconfig.json', ['home']],
    ['tsconfig.client.json', ['home']]
  ]
  const hit = new Set()
  for (const [path, expected] of cases) {
    const { select, pattern } = classifyPath(path, config)
    assert.deepEqual(select, expected, path)
    if (pattern !== null) hit.add(pattern)
  }
  // Every pattern needs a case of its own; a pattern no case reaches is a rule nothing here checks
  const patterns = config.rules.flatMap((rule) => rule.patterns.map(({ pattern }) => pattern))
  assert.ok(patterns.length > 0)
  assert.deepEqual(patterns.filter((pattern) => !hit.has(pattern)), [])
})
