// Isolated screenshot fixture: synthetic devices/messages, no backend or disk writes.
const peer = 'demo-design-mac';
const at = new Date('2026-11-02T10:24:00+08:00').getTime();
const device = (alias, fingerprint, model, n) => ({info:{alias,fingerprint,version:'2.1',deviceModel:model,deviceType:'desktop'},address:`192.0.2.${n}`,port:53317,protocol:'https',lastSeen:at,status:'online'});
const devices = [device('设计工作站',peer,'macOS',10),device('MacBook Air','demo-air','macOS',11),device('Windows PC','demo-pc','Windows',12)];
const messages = [
 {type:'text',direction:'recv',content:'首页的设计稿整理好了，发给你看一下。'},
 {type:'file',direction:'recv',fileName:'Aloong Planet · 首页设计.pdf',fileSize:3250586,durationMs:800,filePath:'/demo/首页设计.pdf'},
 {type:'text',direction:'sent',content:'收到！我把最新的应用安装包也发给你。'},
 {type:'file',direction:'sent',fileName:'Transfer-1.2.2-arm64.dmg',fileSize:104857600,durationMs:2400},
 {type:'file',direction:'sent',fileName:'品牌素材与应用截图.zip',fileSize:26738688,durationMs:1100},
 {type:'text',direction:'recv',content:'都收到了，直接拖进来就能传，真方便。'}
].map((m,i)=>({id:`demo-${i}`,peerFp:peer,peerAlias:'设计工作站',content:null,fileName:null,fileSize:null,filePath:null,status:'done',errorReason:null,transferId:null,durationMs:null,createdAt:at+i*60000,...m}));
const noop=async()=>{};
const subscribe=()=>()=>{};
window.transfer={
 getIdentity:async()=>({alias:'Aloong 的 MacBook Pro',fingerprint:'demo-local'}),
 listDevices:async()=>devices,listMessages:async()=>messages,
 getAutoAccept:async()=>({enabled:true,maxBytes:1073741824}),
 getTheme:async()=> 'light',setTheme:async(t)=>t,
 getLanguage:async()=>({pref:'zh',effective:'zh'}),setLanguage:async()=>({pref:'zh',effective:'zh'}),
 onLanguageChanged:subscribe,onDevicesUpdated:subscribe,onMessageUpserted:subscribe,onProgress:subscribe,onWindowFocus:subscribe,
 setShotActivePeer:noop,setUnread:noop,getThumbnail:async()=>null,getImageDataUrl:async()=>null,
 showInFolder:noop,openFile:noop,pickFiles:async()=>[],sendText:noop,sendFiles:noop,respond:noop,
 getReceiveDir:async()=>({path:'/demo/Downloads',isDefault:true,notice:false}),
 getShortcut:async()=> 'F1',getOfflineKeep:async()=>60
};
