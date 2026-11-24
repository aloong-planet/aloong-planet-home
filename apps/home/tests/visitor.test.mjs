// Production routing and browser cookie acceptance are checked separately in the browser.
// This synchronous SQLite adapter cannot prove workerd concurrency/transaction semantics; use verify-local-api.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequest } from '../functions/api/visitor.js';
const schema = readFileSync(new URL('../migrations/0001_visitors.sql', import.meta.url), 'utf8');
function context(seed = []) {
  const sql = new DatabaseSync(':memory:');
  sql.exec(schema);
  for (const row of seed) sql.prepare('INSERT INTO visitors(ordinal,visitor_id,first_seen_at) VALUES(?,?,?)').run(...row);
  const db = {
    prepare(query) { return { query, args:[], bind(...args) { return { query, args }; } }; },
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        const results = statements.map(({query,args}) => ({ results: sql.prepare(query).all(...args) }));
        sql.exec('COMMIT');
        return results;
      } catch(error) { sql.exec('ROLLBACK'); throw error; }
    }
  };
  return { call(method='GET', cookie='', extra={}, host='https://aloongplanet.com', path='/api/visitor') {
    return onRequest({ request: new Request(`${host}${path}`, {method,headers:{cookie, ...extra}}), env:{VISITORS:db} });
  }, storage:()=>({columns:sql.prepare("PRAGMA table_info(visitors)").all().map(r=>r.name),rows:sql.prepare("SELECT * FROM visitors").all()}), close:()=>sql.close() };
}
async function identity(ctx, host) {
  const response = await ctx.call('GET','',{},host);
  return response.headers.get('set-cookie').split(';')[0];
}
test('first visit establishes a cookie before allocating the first ordinal', async () => {
  const ctx=context();
  try {
    const response=await ctx.call();
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{ready:true});
    const cookie=response.headers.get('set-cookie');
    assert.match(cookie,/HttpOnly/); assert.match(cookie,/Secure/);
    assert.match(cookie,/Max-Age=31536000/); assert.match(cookie,/SameSite=Lax/);
    const visit=await ctx.call('POST',cookie.split(';')[0]);
    assert.deepEqual(await visit.json(),{ordinal:1,total:1});
    assert.match(visit.headers.get('cache-control'),/no-store/);
  } finally {ctx.close();}
});
test('refreshes and new tabs reuse the ordinal; the next new browser gets 2',async()=>{
 const ctx=context();try{
  const cookie=await identity(ctx);
  for(let i=0;i<5;i++) assert.deepEqual(await (await ctx.call('POST',cookie)).json(),{ordinal:1,total:1});
  const returningSetup=await ctx.call('GET',cookie);
  assert.equal(returningSetup.headers.get('set-cookie'),null);
  const other=await identity(ctx);
  assert.deepEqual(await (await ctx.call('POST',other)).json(),{ordinal:2,total:2});
 }finally{ctx.close();}
});
test('concurrent duplicate registration is idempotent',async()=>{
 const ctx=context();try{
  const cookie=await identity(ctx);
  const responses=await Promise.all(Array.from({length:20},async()=> (await ctx.call('POST',cookie)).json()));
  assert.equal(responses.length,20);
  for(const response of responses) assert.deepEqual(response,{ordinal:1,total:1});
  assert.deepEqual(await (await ctx.call('POST',await identity(ctx))).json(),{ordinal:2,total:2});
 }finally{ctx.close();}
});
test('separate concurrent identities receive distinct consecutive ordinals',async()=>{
 const ctx=context();try{
  const cookies=await Promise.all(Array.from({length:10},()=>identity(ctx)));
  const responses=await Promise.all(cookies.map(async cookie=>(await ctx.call('POST',cookie)).json()));
  assert.deepEqual(responses.map(r=>r.ordinal).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10]);
 }finally{ctx.close();}
});
test('missing, malformed and duplicate cookies do not create visitors',async()=>{
 const ctx=context();try{
  for(const cookie of ['', 'aloong_visitor=bad','aloong_visitor=%xx','aloong_visitor=bad; aloong_visitor=bad']) {
   const response=await ctx.call('POST',cookie); assert.equal(response.status,428);
  }
  const replacement=await ctx.call('GET','aloong_visitor=bad');
  assert.match(replacement.headers.get('set-cookie'),/^aloong_visitor=[0-9a-f-]+;/);
  assert.deepEqual(await (await ctx.call('POST',await identity(ctx))).json(),{ordinal:1,total:1});
 }finally{ctx.close();}
});
test('foreign origins and unsupported methods cannot register visitors',async()=>{
 const ctx=context();try{
  const cookie=await identity(ctx);
  assert.equal((await ctx.call('POST',cookie,{Origin:'https://example.org'})).status,403);
  assert.equal((await ctx.call('POST',cookie,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await ctx.call('DELETE',cookie)).status,405);
  assert.deepEqual(await (await ctx.call('POST',await identity(ctx),{Origin:'https://aloongplanet.com'})).json(),{ordinal:1,total:1});
 }finally{ctx.close();}
});
test('database failure returns an uncached error without replacing identity',async()=>{
 const ctx=context();try{
  const cookie=await identity(ctx);
  const result=await onRequest({request:new Request('https://aloongplanet.com/api/visitor',{method:'POST',headers:{cookie}}),env:{VISITORS:{batch:async()=>{throw Error('quota');},prepare:()=>({bind:()=>({})})}}});
  assert.equal(result.status,503); assert.deepEqual(await result.json(),{error:'temporarily_unavailable'});
  assert.equal(result.headers.get('set-cookie'),null); assert.match(result.headers.get('cache-control'),/no-store/);
 }finally{ctx.close();}
});
test('cookie scope shares apex/www only, keeping local and preview identities isolated',async()=>{
 const ctx=context();try{
  for(const host of ['https://aloongplanet.com','https://www.aloongplanet.com']){
   const cookie=(await ctx.call('GET','',{},host)).headers.get('set-cookie');
   assert.match(cookie,/Domain=aloongplanet.com/); assert.match(cookie,/; Secure/);
  }
  for(const host of ['http://127.0.0.1:8793','https://aloong-home.pages.dev','https://evilaloongplanet.com']){
   const cookie=(await ctx.call('GET','',{},host)).headers.get('set-cookie');
   assert.doesNotMatch(cookie,/Domain=/);
   if(host.startsWith('http:')) assert.doesNotMatch(cookie,/; Secure/);
  }
 }finally{ctx.close();}
});

test('ambiguous valid cookies are rejected without allocating an ordinal',async()=>{
 const ctx=context();try{
  const one=await identity(ctx),two=await identity(ctx);
  for(const cookie of [`${one}; ${one}`,`${one}; ${two}`]) assert.equal((await ctx.call('POST',cookie)).status,428);
  assert.deepEqual(await (await ctx.call('POST',await identity(ctx))).json(),{ordinal:1,total:1});
 }finally{ctx.close();}
});
test('persistent storage contains only anonymous identity, ordinal and first timestamp',async()=>{
 const ctx=context();try{
  const cookie=await identity(ctx);
  await ctx.call('POST',cookie,{'CF-Connecting-IP':'192.0.2.1','User-Agent':'PrivacyFixture/1'});
  const storage=ctx.storage();
  assert.deepEqual(storage.columns,['ordinal','visitor_id','first_seen_at']);
  assert.equal(storage.rows.length,1);
  assert.equal(storage.rows[0].ordinal,1);
  assert.equal(storage.rows[0].visitor_id,cookie.split('=')[1]);
  assert.match(storage.rows[0].first_seen_at,/^\d{4}-\d{2}-\d{2}T/);
 }finally{ctx.close();}
});

test('returning browsers receive the shared total while keeping their original ordinal',async()=>{
 const ctx=context();try{
  const first=await identity(ctx),second=await identity(ctx);
  await ctx.call('POST',first);
  await ctx.call('POST',second);
  assert.deepEqual(await (await ctx.call('POST',first)).json(),{ordinal:1,total:2});
 }finally{ctx.close();}
});

test('total reads neither issue identities nor add records, including empty and legacy databases',async()=>{
 for(const seed of [[],[[7,'00000000-0000-4000-8000-000000000001','2026-01-01T00:00:00Z']]]){
  const ctx=context(seed);try{
   for(let i=0;i<3;i++){
    const response=await ctx.call('GET','',{},undefined,'/api/visitor?total=1');
    assert.equal(response.status,200);
    assert.equal(response.headers.get('set-cookie'),null);
    assert.match(response.headers.get('cache-control'),/no-store/);
    assert.deepEqual(await response.json(),{total:seed.length});
   }
   if(seed.length){
    const cookie='aloong_visitor=00000000-0000-4000-8000-000000000001';
    assert.deepEqual(await (await ctx.call('POST',cookie)).json(),{ordinal:7,total:1});
    assert.deepEqual(ctx.storage().rows.map(row=>[row.ordinal,row.visitor_id,row.first_seen_at]),seed);
   }
   assert.equal((await ctx.call('GET','',{Origin:'https://example.org'},undefined,'/api/visitor?total=1')).status,403);
   assert.equal((await ctx.call('DELETE','',{},undefined,'/api/visitor?total=1')).status,405);
  }finally{ctx.close();}
 }
});

test('unavailable storage hides total reads without issuing an identity',async()=>{
 const ctx=context();ctx.close();
 const response=await ctx.call('GET','',{},undefined,'/api/visitor?total=1');
 assert.equal(response.status,503);
 assert.equal(response.headers.get('set-cookie'),null);
 assert.deepEqual(await response.json(),{error:'temporarily_unavailable'});
});
