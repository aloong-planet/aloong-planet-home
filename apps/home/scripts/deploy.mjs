import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// The process boundary is injectable so failure handling can be tested without credentials.
export function deploy({config, execute, dryRun = false}) {
  if (!config.account_id || !config.name || config.d1_databases?.length !== 1 ||
      config.d1_databases[0].binding !== 'VISITORS' || !config.d1_databases[0].database_id ||
      config.env?.preview?.d1_databases?.length !== 0) {
    throw new Error('Missing deployment target or isolated preview configuration.');
  }
  const run = (command, args, capture = false) => execute(command, args, capture);
  if (run('git', ['status', '--porcelain'], true).trim()) {
    throw new Error('Commit or stash local changes before publishing.');
  }
  const revision = run('git', ['rev-parse', 'HEAD'], true).trim();
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Cannot identify the source revision.');
  console.log(`Target: ${config.name}; account: ${config.account_id}; production branch: main; revision: ${revision}`);
  if (dryRun) {
    console.log('Plan: verify, check existing resources, apply pending D1 migrations, upload dist, verify public URLs. No network or writes performed.');
    return;
  }
  run('pnpm', ['check']);
  const projects = JSON.parse(run('pnpm', ['exec', 'wrangler', 'pages', 'project', 'list', '--json'], true));
  if (!projects.some(project => project['Project Name'] === config.name)) {
    throw new Error('Existing Pages project not found. Check Cloudflare login/account; no project was created.');
  }
  run('pnpm', ['exec', 'wrangler', 'd1', 'info', 'VISITORS']);
  if (run('git', ['status', '--porcelain'], true).trim() || run('git', ['rev-parse', 'HEAD'], true).trim() !== revision) {
    throw new Error('Source changed during verification; retry from a clean checkout.');
  }
  run('pnpm', ['exec', 'wrangler', 'd1', 'migrations', 'apply', 'VISITORS', '--remote']);
  run('pnpm', ['exec', 'wrangler', 'pages', 'deploy', 'dist', '--project-name', config.name,
    '--branch', 'main', '--commit-hash', revision, '--commit-dirty=false']);
  run('pnpm', ['smoke']);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--dry-run')) throw new Error('Usage: pnpm cf:deploy [--dry-run]');
    const settings = JSON.parse(readFileSync('deployment.config.json', 'utf8'));
    const config = {...JSON.parse(readFileSync('wrangler.jsonc', 'utf8')), account_id: settings.accountId};
    if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== config.account_id) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID differs from deployment.config.json.');
    }
    const env = {...process.env, CLOUDFLARE_ACCOUNT_ID: config.account_id,
      WRANGLER_LOG_PATH: '.wrangler/logs', CI: 'true'};
    deploy({config, dryRun: process.argv.includes('--dry-run'), execute(command, args, capture) {
      const result = spawnSync(command, args, {env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit'});
      if (result.error || result.status !== 0) {
        // Captured output contains resource metadata only; never print authentication env values.
        if (capture && result.stderr) process.stderr.write(result.stderr);
        throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status ?? 'unavailable'}). For Cloudflare authentication, run pnpm cf:login or configure CLOUDFLARE_API_TOKEN.`);
      }
      return result.stdout || '';
    }});
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
