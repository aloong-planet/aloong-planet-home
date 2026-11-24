// Browser execution of the emitted modules is checked against local workerd separately.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {realSite} from './helpers/built-site.mjs';
import {readManifest} from '../scripts/blog.mjs';

test('every published page registers visitors, with a display only on the homepage and no registration on 404',async()=>{
 const outDir=await realSite();
 const posts=await readManifest(new URL('../content',import.meta.url).pathname);
 assert.ok(posts.length>1);
 for(const path of ['index.html','blog.html',...posts.map(post=>`blog/${post.slug}.html`)]){
  const html=await readFile(join(outDir,path),'utf8');
  assert.equal((html.match(/<script type="module" src="\/visitor.js"><\/script>/g)||[]).length,1,path);
  assert.equal(html.includes('data-visitor-counter'),path==='index.html',path);
 }
 assert.doesNotMatch(await readFile(join(outDir,'404.html'),'utf8'),/visitor.js|data-visitor-counter/);
});
