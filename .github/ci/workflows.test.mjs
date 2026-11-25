// The links between this repository's workflow files that no run reports when they break: a job the gate does
// not wait on, a Deploy trigger that names no workflow, and a pnpm --filter command that names no package or
// script (pnpm answers a filter that matches nothing with success). Run: node --test .github/ci/*.test.mjs
// Gap: Deploy's job condition and steps run only on the hosted runner, from the default branch's copy of
// deploy.yml; they are checked in the Deploy run of the first push to main after a change to deploy.yml.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const read = (name) => readFileSync(new URL(`../workflows/${name}`, import.meta.url), 'utf8')
const ci = read('ci.yml')
const deploy = read('deploy.yml')

// The ids of the jobs under the top-level `jobs:` key, and each job's own lines
function jobs(text) {
  const lines = text.slice(text.search(/^jobs:$/m)).split('\n').slice(1)
  const found = new Map()
  let current = null
  for (const line of lines) {
    if (/^\S/.test(line)) break
    const id = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/)
    if (id) found.set((current = id[1]), [])
    else if (current) found.get(current).push(line)
  }
  return found
}

test('the CI gate waits on every other job of the CI workflow', () => {
  const all = jobs(ci)
  assert.ok(all.size > 1)
  const needs = all.get('ci-gate').map((line) => line.match(/^ {4}needs: \[(.*)\]\s*$/)).find(Boolean)
  assert.ok(needs, 'ci-gate has a one-line needs list')
  const listed = needs[1].split(',').map((id) => id.trim())
  assert.deepEqual([...listed].sort(), [...all.keys()].filter((id) => id !== 'ci-gate').sort())
})

test('Deploy is triggered by the CI workflow, by its name', () => {
  const name = ci.match(/^name: (.+)$/m)[1].trim()
  const triggers = deploy.match(/^ {4}workflows: \[(.*)\]\s*$/m)
  assert.ok(triggers, 'deploy.yml has a one-line workflow_run workflows list')
  assert.deepEqual(triggers[1].split(',').map((n) => n.trim()), [name])
})

// The workspace packages under apps/ and packages/, by the name pnpm --filter takes, with their scripts
function workspacePackages() {
  const found = new Map()
  for (const group of ['apps', 'packages']) {
    const dir = new URL(`../../${group}/`, import.meta.url)
    for (const entry of existsSync(dir) ? readdirSync(dir) : []) {
      const manifest = new URL(`${entry}/package.json`, dir)
      if (!existsSync(manifest)) continue
      const { name, scripts = {} } = JSON.parse(readFileSync(manifest, 'utf8'))
      found.set(name, Object.keys(scripts))
    }
  }
  return found
}

// A YAML comment runs from a # at the start of a line or after whitespace to the end of the line; a step that is
// commented out does not run, so it must not count as present
const withoutComments = (text) => text.replace(/(^|\s)#.*$/gm, '$1')

// Each `pnpm --filter <package> run <script>` of a text that is not in a comment, as [package, script]
const filterCommands = (text) => [...withoutComments(text).matchAll(/pnpm --filter (\S+) run (\S+)/g)].map(([, name, script]) => [name, script])

test('a commented-out pnpm --filter command is not a command of the workflow', () => {
  assert.deepEqual(filterCommands('      - run: pnpm --filter a run b'), [['a', 'b']])
  assert.deepEqual(filterCommands('      # - run: pnpm --filter a run b'), [])
  assert.deepEqual(filterCommands('      - run: pnpm --filter a run b # pnpm --filter c run d'), [['a', 'b']])
})

test('the pnpm --filter commands of the workflows name a workspace package and a script it has', () => {
  const packages = workspacePackages()
  const checks = filterCommands(jobs(ci).get('home-checks').join('\n'))
  const release = filterCommands(deploy)
  // The commands must exist at all: a workflow that stopped running them would otherwise pass this test
  for (const script of ['typecheck', 'test', 'build']) {
    assert.ok(checks.some(([name, s]) => name === '@aloong-planet/home' && s === script), `home-checks runs ${script} of @aloong-planet/home`)
  }
  assert.ok(release.some(([name, script]) => name === '@aloong-planet/home' && script === 'cf:deploy'), 'Deploy runs cf:deploy of @aloong-planet/home')
  for (const [name, script] of [...filterCommands(ci), ...release]) {
    assert.ok(packages.has(name), `${name} is no package of apps/ or packages/`)
    assert.ok(packages.get(name).includes(script), `${name} has no script ${script}`)
  }
})

// Its commands, in order. The browser is installed with `exec`, which the test above does not see, and pnpm answers a
// filter that matches nothing with success for exec as well; the check itself fails on a missing browser, but a
// workflow that lost the install step would then fail late and obscurely, so the steps are pinned here.
// A browser or a page that never answers must end the job at its own limit; without one a job runs for GitHub's default
// of six hours, and the gate, which waits on it, with it.
test('width-check ends at a time limit of 15 minutes', () => {
  assert.match(jobs(ci).get('width-check').join('\n'), /^ {4}timeout-minutes: 15\s*$/m)
})

test('width-check installs the browser, then runs the tests and the check of @aloong-planet/site-check', () => {
  const commands = withoutComments(jobs(ci).get('width-check').join('\n'))
    .split('\n')
    .map((line) => line.match(/^\s+- run: (.+?)\s*$/)?.[1])
    .filter(Boolean)
  assert.deepEqual(commands, [
    'pnpm install --frozen-lockfile',
    'pnpm --filter @aloong-planet/site-check exec playwright install --with-deps --only-shell chromium',
    'pnpm --filter @aloong-planet/site-check run test',
    'pnpm --filter @aloong-planet/site-check run check'
  ])
})
