import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setTimeout} from 'node:timers/promises';
import {blogChecks, readManifest} from './blog.mjs';
import {homepageImages} from './image-checks.mjs';
const expected=JSON.parse(readFileSync('dist/deployment.json','utf8')).revision;
const {origins}=JSON.parse(readFileSync('deployment.config.json','utf8'));
const posts=await readManifest('content');
async function request(url, options={}) {
  return fetch(url,{...options,signal:AbortSignal.timeout(5000),cache:'no-store'});
}
const deadline=Date.now()+Number(process.env.SMOKE_DEADLINE_MS ?? 120000);
let lastError;
do {
  try {
    for(const origin of origins) {
      const manifest=await request(`${origin}/deployment.json?revision=${expected}`);
      assert.equal(manifest.status,200);
      assert.equal((await manifest.json()).revision,expected);
      for(const {path,contains} of blogChecks(posts)) {
        const response=await request(origin+path);
        assert.equal(response.status,200,origin+path);
        assert.ok((await response.text()).includes(contains),`${origin}${path} is missing ${contains}`);
      }
      const blogFile=await request(origin+'/blog.html');
      assert.equal(blogFile.status,200,origin+'/blog.html');
      await blogFile.body?.cancel();
      // The host answers a missing file with the homepage and status 200, so only the content type tells an image apart.
      for(const path of homepageImages(await (await request(origin+'/')).text())) {
        const response=await request(origin+path);
        assert.equal(response.status,200,origin+path);
        assert.match(response.headers.get('content-type') || '',/^image\//,`${origin}${path} is not an image`);
        await response.body?.cancel();
      }
      const bootstrap=await request(origin+'/api/visitor');
      assert.equal(bootstrap.status,200);
      assert.deepEqual(await bootstrap.json(),{ready:true});
      assert.match(bootstrap.headers.get('cache-control') || '',/no-store/);
      assert.ok(bootstrap.headers.get('set-cookie'));
      // Intentionally omit a cookie: deployment checks must not allocate visitor ordinals.
      const blocked=await request(origin+'/api/visitor',{method:'POST'});
      assert.equal(blocked.status,428);
      await blocked.body?.cancel();
    }
    console.log(`Verified revision ${expected} on all three public hosts; no visitor registrations created.`);
    process.exit(0);
  } catch(error) {lastError=error;}
  await setTimeout(3000);
} while(Date.now()<deadline);
console.error('Public deployment verification failed:',lastError);
process.exitCode=1;
