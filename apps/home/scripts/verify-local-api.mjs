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
 return response.json();
}
async function total() {
 const response=await fetch(`${url}?total=1`);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('set-cookie'),null);
 assert.match(response.headers.get('cache-control'),/no-store/);
 return (await response.json()).total;
}
const before=await total();
const cookie=await setup();
assert.equal(await total(),before);
const first=await visit(cookie);
assert.ok(Number.isSafeInteger(first.ordinal)&&first.ordinal>0);
assert.equal(first.total,before+1);
assert.deepEqual(await visit(cookie),first);
const duplicates=await Promise.all(Array.from({length:30},()=>visit(cookie)));
assert.equal(duplicates.length,30);
for(const result of duplicates)assert.deepEqual(result,first);
assert.deepEqual(await visit(await setup()),{ordinal:first.ordinal+1,total:before+2});
const cookies=await Promise.all(Array.from({length:10},setup));
const visits=await Promise.all(cookies.map(visit));
assert.equal(new Set(visits.map(v=>v.ordinal)).size,10);
assert.equal(Math.min(...visits.map(v=>v.ordinal)),first.ordinal+2);
assert.equal(Math.max(...visits.map(v=>v.ordinal)),first.ordinal+11);
assert.equal(await total(),before+12);
assert.deepEqual(await visit(cookie),{ordinal:first.ordinal,total:before+12});
for(let i=0;i<5;i++)assert.equal(await total(),before+12);
const blocked=await fetch(url,{method:'POST'});
assert.equal(blocked.status,428);
const forbidden=await fetch(url,{method:'POST',headers:{cookie,origin:'https://example.org'}});
assert.equal(forbidden.status,403);
assert.equal(await total(),before+12);
console.log(JSON.stringify({runtime:'Cloudflare local D1',firstOrdinal:first.ordinal,totalBefore:before,totalAfter:before+12,refreshSame:true,parallelDuplicateRequests:30,distinctConcurrentVisitors:10,readOnlyPolling:true,blockedCookieStatus:428,foreignOriginStatus:403,result:'passed'}));
