import { spawnSync } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
await mkdir('dist/assets/apps',{recursive:true});
for (const asset of ['aloong-cartoon.png','golden-interaction.js','golden-wag','apps/transfer-main-light.jpg','apps/agentshed-main-90days.png']) {
  await cp(`assets/${asset}`,`dist/assets/${asset}`,{recursive:true});
}
console.log('Built homepage, blog, visitor client and approved assets.');

const worker = spawnSync('pnpm',['exec','wrangler','pages','functions','build','--outdir','.wrangler/pages-worker'],{stdio:'inherit'});
if (worker.status !== 0) process.exit(worker.status || 1);
await cp('.wrangler/pages-worker/index.js','dist/_worker.js');
const syntax = spawnSync(process.execPath,['--check','dist/_worker.js'],{stdio:'inherit'});
if (syntax.status !== 0) process.exit(syntax.status || 1);
