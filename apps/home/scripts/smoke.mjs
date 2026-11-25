import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setTimeout} from 'node:timers/promises';
import {blogChecks, readManifest} from './blog.mjs';
import {pageImages, motionSheets} from './image-checks.mjs';
import {isNotFoundAnswer, notFoundHeading} from './not-found-check.mjs';
const expected=JSON.parse(readFileSync('dist/deployment.json','utf8')).revision;
const {origins}=JSON.parse(readFileSync('deployment.config.json','utf8'));
const posts=await readManifest('content');
// The not-found page of each language this build deploys, known by its heading: the Chinese one answers outside /en/, the English one under it.
const headings={zh:notFoundHeading(readFileSync('dist/404.html','utf8')),en:notFoundHeading(readFileSync('dist/en/404.html','utf8'))};
async function request(url, options={}) {
  return fetch(url,{...options,signal:AbortSignal.timeout(5000),cache:'no-store'});
}
/** Requires an image file, not a page, at the given address. */
async function checkImage(origin,path) {
  const response=await request(origin+path);
  assert.equal(response.status,200,`${origin}${path} answered ${response.status}`);
  assert.match(response.headers.get('content-type') || '',/^image\//,`${origin}${path} is not an image`);
  await response.body?.cancel();
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
        assert.equal(response.status,200,`${origin}${path} answered ${response.status}`);
        assert.ok((await response.text()).includes(contains),`${origin}${path} is missing ${contains}`);
      }
      const blogFile=await request(origin+'/blog.html');
      assert.equal(blogFile.status,200,`${origin}/blog.html answered ${blogFile.status}`);
      await blogFile.body?.cancel();
      // /en leads to /en/, and the English Blog page's address with a trailing slash or .html leads to its plain address (site-languages::REQ-001/AC-03).
      for(const [from,to] of [['/en','/en/'],['/en/blog/','/en/blog'],['/en/blog.html','/en/blog']]) {
        const moved=await request(origin+from);
        assert.equal(moved.status,200,`${origin}${from} answered ${moved.status}`);
        assert.ok(moved.redirected&&new URL(moved.url).pathname===to,`${origin}${from} did not redirect to ${to}`);
        await moved.body?.cancel();
      }
      // A missing file gets the not-found page with status 404. Content types are checked as well, because a host
      // without the not-found page answers a missing file with the homepage and status 200.
      const dogScript=await request(origin+'/assets/golden-interaction.js');
      assert.match(dogScript.headers.get('content-type') || '',/javascript/,`${origin}/assets/golden-interaction.js is not a script`);
      for(const path of [...pageImages(await (await request(origin+'/')).text()),...motionSheets(await dogScript.text()),...pageImages(await (await request(origin+'/blog')).text()),...pageImages(await (await request(origin+'/en/')).text()),...pageImages(await (await request(origin+'/en/blog')).text())]) await checkImage(origin,path);
      // An address the site does not have answers 404 with its language's not-found page: under /en/ that is the English page, and a post's address under /en/ is such an address too, because posts have no English version (site-languages::REQ-001/AC-04).
      for(const [language,path] of [['zh',`/deployment-check-missing-${expected}`],['en',`/en/deployment-check-missing-${expected}`],['en',`/en/blog/${posts[0].slug}`]]) {
        const notFound=await request(origin+path);
        const notFoundPage=await notFound.text();
        assert.ok(isNotFoundAnswer(notFound.status,notFoundPage,headings[language]),`${origin}${path} is not the ${language==='en'?'English ':''}not-found page`);
        for(const image of pageImages(notFoundPage)) await checkImage(origin,image);
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
  if(Date.now()>=deadline) break;
  await setTimeout(3000);
} while(true);
console.error('Public deployment verification failed:',lastError);
process.exitCode=1;
