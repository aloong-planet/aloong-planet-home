#!/usr/bin/env node
// `pages-deploy`: the `cf:deploy` command of a site package (app-sites::REQ-003/AC-01). A site's package.json names it as
// its `cf:deploy` script, and pnpm runs that from the package directory, which holds the site's package.json and its
// deployment.config.json: {accountId, project, requiredFiles}. The command's logic is in deploy.mjs; this file reads the
// configuration and supplies the real process boundary.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deploy} from './deploy.mjs';

let outputDirectory = '';
try {
  if (process.argv.slice(2).some(arg => arg !== '--dry-run')) {
    const {name} = JSON.parse(readFileSync('package.json', 'utf8'));
    throw new Error(`Usage: pnpm --filter ${name} run cf:deploy [--dry-run]`);
  }
  const config = JSON.parse(readFileSync('deployment.config.json', 'utf8'));
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== config.accountId) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID differs from deployment.config.json.');
  }
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun) outputDirectory = mkdtempSync(join(tmpdir(), `${config.project}-deploy-`));
  const outputFile = join(outputDirectory, 'wrangler-output.ndjson');
  const env = {...process.env, CLOUDFLARE_ACCOUNT_ID: config.accountId,
    WRANGLER_OUTPUT_FILE_PATH: outputFile, WRANGLER_LOG_PATH: '.wrangler/logs', CI: 'true'};
  console.log(deploy({config, dryRun, exists: file => existsSync(join('dist', file)),
    readOutput: () => readFileSync(outputFile, 'utf8'), execute(command, args, capture) {
      const result = spawnSync(command, args, {env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit'});
      if (result.error || result.status !== 0) {
        // Captured output contains resource metadata only; never print authentication env values.
        if (capture && result.stderr) process.stderr.write(result.stderr);
        const hint = args.includes('wrangler') ? ' Check that CLOUDFLARE_API_TOKEN is set and may edit the Pages project.' : '';
        throw new Error(`${command} ${args.join(' ')} failed (exit ${result.status ?? 'unavailable'}).${hint}`);
      }
      return result.stdout || '';
    }}));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (outputDirectory) rmSync(outputDirectory, {recursive: true, force: true});
}
