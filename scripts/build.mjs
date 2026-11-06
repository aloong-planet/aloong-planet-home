import { spawnSync } from 'node:child_process';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { buildBlog } from './blog.mjs';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
await mkdir('dist/assets/apps',{recursive:true});
for (const asset of ['aloong-cartoon.webp','golden-interaction.js','golden-wag','apps/transfer-main-light.jpg','apps/agentshed-main-90days.png']) {
  await cp(`assets/${asset}`,`dist/assets/${asset}`,{recursive:true});
}
await buildBlog({contentDir:'content',outDir:'dist'});
console.log('Built homepage, blog, visitor client and approved assets.');

const worker = spawnSync('pnpm',['exec','wrangler','pages','functions','build','--outdir','.wrangler/pages-worker'],{stdio:'inherit',env:{...process.env,WRANGLER_LOG_PATH:'.wrangler/logs'}});
if (worker.status !== 0) process.exit(worker.status || 1);
await cp('.wrangler/pages-worker/index.js','dist/_worker.js');
const syntax = spawnSync(process.execPath,['--check','dist/_worker.js'],{stdio:'inherit'});
if (syntax.status !== 0) process.exit(syntax.status || 1);

const revision = spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
if (revision.status !== 0) throw new Error('Build must run inside the source repository.');
await writeFile('dist/deployment.json', JSON.stringify({revision:revision.stdout.trim()})+'\n');
