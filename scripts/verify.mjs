import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const logPath=process.argv[2] || 'docs/.workings/visitor-counter/verification.log';
const entries=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){
 if(['node_modules','.wrangler','dist'].includes(e.name))continue;
 const path=join(dir,e.name);if(resolve(path)===resolve(logPath))continue;if(e.isDirectory())walk(path);else entries.push(`${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${path}`);
}}
// This workspace has no Git repository. Hash the source instead of inventing commit evidence.
walk('.');
let log=`${new Date().toISOString()}\nCommand: node scripts/verify.mjs ${logPath}\nWorking directory: ${process.cwd()}\nManifest command: recursive Node fs.readdirSync + crypto SHA256, implemented in scripts/verify.mjs\nScope: all workspace files, including hidden files and pre-existing logs. Exclusions: node_modules (dependencies pinned by lock), .wrangler (local runtime state), dist (regenerated build), and only this output log.\nManifest exit: 0 (exceptions abort the runner)\nVersion: no Git repository; exact source SHA256 manifest below\n${entries.join('\n')}\nLint and automated browser E2E: disabled by confirmed capabilities; skipped.\n`;
let exit=0;
for(const args of [['test'],['typecheck'],['build']]){
 const result=spawnSync('pnpm',args,{encoding:'utf8'});
 log+=`\n$ pnpm ${args.join(' ')}\n${result.stdout}${result.stderr}\nEXIT_CODE=${result.status}\n`;
 if(result.status!==0){exit=result.status||1;break;}
}
mkdirSync('docs/.workings/visitor-counter',{recursive:true});writeFileSync(logPath,log);
console.log(`Verification exit ${exit}; full output: ${logPath}`);process.exit(exit);
