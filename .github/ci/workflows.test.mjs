// The links between this repository's workflow files that no run reports when they break: a job the gate does
// not wait on, and a Deploy trigger that names no workflow. Run: node --test .github/ci/*.test.mjs
// Gap: Deploy's job condition and steps run only on the hosted runner, from the default branch's copy of
// deploy.yml; they are checked in the Deploy run of the first push to main after a change to deploy.yml.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (name) => readFileSync(new URL(`../workflows/${name}`, import.meta.url), 'utf8')
const ci = read('ci.yml')

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
  const triggers = read('deploy.yml').match(/^ {4}workflows: \[(.*)\]\s*$/m)
  assert.ok(triggers, 'deploy.yml has a one-line workflow_run workflows list')
  assert.deepEqual(triggers[1].split(',').map((n) => n.trim()), [name])
})
