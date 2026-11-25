
'use strict';
const goldenConfig = {"frameSize":320,"displaySize":160,"fps":24,"first":4,"last":136,"loopStart":56,"loopEndExclusive":103,"returnEntry":{"4":124,"5":124,"6":124,"7":124,"8":123,"9":122,"10":120,"11":120,"12":120,"13":119,"14":118,"15":116,"16":115,"17":113,"18":111,"19":109,"20":108,"21":108,"22":108,"23":108,"24":108,"25":108,"26":108,"27":110,"28":111,"29":111,"30":110,"31":108,"32":108,"33":108,"34":108,"35":108,"36":109,"37":111,"38":111,"39":112,"40":110,"41":109,"42":108,"43":108,"44":108,"45":108,"46":108,"47":108,"48":109,"49":110,"50":111,"51":111,"52":110,"53":109,"54":108,"55":108,"56":108,"57":108,"58":108,"59":108,"60":109,"61":110,"62":111,"63":112,"64":111,"65":110,"66":109,"67":108,"68":108,"69":108,"70":108,"71":108,"72":108,"73":108,"74":109,"75":111,"76":110,"77":109,"78":108,"79":108,"80":108,"81":108,"82":108,"83":110,"84":111,"85":112,"86":113,"87":110,"88":109,"89":108,"90":108,"91":108,"92":108,"93":108,"94":108,"95":110,"96":111,"97":111,"98":112,"99":110,"100":109,"101":108,"102":108,"103":108,"104":108,"105":108,"106":108,"107":108,"108":108,"109":109,"110":110,"111":111,"112":112,"113":113,"114":114,"115":115,"116":116,"117":117,"118":118,"119":119,"120":120,"121":121,"122":122,"123":123,"124":124,"125":124,"126":124,"127":124,"128":124,"129":124,"130":124,"131":124,"132":124,"133":124,"134":124,"135":124,"136":124},"resumeEntry":{"4":86,"5":86,"6":86,"7":86,"8":86,"9":86,"10":86,"11":86,"12":86,"13":86,"14":86,"15":86,"16":86,"17":86,"18":64,"19":77,"20":78,"21":67,"22":68,"23":57,"24":57,"25":58,"26":94,"27":83,"28":84,"29":75,"30":99,"31":101,"32":93,"33":70,"34":69,"35":59,"36":60,"37":96,"38":97,"39":85,"40":76,"41":77,"42":78,"43":69,"44":57,"45":57,"46":58,"47":59,"48":74,"49":76,"50":75,"51":75,"52":76,"53":77,"54":78,"55":69,"56":56,"57":57,"58":58,"59":59,"60":60,"61":61,"62":62,"63":63,"64":64,"65":65,"66":66,"67":67,"68":68,"69":69,"70":70,"71":71,"72":72,"73":73,"74":74,"75":75,"76":76,"77":77,"78":78,"79":79,"80":80,"81":81,"82":82,"83":83,"84":84,"85":85,"86":86,"87":87,"88":88,"89":89,"90":90,"91":91,"92":92,"93":93,"94":94,"95":95,"96":96,"97":97,"98":98,"99":99,"100":100,"101":101,"102":102,"103":56,"104":92,"105":57,"106":93,"107":82,"108":73,"109":60,"110":83,"111":64,"112":98,"113":86,"114":86,"115":86,"116":86,"117":86,"118":86,"119":86,"120":86,"121":86,"122":86,"123":86,"124":86,"125":86,"126":86,"127":86,"128":86,"129":86,"130":86,"131":86,"132":86,"133":86,"134":86,"135":86,"136":86},"sheets":[{"file":"motion-0.webp","start":4,"count":64,"columns":8,"rows":8,"width":2560,"height":2560,"bytes":902926,"sha256":"cc21f5849841f2986065b85ba8011114ae64ca42e9cc9c65476cdbd1e2ed3ffd"},{"file":"motion-1.webp","start":68,"count":64,"columns":8,"rows":8,"width":2560,"height":2560,"bytes":877358,"sha256":"3936f871f8d77856c5919677293acf1e215e69710d258cdd61f46513529ba63c"},{"file":"motion-2.webp","start":132,"count":5,"columns":8,"rows":1,"width":2560,"height":320,"bytes":70996,"sha256":"37f789d200bdd58eae8250da33ea19e75029ab3285e224b4660c71a26e7a8516"}],"idle":"idle.png","idleSha256":"ecb300d36765d5c3108456551b6842c2d2a30f7c68f2c710f9e6fb2ddee449c6","blendMs":120,"returnToIdleMs":140};
const base='../../../assets/golden-wag/';
const button=document.getElementById('goldenTrigger'),mascot=document.getElementById('goldenMascot');
const canvas=document.getElementById('goldenCanvas'),idle=document.getElementById('goldenIdle');
const status=document.getElementById('goldenStatus'),ctx=canvas.getContext('2d');
// What the dog says about itself comes from the page, which words it in the page's language.
const lines=status.dataset;
const snapshot=document.createElement('canvas');snapshot.width=snapshot.height=goldenConfig.frameSize;
const snapshotCtx=snapshot.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const images=[];
let ready=false,wanted=true;
let mode='idle',frame=goldenConfig.first,raf=0,lastTime=0,fadeElapsed=0,fadeDuration=0;
function say(text){if(status.textContent!==text)status.textContent=text;}
function stamp(){canvas.dataset.mode=mode;canvas.dataset.frame=mode==='idle'?'original':String(Math.floor(frame));canvas.dataset.active=String(wanted);}
function drawFrame(index){
 const sheetIndex=goldenConfig.sheets.findIndex(s=>index>=s.start&&index<s.start+s.count);
 if(sheetIndex<0)return;
 const sheet=goldenConfig.sheets[sheetIndex],cell=index-sheet.start,size=goldenConfig.frameSize;
 ctx.drawImage(images[sheetIndex],cell%sheet.columns*size,Math.floor(cell/sheet.columns)*size,size,size,0,0,size,size);
}
function render(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 const mix=fadeDuration?Math.min(1,fadeElapsed/fadeDuration):1;
 if(mix<1){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-mix;ctx.drawImage(snapshot,0,0);}
 ctx.globalAlpha=mix;
 if(mode==='idle-fade')ctx.drawImage(idle,0,0,320,320);else drawFrame(Math.floor(frame));
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';stamp();
}
function capture(){
 snapshotCtx.clearRect(0,0,320,320);
 if(mascot.dataset.drawing==='true')snapshotCtx.drawImage(canvas,0,0);
 else snapshotCtx.drawImage(idle,0,0,320,320);
}
function schedule(){if(!raf){lastTime=performance.now();raf=requestAnimationFrame(tick);}}
function transition(next,nextFrame,ms=0){
 capture();mode=next;frame=nextFrame;fadeElapsed=0;fadeDuration=ms;
 mascot.dataset.drawing='true';render();schedule();
}
function stopIdle(){
 cancelAnimationFrame(raf);raf=0;lastTime=0;mode='idle';frame=goldenConfig.first;
 fadeDuration=fadeElapsed=0;mascot.dataset.drawing='false';stamp();say(lines.resting);
}
function beginIdleFade(){
 frame=goldenConfig.last;render();capture();mode='idle-fade';fadeElapsed=0;fadeDuration=goldenConfig.returnToIdleMs;
}
function tick(time){
 raf=0;const dt=Math.min(.05,Math.max(0,(time-lastTime)/1000));lastTime=time;
 fadeElapsed+=dt*1000;
 if(mode==='entry'){
  frame+=dt*goldenConfig.fps;
  if(frame>=goldenConfig.loopStart){mode='loop';frame=goldenConfig.loopStart+(frame-goldenConfig.loopStart)%(goldenConfig.loopEndExclusive-goldenConfig.loopStart);}
 }else if(mode==='loop'){
  frame=goldenConfig.loopStart+(frame-goldenConfig.loopStart+dt*goldenConfig.fps)%(goldenConfig.loopEndExclusive-goldenConfig.loopStart);
 }else if(mode==='return'){
  frame+=dt*goldenConfig.fps;if(frame>=goldenConfig.last)beginIdleFade();
 }else if(mode==='reverse'){
  frame-=dt*goldenConfig.fps;
  if(frame<=goldenConfig.first){frame=goldenConfig.first;render();capture();mode='idle-fade';fadeElapsed=0;fadeDuration=goldenConfig.returnToIdleMs;}
 }else if(mode==='idle-fade'&&fadeElapsed>=fadeDuration){stopIdle();return;}
 render();
 if(mode!=='idle'&&mode!=='reduced')raf=requestAnimationFrame(tick);
}
function respond(next,force=false){
 if(next===wanted&&!force)return;wanted=next;button.setAttribute('aria-pressed',String(next));
 if(!ready)return;
 if(reduced.matches){
  cancelAnimationFrame(raf);raf=0;
  if(next){mode='reduced';frame=72;fadeDuration=0;mascot.dataset.drawing='true';render();say(lines.greeting);}
  else stopIdle();return;
 }
 if(next){
  say(lines.wagging);
  if(mode==='return'&&frame<124)transition('loop',goldenConfig.resumeEntry[Math.floor(frame)],goldenConfig.blendMs);
  else if(mode==='reverse')transition('entry',Math.max(goldenConfig.first,frame));
  else transition('entry',goldenConfig.first,goldenConfig.blendMs);
 }else{
  say(lines.paused);
  if(mode==='idle'){stopIdle();return;}
  if(mode==='entry'&&frame<=18)transition('reverse',frame);
  else transition('return',goldenConfig.returnEntry[Math.floor(frame)]??108,goldenConfig.blendMs);
 }
}
button.addEventListener('click',()=>respond(!wanted));
document.addEventListener('visibilitychange',()=>{
 if(!ready)return;
 if(document.hidden)stopIdle();else respond(wanted,true);
});
reduced.addEventListener('change',()=>{if(ready){stopIdle();if(!document.hidden)respond(wanted,true);}});
// The motion sheets wait for the page's load event, so the portrait and the sitting dog are fetched before them.
function loadMotion(){
 Promise.all([idle.decode(),...goldenConfig.sheets.map(async(sheet,index)=>{const image=new Image();images[index]=image;image.src=base+sheet.file;await image.decode();})])
  .then(()=>{ready=true;stopIdle();if(!document.hidden)respond(wanted,true);})
  .catch(()=>{canvas.dataset.mode='unavailable';say(lines.unavailable);});
}
if(document.readyState==='complete')loadMotion();else window.addEventListener('load',loadMotion,{once:true});
