// Run only against a disposable local D1 database; never creates production visitors.
import assert from 'node:assert/strict';
const url='http://127.0.0.1:8793/api/visitor';
async function setup() {
 const response=await fetch(url);
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{ready:true});
 return response.headers.get('set-cookie').split(';')[0];
}
async function visit(cookie) {
 const response=await fetch(url,{method:'POST',headers:{cookie,origin:'http://127.0.0.1:8793'}});
 assert.equal(response.status,200);
 assert.match(response.headers.get('cache-control'),/no-store/);
 return (await response.json()).ordinal;
}
const cookie=await setup();
const first=await visit(cookie);
assert.ok(Number.isSafeInteger(first)&&first>0);
assert.equal(await visit(cookie),first);
const duplicates=await Promise.all(Array.from({length:30},()=>visit(cookie)));
assert.equal(duplicates.length,30);
assert.deepEqual([...new Set(duplicates)],[first]);
assert.equal(await visit(await setup()),first+1);
const cookies=await Promise.all(Array.from({length:10},setup));
const ordinals=await Promise.all(cookies.map(visit));
assert.equal(new Set(ordinals).size,10);
assert.equal(Math.min(...ordinals),first+2);
assert.equal(Math.max(...ordinals),first+11);
const blocked=await fetch(url,{method:'POST'});
assert.equal(blocked.status,428);
const forbidden=await fetch(url,{method:'POST',headers:{cookie,origin:'https://example.org'}});
assert.equal(forbidden.status,403);
assert.equal(await visit(await setup()),first+12);
console.log(JSON.stringify({runtime:'Cloudflare local D1',firstOrdinal:first,refreshSame:true,parallelDuplicateRequests:30,distinctConcurrentVisitors:10,blockedCookieStatus:428,foreignOriginStatus:403,result:'passed'}));
