// Browser execution of the emitted modules is checked against local workerd separately.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readBuilt} from './helpers/built-site.mjs';
import {readManifest} from '../scripts/blog.mjs';

test('every published page registers visitors, with a display only on each language\'s homepage and no registration on either 404 (visitor-counter::REQ-001/AC-01)',async()=>{
 const posts=await readManifest(new URL('../content',import.meta.url).pathname);
 assert.ok(posts.length>1);
 for(const path of ['index.html','blog.html','en/index.html','en/blog.html',...posts.map(post=>`blog/${post.slug}.html`)]){
  const html=await readBuilt(path);
  assert.equal((html.match(/<script type="module" src="\/visitor.js"><\/script>/g)||[]).length,1,path);
  assert.equal(html.includes('data-visitor-counter'),path==='index.html'||path==='en/index.html',path);
 }
 for(const path of ['404.html','en/404.html'])assert.doesNotMatch(await readBuilt(path),/visitor.js|data-visitor-counter/,path);
});
