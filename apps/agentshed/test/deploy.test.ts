// The script that publishes the site to Cloudflare Pages (app-sites::REQ-003/AC-01, app-sites::REQ-001), with the
// process boundary replaced: no command here reaches Cloudflare, git or a build. The script runs after this
// repository's checks have passed, so it publishes only a clean checkout of one commit and then confirms that
// the deployment it created is the production deployment of that commit.
//
// Not covered here, because it needs a real Cloudflare project and a real token: that Wrangler's upload is accepted
// by the `agentshed` project and that the token may use it. The first deploy run after the project's Git builds are
// turned off is that check; a failure of either shows as a failed run.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { deploy } from '../scripts/deploy.mjs'

const REV = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'
const ID = '3f2a6c1e-9b8d-4e7f-a0c5-1d2e3f4a5b6c'
const URL_OF_DEPLOYMENT = 'https://3f2a6c1e.agentshed.pages.dev'
const config = { accountId: 'test-account', project: 'agentshed' }

const BUILD = 'pnpm run build'
const UPLOAD = `pnpm exec wrangler pages deploy dist --project-name agentshed --branch main --commit-hash ${REV} --commit-dirty=false`
const LIST = 'pnpm exec wrangler pages deployment list --project-name agentshed --json'

/** What Wrangler writes to its output file for an upload (one JSON object per line), the entry the script reads */
const uploaded = (id = ID) =>
  [
    { type: 'wrangler-session', version: 1, wrangler_version: '4.156.1' },
    { type: 'pages-deploy', version: 1, pages_project: 'agentshed', deployment_id: id, url: URL_OF_DEPLOYMENT },
    {
      type: 'pages-deploy-detailed',
      version: 1,
      pages_project: 'agentshed',
      deployment_id: id,
      url: URL_OF_DEPLOYMENT,
      environment: 'production',
      production_branch: 'main',
      deployment_trigger: { metadata: { commit_hash: REV } }
    }
  ]
    .map((entry) => JSON.stringify(entry))
    .join('\n')

/** One row of `wrangler pages deployment list --json`, as it prints them today (Status is an age, not a state) */
const row = (over: Record<string, string> = {}) => ({
  Id: ID,
  Environment: 'Production',
  Branch: 'main',
  Source: REV.slice(0, 7),
  Deployment: URL_OF_DEPLOYMENT,
  Status: '3 seconds ago',
  Build: `https://dash.cloudflare.com/test-account/pages/view/agentshed/${ID}`,
  ...over
})
const older = row({ Id: '64c34c98-71d5-4bd7-87f2-ce00a6e5e6bd', Source: 'ba48d34', Status: 'Idle' })

interface Options {
  /** The command line that fails when it is run */
  fail?: string
  dirty?: boolean
  head?: string
  /** Files of dist/ that exist */
  files?: string[]
  output?: string
  list?: unknown
}

function boundary({
  fail = '',
  dirty = false,
  head = REV,
  files = ['index.html', 'zh/index.html'],
  output = uploaded(),
  list = [row(), older]
}: Options = {}) {
  const calls: string[] = []
  return {
    calls,
    execute(command: string, args: string[]): string {
      const line = [command, ...args].join(' ')
      calls.push(line)
      if (line === fail) throw new Error('Simulated external process failure')
      if (line === 'git status --porcelain') return dirty ? ' M src/pages/index.astro' : ''
      if (line === 'git rev-parse HEAD') return `${head}\n`
      if (line === LIST) return JSON.stringify(list)
      return ''
    },
    readOutput(): string {
      calls.push('read wrangler output')
      return output
    },
    exists(path: string): boolean {
      calls.push(`exists ${path}`)
      return files.includes(path)
    }
  }
}

describe('publishing the site', () => {
  test('builds one clean commit, uploads it as the production deployment and confirms it in the deployment list', () => {
    const run = boundary()
    const summary = deploy({ config, ...run })
    expect(run.calls).toEqual([
      'git status --porcelain',
      'git rev-parse HEAD',
      BUILD,
      'exists index.html',
      'exists zh/index.html',
      UPLOAD,
      'read wrangler output',
      LIST
    ])
    expect(summary).toBe(`Deployed ${ID} (Production, ${REV.slice(0, 7)}) ${URL_OF_DEPLOYMENT}`)
  })

  test('a checkout with local changes is not built or uploaded', () => {
    const run = boundary({ dirty: true })
    expect(() => deploy({ config, ...run })).toThrow(/Commit or stash/)
    expect(run.calls).toEqual(['git status --porcelain'])
  })

  test.each(['', 'HEAD', 'a1b2c3', REV.toUpperCase(), `${REV}0`])('a source revision that is not 40 hex digits (%j) is not built or uploaded', (head) => {
    const run = boundary({ head })
    expect(() => deploy({ config, ...run })).toThrow(/source revision/)
    expect(run.calls).toEqual(['git status --porcelain', 'git rev-parse HEAD'])
  })

  test.each(['index.html', 'zh/index.html'])('a build without dist/%s is not uploaded', (missing) => {
    const run = boundary({ files: ['index.html', 'zh/index.html'].filter((file) => file !== missing) })
    expect(() => deploy({ config, ...run })).toThrow(new RegExp(`dist/${missing}`))
    expect(run.calls).not.toContain(UPLOAD)
  })

  test.each([BUILD, UPLOAD, LIST])('a failing command stops the run at %s', (failing) => {
    const run = boundary({ fail: failing })
    expect(() => deploy({ config, ...run })).toThrow(/external process failure/)
    expect(run.calls.at(-1)).toBe(failing)
  })

  test.each([
    ['no output at all', ''],
    ['output with no deployment entry', JSON.stringify({ type: 'wrangler-session', version: 1 })],
    ['a deployment entry without an id', JSON.stringify({ type: 'pages-deploy-detailed', version: 1 })],
    ['output that is not JSON', 'Deployment complete!']
  ])('%s is a failed run: the deployment is not confirmed', (_name, output) => {
    const run = boundary({ output })
    expect(() => deploy({ config, ...run })).toThrow(/deployment/i)
    expect(run.calls).not.toContain(LIST)
  })

  test.each([
    ['is not in the list', [older]],
    ['is a preview deployment', [row({ Environment: 'Preview' }), older]],
    ['is on another branch', [row({ Branch: 'feature' }), older]],
    ['is of another commit', [row({ Source: 'ba48d34' }), older]]
  ])('a deployment that %s is not reported as published', (_name, list) => {
    const run = boundary({ list })
    expect(() => deploy({ config, ...run })).toThrow(/production deployment/)
  })

  test('a dry run reads the source and stops before building', () => {
    const run = boundary()
    expect(deploy({ config, ...run, dryRun: true })).toMatch(/^Plan: /)
    expect(run.calls).toEqual(['git status --porcelain', 'git rev-parse HEAD'])
  })

  test.each([{ accountId: '' }, { project: '' }])('a target missing %j is rejected before any command', (blank) => {
    const run = boundary()
    expect(() => deploy({ config: { ...config, ...blank }, ...run })).toThrow(/deployment target/)
    expect(run.calls).toEqual([])
  })
})

// The main block of scripts/deploy.mjs, run as the package scripts run it: from the package directory.
const root = fileURLToPath(new URL('..', import.meta.url))
const script = fileURLToPath(new URL('../scripts/deploy.mjs', import.meta.url))
const runScript = (args: string[], env: Record<string, string> = {}) =>
  spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } })

describe('the deploy script as a command', () => {
  test('its usage line names a command that works from the repository root', () => {
    const run = runScript(['--no-such-flag'])
    expect(run.status).toBe(1)
    expect(run.stderr.trim()).toBe('Usage: pnpm --filter @aloong-planet/agentshed run cf:deploy [--dry-run]')
  })

  test('an account in the environment other than the one in deployment.config.json stops it before any command', () => {
    const run = runScript(['--dry-run'], { CLOUDFLARE_ACCOUNT_ID: 'another-account' })
    expect(run.status).toBe(1)
    expect(run.stdout).toBe('')
    expect(run.stderr.trim()).toBe('CLOUDFLARE_ACCOUNT_ID differs from deployment.config.json.')
  })
})
