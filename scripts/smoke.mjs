import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setTimeout} from 'node:timers/promises';
const expected=JSON.parse(readFileSync('dist/deployment.json','utf8')).revision;
const origins=['https://aloong-planet-home.pages.dev','https://aloongplanet.com','https://www.aloongplanet.com'];
async function request(url, options={}) {
  return fetch(url,{...options,signal:AbortSignal.timeout(5000),cache:'no-store'});
}
const deadline=Date.now()+120000;
let lastError;
do {
  try {
    for(const origin of origins) {
      const manifest=await request(`${origin}/deployment.json?revision=${expected}`);
      assert.equal(manifest.status,200);
      assert.equal((await manifest.json()).revision,expected);
      for(const path of ['/','/blog.html','/assets/apps/transfer-main-light.jpg','/assets/apps/agentshed-main-90days.png']) {
        const response=await request(origin+path);
        assert.equal(response.status,200,origin+path);
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
