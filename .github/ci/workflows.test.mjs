// The links between this repository's workflow files that no run reports when they break: a job the gate does
// not wait on, a Deploy trigger that names no workflow, and a pnpm --filter command that names no package or
// script (pnpm answers a filter that matches nothing with success). Run: node --test .github/ci/*.test.mjs
// Gap: Deploy's jobs run only on the hosted runner, from the default branch's copy of deploy.yml. The text of what
// guards each job is pinned below; that GitHub evaluates it as written, and the credential step with the secret itself,
// show only in the Deploy run of the first push to main after a change to deploy.yml. A push never takes the false
// branch of a guard, so a guard that is gone would not show there.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { readConfig } from './ci-scope.mjs'

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
  for (const site of ['home', 'agentshed']) {
    assert.ok(release.some(([name, script]) => name === `@aloong-planet/${site}` && script === 'cf:deploy'), `Deploy runs cf:deploy of @aloong-planet/${site}`)
  }
  for (const [name, script] of [...filterCommands(ci), ...release]) {
    assert.ok(packages.has(name), `${name} is no package of apps/ or packages/`)
    assert.ok(packages.get(name).includes(script), `${name} has no script ${script}`)
  }
})

// Two jobs of one workflow in one concurrency group: when a newer run's jobs wait behind a running one, GitHub cancels
// the pending job of the older run, and with a shared group that is its sibling's pending job too, so a site would miss
// its deploy. Each deploy job has its own group, and none cancels a deploy that is running.
test('each Deploy job has its own concurrency group and does not cancel a running deploy', () => {
  const all = jobs(deploy)
  assert.ok(all.size > 1)
  const groups = [...all].map(([id, lines]) => {
    const text = lines.join('\n')
    assert.match(text, /^ {6}cancel-in-progress: false\s*$/m, `${id} lets a running deploy finish`)
    const group = text.match(/^ {6}group: (\S+)\s*$/m)
    assert.ok(group, `${id} has a concurrency group`)
    return group[1]
  })
  assert.equal(new Set(groups).size, groups.length, `the jobs share a concurrency group: ${groups}`)
})

// What guards a Deploy job, for each job of deploy.yml. A pull request from a fork whose branch is named main also
// completes a CI run on `branches: [main]`, and the job holds the Cloudflare token, so the condition must name the
// event and the repository; the job builds the revision CI checked, and does not upload while a newer one is the tip.
test('each Deploy job runs for a successful push to this repository, builds the checked revision, and uploads only while it is the tip of main', () => {
  const all = jobs(deploy)
  assert.ok(all.size > 1)
  for (const [id, lines] of all) {
    const text = lines.join('\n')
    const condition = text.match(/^ {4}if: >-\n((?: {6}\S.*\n)+)/m)?.[1] ?? assert.fail(`${id} has no multi-line if`)
    for (const clause of [
      "github.event.workflow_run.conclusion == 'success'",
      "github.event.workflow_run.event == 'push'",
      'github.event.workflow_run.head_repository.full_name == github.repository'
    ]) {
      assert.ok(condition.includes(clause), `${id}: the condition lacks ${clause}`)
    }
    assert.match(text, /uses: actions\/checkout@\S+.*\n {8}with:\n {10}ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}\s*\n/, `${id} checks out the checked revision`)
    const superseded = text.search(/^ {8}run: \|\n {10}git fetch origin main\n {10}test "\$\(git rev-parse origin\/main\)" = "\$CHECKED_SHA"\s*$/m)
    assert.ok(superseded > 0, `${id} compares origin/main with the checked revision`)
    assert.match(text, /^ {6}- name: Reject superseded revisions\n {8}env:\n {10}CHECKED_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}\n/m, `${id} gives the superseded-revision step the checked revision`)
    const upload = text.search(/^ {8}run: pnpm --filter \S+ run cf:deploy\s*$/m)
    assert.ok(upload > superseded, `${id} uploads only after the superseded-revision step`)
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

// The `run:` commands of a job, in order, with the commented-out ones left out
const runCommands = (id) => withoutComments(jobs(ci).get(id).join('\n'))
  .split('\n')
  .map((line) => line.match(/^\s+- run: (.+?)\s*$/)?.[1])
  .filter(Boolean)

test('width-check installs the browser, then runs the tests and the check of @aloong-planet/site-check', () => {
  assert.deepEqual(runCommands('width-check'), [
    'pnpm install --frozen-lockfile',
    'pnpm --filter @aloong-planet/site-check exec playwright install --with-deps --only-shell chromium',
    'pnpm --filter @aloong-planet/site-check run test',
    'pnpm --filter @aloong-planet/site-check run check'
  ])
})

// agentshed-checks runs a browser through the package's own tests, so a page that never answers must end the job at its
// own limit too
test('agentshed-checks ends at a time limit of 15 minutes', () => {
  assert.match(jobs(ci).get('agentshed-checks').join('\n'), /^ {4}timeout-minutes: 15\s*$/m)
})

// The package's tests build the site themselves (test/build-site.ts), so no build step comes before them
test('agentshed-checks installs the browser, then runs the type check, the lint, the lint rule test and the tests of @aloong-planet/agentshed', () => {
  assert.deepEqual(runCommands('agentshed-checks'), [
    'pnpm install --frozen-lockfile',
    'pnpm --filter @aloong-planet/agentshed exec playwright install --with-deps --only-shell chromium',
    'pnpm --filter @aloong-planet/agentshed run check',
    'pnpm --filter @aloong-planet/agentshed run lint',
    'pnpm --filter @aloong-planet/agentshed run test:lint-rule',
    'pnpm --filter @aloong-planet/agentshed run test'
  ])
})

// The gate fails a selected job that was skipped, so a job whose condition leaves out a scope that lists it fails every
// run that selects only that scope; and the gate reads a scope's output that the `changes` job does not export as invalid.
// Both fail loudly, but only after a pull request has been opened, so they are pinned here.
test('the changes job exports every scope of routing.json', () => {
  const changes = jobs(ci).get('changes').join('\n')
  const scopes = [...readConfig().scopes.keys()]
  assert.ok(scopes.length > 1)
  for (const scope of scopes) {
    assert.match(changes, new RegExp(`^ {6}${scope}: \\$\\{\\{ steps\\.scope\\.outputs\\.${scope} \\}\\}\\s*$`, 'm'), scope)
  }
})

test('every job that routing.json lists under a scope runs when that scope is selected', () => {
  for (const [scope, ids] of readConfig().scopes) {
    for (const id of ids) {
      assert.ok(jobs(ci).has(id), `${id} is no job of the CI workflow`)
      const condition = jobs(ci).get(id).map((line) => line.match(/^ {4}if: (.+?)\s*$/)).find(Boolean)
      assert.ok(condition, `${id} has a one-line if`)
      assert.ok(condition[1].includes(`needs.changes.outputs.${scope} == 'true'`), `${id} does not run when ${scope} is selected: ${condition[1]}`)
    }
  }
})
