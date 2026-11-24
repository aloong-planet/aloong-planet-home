import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {deploy} from '../scripts/deploy.mjs';

const config = {name: 'personal-site', account_id: 'test-account',
  d1_databases: [{binding: 'VISITORS', database_id: 'test-database'}],
  env: {preview: {d1_databases: []}}};
function processBoundary({fail = '', dirty = false, projects = [{"Project Name": 'personal-site'}]} = {}) {
  const calls = [];
  return {calls, execute(command, args) {
    const line = [command, ...args].join(' ');
    calls.push(line);
    if (line === fail) throw new Error('Simulated external process failure');
    if (line === 'git status --porcelain') return dirty ? ' M public/index.html' : '';
    if (line === 'git rev-parse HEAD') return 'a'.repeat(40);
    if (line.endsWith('project list --json')) return JSON.stringify(projects);
    return '';
  }};
}

test('deployment verifies before mutating existing resources and checks the public result', () => {
  const boundary = processBoundary();
  deploy({config, ...boundary});
  assert.deepEqual(boundary.calls, [
    'git status --porcelain', 'git rev-parse HEAD', 'pnpm check',
    'pnpm exec wrangler pages project list --json', 'pnpm exec wrangler d1 info VISITORS',
    'git status --porcelain', 'git rev-parse HEAD',
    'pnpm exec wrangler d1 migrations apply VISITORS --remote',
    `pnpm exec wrangler pages deploy dist --project-name personal-site --branch main --commit-hash ${'a'.repeat(40)} --commit-dirty=false`,
    'pnpm smoke',
  ]);
});

for (const failure of ['pnpm check', 'pnpm exec wrangler pages project list --json',
  'pnpm exec wrangler d1 info VISITORS', 'pnpm exec wrangler d1 migrations apply VISITORS --remote',
  `pnpm exec wrangler pages deploy dist --project-name personal-site --branch main --commit-hash ${'a'.repeat(40)} --commit-dirty=false`, 'pnpm smoke']) {
  test(`deployment stops and reports failure at ${failure}`, () => {
    const boundary = processBoundary({fail: failure});
    assert.throws(() => deploy({config, ...boundary}), /external process failure/);
    assert.equal(boundary.calls.at(-1), failure);
  });
}

test('missing resources and dirty source cannot trigger migrations or uploads', () => {
  for (const options of [{dirty: true}, {projects: []}]) {
    const boundary = processBoundary(options);
    assert.throws(() => deploy({config, ...boundary}), /Commit or stash|project not found/);
    assert.ok(boundary.calls.every(line => !line.includes('migrations') && !line.includes('pages deploy')));
  }
});

test('preview production binding is rejected before any command', () => {
  const boundary = processBoundary();
  assert.throws(() => deploy({config: {...config, env: {preview: {d1_databases: [{binding: 'VISITORS'}]}}}, ...boundary}), /isolated preview/);
  assert.deepEqual(boundary.calls, []);
});

test('dry run needs no Cloudflare access and cannot change data', () => {
  const boundary = processBoundary();
  deploy({config, ...boundary, dryRun: true});
  assert.deepEqual(boundary.calls, ['git status --porcelain', 'git rev-parse HEAD']);
});

test('edits made during verification abort before changing production', () => {
  const boundary = processBoundary();
  const execute = (command, args, capture) => {
    if (command === 'git' && args[0] === 'status' && boundary.calls.includes('pnpm check')) return ' M public/index.html';
    return boundary.execute(command, args, capture);
  };
  assert.throws(() => deploy({config, execute}), /Source changed during verification/);
  assert.ok(boundary.calls.every(line => !line.includes('migrations') && !line.includes('pages deploy')));
});

// Gap: the authentication hint printed when a Wrangler command fails (the main block of deploy.mjs) needs a real
// failing process to run, so only the usage line below is tested.
test('the usage line of the deploy script names a command that works from the repository root', () => {
  const run = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/deploy.mjs', import.meta.url)), '--no-such-flag'], {encoding: 'utf8'});
  assert.equal(run.status, 1);
  assert.equal(run.stderr.trim(), 'Usage: pnpm --filter @aloong-planet/home run cf:deploy [--dry-run]');
});
