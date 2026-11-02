// Native cookie persistence, Web Locks and rendered placement require browser checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getVisitorOrdinal } from '../public/visitor.js';

test('client uses a cookie roundtrip and returns a validated ordinal',async()=>{
 const calls=[];
 const result=await getVisitorOrdinal(async(url,options)=>{
  calls.push({url,...options});
  return Response.json(options.method==='POST'?{ordinal:42}:{ready:true});
 });
 assert.equal(result,42); assert.equal(calls.length,2);
 assert.equal(calls[0].url,'/api/visitor'); assert.equal(calls[1].method,'POST');
 for(const call of calls){assert.equal(call.credentials,'same-origin');assert.equal(call.cache,'no-store');}
});
test('client rejects unavailable storage, blocked cookies and corrupt counts',async()=>{
 for(const status of [428,503]){
  await assert.rejects(getVisitorOrdinal(async(_url,options)=> options.method==='POST'?new Response('',{status}):Response.json({ready:true})));
 }
 for(const ordinal of [0,-1,1.5,'42',null,Number.MAX_SAFE_INTEGER+1]){
  await assert.rejects(getVisitorOrdinal(async(_url,options)=> Response.json(options.method==='POST'?{ordinal}:{ready:true})),/Invalid visitor ordinal/);
 }
});
test('client stops after setup failure and propagates aborted requests',async()=>{
 let calls=0;
 await assert.rejects(getVisitorOrdinal(async()=>{calls++;return new Response('',{status:503});}));
 assert.equal(calls,1);
 const controller=new AbortController();controller.abort();
 await assert.rejects(getVisitorOrdinal(async(_url,options)=>{options.signal.throwIfAborted();},controller.signal),{name:'AbortError'});
});
