// This site's side of its deployment (app-sites::REQ-003/AC-01, app-sites::REQ-001): the configuration the shared
// `pages-deploy` command reads, and the script that runs it. The command's own cases (what it builds, uploads and confirms,
// and how it fails) are in packages/pages-deploy/tests/deploy.test.ts and run once, not once per site.
//
// Not covered here: that the production branch below is the one the project's settings in aloong-planet/infra name, which
// no test in this repository reads (a value that differs is a Preview upload and shows as a failed deploy run), and that
// Cloudflare takes the upload, which only a deploy run shows.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, inject, test } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = <T>(file: string): T => JSON.parse(readFileSync(join(root, file), 'utf8')) as T

describe("this site's deployment", () => {
  // The command confirms a deployment in the project it was told to upload to, so a target that named another site's
  // project would be uploaded to and confirmed all the same: this file is the only thing that says where this site goes.
  test("deployment.config.json targets this site's Pages project, in a Cloudflare account", () => {
    const target = read<{ accountId: string; project: string }>('deployment.config.json')
    expect(target.project).toBe('transfer-org')
    expect(target.accountId).toMatch(/^[0-9a-f]{32}$/)
  })

  // The command uploads to this branch and confirms the deployment on it, and the project takes an upload as its
  // production deployment only from its production branch, which for this project is master, not main as for the other
  // sites'.
  test("deployment.config.json names the branch this site's Pages project takes as production", () => {
    expect(read<{ productionBranch: string }>('deployment.config.json').productionBranch).toBe('master')
  })

  // A file the build never makes would refuse every deploy of this site; the two named are its home page in each language.
  test('the files a deploy requires of the build are the ones this site builds', () => {
    const { requiredFiles } = read<{ requiredFiles: string[] }>('deployment.config.json')
    expect(requiredFiles).toEqual(['index.html', 'en/index.html'])
    expect(requiredFiles.filter((file) => !existsSync(join(inject('builtSite'), file)))).toEqual([])
  })

  test("`pnpm run cf:deploy` runs the shared command, which reads this package's name and configuration", () => {
    const pkg = read<{ name: string; scripts: Record<string, string> }>('package.json')
    expect(pkg.scripts['cf:deploy']).toBe('pages-deploy')
    const run = spawnSync('pnpm', ['exec', 'pages-deploy', '--no-such-flag'], { cwd: root, encoding: 'utf8' })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain(`Usage: pnpm --filter ${pkg.name} run cf:deploy [--dry-run]`)
  })

  // The shared command runs `pnpm exec wrangler` from this package, so Wrangler must be one of its dependencies; a package
  // without it would build and then fail at the upload, in the deploy run.
  test('the package declares Wrangler, which the shared command runs', () => {
    const pkg = read<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>('package.json')
    expect({ ...pkg.dependencies, ...pkg.devDependencies }).toHaveProperty('wrangler')
  })
})
