// Publishes the site to the Cloudflare Pages project `agentshed` with Wrangler (app-sites::REQ-003/AC-01).
//
// It builds the checked-out commit and uploads dist/ as that project's production deployment, then asks Cloudflare for the
// project's deployments and requires the one Wrangler reported to be the production deployment of this commit. It runs
// from the Deploy workflow after the checks have passed; the project must already exist, and Wrangler creates none.
//
// What it does not do: it does not request the site's public addresses afterwards, and it does not read the deployment's
// Status, which Wrangler prints as an age ("Idle", "3 seconds ago") and not as a state. The first upload to this
// Git-connected project, and the token's right to make it, are checked only by running it.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

/**
 * @typedef {object} DeployOptions
 * @property {{accountId: string, project: string}} config The Cloudflare account and the Pages project
 * @property {(command: string, args: string[], capture?: boolean) => string} execute Runs a command; returns its output when capture is true
 * @property {() => string} readOutput The text Wrangler wrote to its output file
 * @property {(file: string) => boolean} exists Whether a file of dist/ exists after the build
 * @property {boolean} [dryRun] Stop after reading the source revision
 */

// The process boundary is injectable so failure handling can be tested without credentials.
/**
 * @param {DeployOptions} options
 * @returns {string} The line that reports the result
 */
export function deploy({config, execute, readOutput, exists, dryRun = false}) {
  if (!config.accountId || !config.project) throw new Error('Missing deployment target: the account and the Pages project.');
  if (execute('git', ['status', '--porcelain'], true).trim()) {
    throw new Error('Commit or stash local changes before publishing.');
  }
  const revision = execute('git', ['rev-parse', 'HEAD'], true).trim();
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Cannot identify the source revision.');
  const shortRevision = revision.slice(0, 7);
  if (dryRun) {
    return `Plan: publish revision ${revision} to the Pages project ${config.project} (account ${config.accountId}, production branch main): ` +
      'build, upload dist, confirm the deployment in the project\'s list. Nothing was built or uploaded.';
  }
  execute('pnpm', ['run', 'build']);
  for (const file of ['index.html', 'zh/index.html']) {
    if (!exists(file)) throw new Error(`The build has no dist/${file}; nothing was uploaded.`);
  }
  execute('pnpm', ['exec', 'wrangler', 'pages', 'deploy', 'dist', '--project-name', config.project,
    '--branch', 'main', '--commit-hash', revision, '--commit-dirty=false']);
  const deploymentId = reportedDeploymentId(readOutput());
  const deployments = JSON.parse(execute('pnpm', ['exec', 'wrangler', 'pages', 'deployment', 'list',
    '--project-name', config.project, '--json'], true));
  const listed = deployments.find((/** @type {{Id: string}} */ entry) => entry.Id === deploymentId);
  if (listed?.Environment !== 'Production' || listed.Branch !== 'main' || listed.Source !== shortRevision) {
    throw new Error(`Deployment ${deploymentId} is not the production deployment of ${shortRevision} in the project's deployment list.`);
  }
  return `Deployed ${deploymentId} (Production, ${shortRevision}) ${listed.Deployment}`;
}

// Wrangler writes one JSON object per line to the file named by WRANGLER_OUTPUT_FILE_PATH; the upload is the entry of type
// `pages-deploy-detailed`.
/** @param {string} text */
function reportedDeploymentId(text) {
  for (const line of text.split('\n').filter(line => line.trim())) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      throw new Error('Wrangler\'s output is not readable, so the deployment is not confirmed.');
    }
    if (entry.type === 'pages-deploy-detailed' && entry.deployment_id) return entry.deployment_id;
  }
  throw new Error('Wrangler reported no deployment, so the deployment is not confirmed.');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  let outputDirectory = '';
  try {
    if (process.argv.slice(2).some(arg => arg !== '--dry-run')) throw new Error('Usage: pnpm --filter @aloong-planet/agentshed run cf:deploy [--dry-run]');
    const config = JSON.parse(readFileSync('deployment.config.json', 'utf8'));
    if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== config.accountId) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID differs from deployment.config.json.');
    }
    const dryRun = process.argv.includes('--dry-run');
    if (!dryRun) outputDirectory = mkdtempSync(join(tmpdir(), 'agentshed-deploy-'));
    const outputFile = join(outputDirectory, 'wrangler-output.ndjson');
    const env = {...process.env, CLOUDFLARE_ACCOUNT_ID: config.accountId,
      WRANGLER_OUTPUT_FILE_PATH: outputFile, WRANGLER_LOG_PATH: '.wrangler/logs', CI: 'true'};
    console.log(deploy({config, dryRun, exists: file => existsSync(join('dist', file)),
      readOutput: () => readFileSync(outputFile, 'utf8'), execute(command, args, capture) {
        const result = spawnSync(command, args, {env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit'});
        if (result.error || result.status !== 0) {
          // Captured output contains resource metadata only; never print authentication env values.
          if (capture && result.stderr) process.stderr.write(result.stderr);
          throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status ?? 'unavailable'}). Check that CLOUDFLARE_API_TOKEN is set and may edit the Pages project.`);
        }
        return result.stdout || '';
      }}));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    if (outputDirectory) rmSync(outputDirectory, {recursive: true, force: true});
  }
}
