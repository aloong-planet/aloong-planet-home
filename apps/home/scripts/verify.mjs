import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
const logPath=process.argv[2] || 'docs/.workings/deployment-automation/verification.log';
const entries=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){
 if(['node_modules','.git','.wrangler','dist','artifacts'].includes(e.name))continue;
 const path=join(dir,e.name);if(resolve(path)===resolve(logPath))continue;
 if(e.isDirectory())walk(path);else if(e.isFile())entries.push(`${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${path}`);
}}
walk('.');
const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
const status=spawnSync('git',['status','--porcelain','--untracked-files=all','-z'],{encoding:'utf8'});
if(head.status!==0 || status.status!==0) throw new Error('Cannot record repository state.');
let versionManifest='';
const changed=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'});
if(changed.status!==0) throw new Error('Cannot enumerate changed files.');
for(const file of [...new Set(changed.stdout.split('\0').filter(Boolean))]) {
 const hash=spawnSync('git',['hash-object','--',file],{encoding:'utf8'});
 if(hash.status!==0 && existsSync(file)) throw new Error(`Cannot hash ${file}`);
 versionManifest+=`git hash-object -- ${JSON.stringify(file)}: ${hash.status===0?hash.stdout.trim():'deleted'} (exit ${hash.status})\n`;
}
let log=`${new Date().toISOString()}\nCommand: node scripts/verify.mjs ${logPath}\nWorking directory: ${process.cwd()}\ngit rev-parse HEAD (exit ${head.status}): ${head.stdout}git status --porcelain --untracked-files=all -z (exit ${status.status}):\n${status.stdout.replaceAll("\0","\n")}\ngit ls-files --cached --others --exclude-standard -z (exit ${changed.status}):\n${versionManifest}\nManifest: recursive fs + SHA256 in scripts/verify.mjs, exit 0. Excludes .git, node_modules, .wrangler, dist, artifacts and this output log; includes pre-existing work records.\n${entries.sort().join('\n')}\nAccording to capabilities.toml: mutation-testing, enumeration-wording-gate and theming are disabled; skipped. i18n is enabled: the homepage's dictionary is guarded by the typecheck and the tests this script runs, and Agentshed's and JustSnap's by their own commands, which this script does not run. lint and e2e-suite are enabled for the sites' own commands (the lint and tests of apps/agentshed, the tests of apps/justsnap, the width check of every site), which this script does not run. macos-distribution is inapplicable; skipped.\n`;
let exit=0;
for(const args of [['typecheck'],['test'],['build']]){
 const result=spawnSync('pnpm',args,{encoding:'utf8',env:{...process.env,WRANGLER_LOG_PATH:'.wrangler/logs'}});
 const output=`\n$ pnpm ${args.join(' ')}\n${result.stdout || ''}${result.stderr || ''}\nEXIT_CODE=${result.status}\n`;
 log+=output;process.stdout.write(output);
 if(result.error || result.status!==0){exit=result.status||1;break;}
}
mkdirSync(dirname(logPath),{recursive:true});writeFileSync(logPath,log);
console.log(`Verification exit ${exit}; full output: ${logPath}`);process.exit(exit);
