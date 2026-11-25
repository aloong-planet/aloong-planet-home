// Native cookie persistence, Web Locks and rendered placement require browser checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startVisitorCounter, getVisitorTotal, readVisitorTotal } from '../public/visitor.js';

test('client uses a cookie roundtrip and returns a validated total',async()=>{
 const calls=[];
 const result=await getVisitorTotal(async(url,options)=>{
  calls.push({url,...options});
  return Response.json(options.method==='POST'?{ordinal:7,total:42}:{ready:true});
 });
 assert.equal(result,42); assert.equal(calls.length,2);
 assert.equal(calls[0].url,'/api/visitor'); assert.equal(calls[1].method,'POST');
 for(const call of calls){assert.equal(call.credentials,'same-origin');assert.equal(call.cache,'no-store');}
});
test('client rejects unavailable storage, blocked cookies and corrupt counts',async()=>{
 for(const status of [428,503]){
  await assert.rejects(getVisitorTotal(async(_url,options)=> options.method==='POST'?new Response('',{status}):Response.json({ready:true})));
 }
 for(const total of [0,-1,1.5,'42',null,Number.MAX_SAFE_INTEGER+1]){
  await assert.rejects(getVisitorTotal(async(_url,options)=> Response.json(options.method==='POST'?{total}:{ready:true})),/Invalid visitor total/);
 }
});
test('client stops after setup failure and propagates aborted requests',async()=>{
 let calls=0;
 await assert.rejects(getVisitorTotal(async()=>{calls++;return new Response('',{status:503});}));
 assert.equal(calls,1);
 const controller=new AbortController();controller.abort();
 await assert.rejects(getVisitorTotal(async(_url,options)=>{options.signal.throwIfAborted();},controller.signal),{name:'AbortError'});
});
const settle = () => new Promise(resolve=>setImmediate(resolve));
// `lang` is the page's document language. `locale` stands for the browser's own number format, which no test may leave to the
// machine it runs on: it is written into every fixture, English-US unless a test sets another.
function pageFixture(counter = true, lang = 'zh-CN', locale = 'en-US') {
 const element={textContent:''};
 const page=Object.assign(new EventTarget(),{visibilityState:'visible',querySelector:()=>counter?element:null,documentElement:{lang}});
 const lifecycle=new EventTarget();
 const visibility = state => {page.visibilityState=state;page.dispatchEvent(new Event('visibilitychange'));};
 const history = type => lifecycle.dispatchEvent(Object.assign(new Event(type),{persisted:true}));
 return {element,page,lifecycle,visibility,history,locale};
}
test('the visible homepage refreshes its shared total without registering again',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const fixture=pageFixture();
 let total=1024, registrations=0;
 const fetcher=async(url,options)=>{
  if(options.method==='POST'){registrations++;return Response.json({ordinal:1,total});}
  return Response.json(url.includes('?')?{total}:{ready:true});
 };
 const stop=startVisitorCounter({...fixture,browser:{},fetcher});
 try{
  await settle();
  assert.equal(fixture.element.textContent,'本站累计访客 1,024 人');
  total=1025;
  t.mock.timers.tick(29999);await settle();
  assert.equal(fixture.element.textContent,'本站累计访客 1,024 人');
  t.mock.timers.tick(1);await settle();
  assert.equal(fixture.element.textContent,'本站累计访客 1,025 人');
  assert.equal(registrations,1);
 }finally{stop();}
});

test('hidden and departed pages pause reads, and visibility or history restoration refresh immediately',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const fixture=pageFixture();
 let total=1,reads=0;
 const stop=startVisitorCounter({...fixture,browser:{},fetcher:async(url,options)=>{
  if(url.includes('?'))reads++;
  return Response.json(options.method==='POST'||url.includes('?')?{total}:{ready:true});
 }});
 try{
  await settle();fixture.visibility('hidden');total=2;
  t.mock.timers.tick(90000);await settle();assert.equal(reads,0);
  fixture.visibility('visible');await settle();
  assert.equal(fixture.element.textContent,'本站累计访客 2 人');
  fixture.history('pagehide');total=3;
  t.mock.timers.tick(90000);await settle();assert.equal(reads,1);
  fixture.history('pageshow');await settle();
  assert.equal(fixture.element.textContent,'本站累计访客 3 人');
 }finally{stop();}
});

test('a slow cancelled read cannot overlap or overwrite a restored page',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const fixture=pageFixture();
 let complete,reads=0,active=0,maxActive=0;
 const stop=startVisitorCounter({...fixture,browser:{},fetcher:async(url,options)=>{
  if(!url.includes('?'))return Response.json(options.method==='POST'?{total:1}:{ready:true});
  reads++;active++;maxActive=Math.max(maxActive,active);
  const response=reads===1?await new Promise(resolve=>{complete=resolve;}):Response.json({total:3});
  active--;return response;
 }});
 try{
  await settle();t.mock.timers.tick(30000);await settle();
  fixture.visibility('hidden');fixture.visibility('visible');
  await settle();assert.equal(reads,1);
  complete(Response.json({total:2}));await settle();
  assert.equal(maxActive,1);assert.equal(reads,2);
  assert.equal(fixture.element.textContent,'本站累计访客 3 人');
 }finally{stop();}
});

test('failed refreshes hide the total and recover without registering again',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const fixture=pageFixture();
 const responses=[new Response('',{status:503}),Response.json({total:'2'}),Response.json({total:2})];
 let registrations=0;
 const stop=startVisitorCounter({...fixture,browser:{},fetcher:async(url,options)=>{
  if(url.includes('?'))return responses.shift();
  if(options.method==='POST')registrations++;
  return Response.json(options.method==='POST'?{total:1}:{ready:true});
 }});
 try{
  await settle();
  for(const expected of ['','','本站累计访客 2 人']){
   t.mock.timers.tick(30000);await settle();assert.equal(fixture.element.textContent,expected);
  }
  assert.equal(registrations,1);
 }finally{stop();}
});

test('pages without a display register once and do not poll',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const fixture=pageFixture(false);
 let registrations=0,reads=0;
 const stop=startVisitorCounter({...fixture,browser:{},fetcher:async(url,options)=>{
  if(url.includes('?'))reads++;
  if(options.method==='POST')registrations++;
  return Response.json(options.method==='POST'?{total:1}:{ready:true});
 }});
 try{
  await settle();t.mock.timers.tick(120000);fixture.visibility('hidden');fixture.visibility('visible');
  fixture.history('pagehide');fixture.history('pageshow');await settle();
  assert.equal(registrations,1);assert.equal(reads,0);
 }finally{stop();}
});

test('total reads accept zero, reject corrupt numbers and never bootstrap an identity',async()=>{
 for(const total of [0,42,-1,0.5,'42',null,Number.MAX_SAFE_INTEGER+1]){
  const read=readVisitorTotal(async(url,options)=>{
   assert.equal(url,'/api/visitor?total=1');assert.equal(options.method,undefined);
   assert.equal(options.cache,'no-store');return Response.json({total});
  });
  if(total===0||total===42)assert.equal(await read,total);
  else await assert.rejects(read,/Invalid visitor total/);
 }
});

test('an interrupted blog registration retries when the reader returns',async()=>{
 const fixture=pageFixture(false);
 let setup=0,complete,registrations=0;
 const stop=startVisitorCounter({...fixture,browser:{},fetcher:async(_url,options)=>{
  if(options.method==='POST'){registrations++;return Response.json({total:1});}
  setup++;
  if(setup===1)await new Promise(resolve=>{complete=resolve;});
  options.signal.throwIfAborted();return Response.json({ready:true});
 }});
 try{
  fixture.visibility('hidden');fixture.visibility('visible');complete();await settle();
  assert.equal(registrations,1);
 }finally{stop();}
});

test('a departed page ignores a late response and stops future work',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const fixture=pageFixture();
 let finish,reads=0;
 const stop=startVisitorCounter({...fixture,browser:{},fetcher:async(url,options)=>{
  if(!url.includes('?'))return Response.json(options.method==='POST'?{total:1}:{ready:true});
  reads++;return new Promise(resolve=>{finish=resolve;});
 }});
 await settle();t.mock.timers.tick(30000);await settle();stop();
 finish(Response.json({total:9}));await settle();
 fixture.history('pageshow');t.mock.timers.tick(90000);await settle();
 assert.equal(fixture.element.textContent,'本站累计访客 1 人');assert.equal(reads,1);
});

test('initial failure hides the counter and a later successful registration recovers',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const fixture=pageFixture();fixture.element.textContent='old';
 let unavailable=true;
 const stop=startVisitorCounter({...fixture,browser:{},fetcher:async(_url,options)=>unavailable
  ?new Response('',{status:503}):Response.json(options.method==='POST'?{total:2}:{ready:true})});
 try{
  await settle();assert.equal(fixture.element.textContent,'');unavailable=false;
  t.mock.timers.tick(30000);await settle();assert.equal(fixture.element.textContent,'本站累计访客 2 人');
 }finally{stop();}
});

test('a request times out after five seconds and leaves the counter hidden',async()=>{
 const fixture=pageFixture();fixture.element.textContent='old';
 let timeoutReason;
 const stop=startVisitorCounter({...fixture,browser:{},fetcher:async(_url,options)=>new Promise((resolve,reject)=>{
  options.signal.addEventListener('abort',()=>{timeoutReason=options.signal.reason;reject(timeoutReason);},{once:true});
 })});
 try{
  await new Promise(resolve=>setTimeout(resolve,5100));await settle();
  assert.equal(timeoutReason?.name,'TimeoutError');assert.equal(fixture.element.textContent,'');
 }finally{stop();}
});

// What the line reads for a total, on each language's homepage (visitor-counter::REQ-001/AC-02). The English plural is the platform's
// rule for English, measured on this runtime: 1 is `one`, and 0, 2, 5, 21 and 1000 are all `other`.
const LINES = [
 ['zh-CN',1,'本站累计访客 1 人'],['zh-CN',2,'本站累计访客 2 人'],['zh-CN',1000,'本站累计访客 1,000 人'],
 ['en',1,'1 visitor so far'],['en',2,'2 visitors so far'],['en',5,'5 visitors so far'],['en',21,'21 visitors so far'],['en',1000,'1,000 visitors so far'],
];
for(const [lang,total,expected] of LINES){
 test(`a page in ${lang} shows "${expected}" for a total of ${total}`,async()=>{
  const fixture=pageFixture(true,lang);
  const stop=startVisitorCounter({...fixture,browser:{},fetcher:async(_url,options)=>Response.json(options.method==='POST'?{total}:{ready:true})});
  try{await settle();assert.equal(fixture.element.textContent,expected);}finally{stop();}
 });
}

// The number is written in the browser's own format, whatever the page's language: a German browser reads 1.234 on the English page
// and on the Chinese one alike. A Chinese or English browser writes 1,234 on both, so only a browser that differs from both pages shows
// which of the two the number follows.
for(const [lang,expected] of [['zh-CN','本站累计访客 1.234 人'],['en','1.234 visitors so far']]){
 test(`a German browser reads the total in its own number format on a page in ${lang}`,async()=>{
  const fixture=pageFixture(true,lang,'de-DE');
  const stop=startVisitorCounter({...fixture,browser:{},fetcher:async(_url,options)=>Response.json(options.method==='POST'?{total:1234}:{ready:true})});
  try{await settle();assert.equal(fixture.element.textContent,expected);}finally{stop();}
 });
}
