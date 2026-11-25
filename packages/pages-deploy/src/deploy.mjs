// Publishes an app site to its Cloudflare Pages project with Wrangler (app-sites::REQ-003/AC-01).
//
// It builds the checked-out commit and uploads dist/ as that project's production deployment, then asks Cloudflare for the
// project's deployments and requires the one Wrangler reported to be the production deployment of this commit. It runs
// from the Deploy workflow after the checks have passed; the project must already exist, and Wrangler creates none.
//
// What it does not do: it does not request the site's public addresses afterwards, and it does not read the deployment's
// Status, which Wrangler prints as an age ("Idle", "3 seconds ago") and not as a state. The first upload to a
// Git-connected project, and the token's right to make it, are checked only by running it.
//
// This file is the command's logic with its process boundary injected; cli.mjs is the command that supplies the real one.

/**
 * @typedef {object} DeployTarget
 * @property {string} accountId The Cloudflare account that owns the project
 * @property {string} project The Pages project
 * @property {string[]} requiredFiles The files of dist/ the build must hold before anything is uploaded
 * @property {string} productionBranch The project's production branch; an upload to it is the project's production deployment
 */

/**
 * @typedef {object} DeployOptions
 * @property {DeployTarget} config The site's deployment target
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
  const {accountId, project, requiredFiles, productionBranch} = config;
  if (!accountId || !project || !Array.isArray(requiredFiles) || requiredFiles.length === 0 ||
    requiredFiles.some(file => typeof file !== 'string' || !file) ||
    typeof productionBranch !== 'string' || !productionBranch) {
    throw new Error('Missing deployment target: the account, the Pages project, the files the build must hold and the ' +
      'project\'s production branch.');
  }
  if (execute('git', ['status', '--porcelain'], true).trim()) {
    throw new Error('Commit or stash local changes before publishing.');
  }
  const revision = execute('git', ['rev-parse', 'HEAD'], true).trim();
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Cannot identify the source revision.');
  const shortRevision = revision.slice(0, 7);
  if (dryRun) {
    return `Plan: publish revision ${revision} to the Pages project ${project} (account ${accountId}, production branch ` +
      `${productionBranch}): build, upload dist, confirm the deployment in the project's list. Nothing was built or uploaded.`;
  }
  execute('pnpm', ['run', 'build']);
  for (const file of requiredFiles) {
    if (!exists(file)) throw new Error(`The build has no dist/${file}; nothing was uploaded.`);
  }
  execute('pnpm', ['exec', 'wrangler', 'pages', 'deploy', 'dist', '--project-name', project,
    '--branch', productionBranch, '--commit-hash', revision, '--commit-dirty=false']);
  const deploymentId = reportedDeploymentId(readOutput());
  const deployments = JSON.parse(execute('pnpm', ['exec', 'wrangler', 'pages', 'deployment', 'list',
    '--project-name', project, '--json'], true));
  const listed = deployments.find((/** @type {{Id: string}} */ entry) => entry.Id === deploymentId);
  if (listed?.Environment !== 'Production' || listed.Branch !== productionBranch || listed.Source !== shortRevision) {
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
