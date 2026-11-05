(function(){
  var $ = function(id){return document.getElementById(id)};
  var map = $('map');
  var SC = {
    noise:{tab:'闲聊噪音',title:'非监听群：「中午去食堂还是点外卖？」',cost:'LLM 调用 0 次',steps:[
      {n:['src-im','gate'],e:['e-src'],at:[186,136],t:'消息进入系统，程序层按来源、群组和白名单做确定性检查。'},
      {n:['drop'],e:['e-drop'],at:[288,219],t:'不在监听范围，直接丢弃。全程不调用模型，这就是 Fast Path 省下的成本。'}]},
    quiet:{tab:'无需介入的讨论',title:'用户群：「新版本界面看着挺清爽」',cost:'LLM 判断，不发言',steps:[
      {n:['src-im','gate'],e:['e-src'],at:[186,136],t:'来自监听中的用户群，程序层放行。'},
      {n:['table'],e:['e-pass'],at:[358,166],t:'查订阅表：这个话题没有 Worker 负责。'},
      {n:['router','r-sem'],e:['e-slow'],at:[576,145],atp:[572,152],t:'走 Slow Path 进 Router，LLM 按提示词判断不需要介入，保持安静。',p:'未订阅的消息先过 Gate，再以候选卡片进主 Session。默认 observe 模式只研判、不接主动工作。'}]},
    fresh:{tab:'新任务冷启动',title:'用户群缺陷反馈：「切换会话时偶发白屏」',cost:'Router 决策 + Worker 执行',steps:[
      {n:['src-im','gate'],e:['e-src'],at:[186,136],t:'程序层放行。'},
      {n:['table'],e:['e-pass'],at:[358,166],t:'查订阅表：新问题，没有订阅者。'},
      {n:['router','r-sem'],e:['e-slow'],at:[576,145],atp:[572,152],t:'Router 的语义层判断这是缺陷反馈，值得处理。'},
      {n:['r-disp','workers','w-a'],e:['e-sem','e-spawn','e-sub'],at:[746,259],atp:[606,259],t:'Router 创建 Worker，Worker 订阅这条 Thread。此后同一话题的消息不用再经 Router 分派。'},
      {n:['env'],e:['e-exec','e-wout'],at:[1015,377],t:'Worker 在隔离的上下文里工作，通过端侧 daemon 在真实环境中复现和修复。',p:'执行目录是本机 git worktree，没有 daemon。Worker 还会自己发 ack、在 GitHub 开 PR。'},
      {n:['router'],e:['e-report'],at:[844,259],atp:[948,244],t:'Worker 向 Router 汇报关键结论，推理过程和工具调用都留在 Worker 内部。'},
      {n:['ch-im'],e:['e-out'],at:[1008,112],t:'Router 统一对外回复，IM 上只给简短结论，单次不超过 100 词。',p:'结果通知由 Router 发，100 词上限由代码强制。'}]},
    follow:{tab:'后续事件直通',title:'同一个 PR 的评审评论：「改用方案 B」',cost:'Router 不用做决定',steps:[
      {n:['src-gh','gate'],e:['e-src'],at:[186,136],t:'同一个 PR 下的新评论，程序层放行。'},
      {n:['table'],e:['e-pass'],at:[358,166],t:'查订阅表：PR #12 已被 Worker A 和 B 订阅。'},
      {n:['workers','w-a','w-b'],e:['e-fast'],at:[568,262],t:'程序直通给两个 Worker，Router 不用再调用工具转发。两个 Worker 看到同样的事件，有机会自行发现和解决冲突。'},
      {n:['router'],e:['e-obs'],at:[572,198],t:'Router 仍可观测这条事件，掌握全局状态，但不用决定它去哪。',p:'不是全量观测。人类跟进发 follow_up 通知，会唤醒 Router，但只能用来叫停；名单外的 bot 和默认配置下的 CI 才真正绕过。'},
      {n:['table'],e:['e-sub'],at:[424,320],t:'如果评论超出当前任务范围，Worker 可以退订，或交回 Router 重新分派。',p:'只能退后来挂上的 Thread，起源 Thread 和绑定的 PR 退不了。'}]},
    watch:{tab:'Worker 跑偏',title:'没有外部事件，定时消息触发一次巡检',cost:'外部控制回路',steps:[
      {n:['timer','wd'],e:['e-timer'],at:[177,505],t:'定时消息驱动 Watchdog Session，它运行在主系统之外。'},
      {n:['db'],e:['e-wdr'],at:[559,536],atp:[464,460],t:'读取状态，由模型判断每个 Worker 有没有实质进展、方向是否偏离。进程活着不等于任务在推进。',p:'Hourly check 只按 status 退出码分支，没有语义判断。'},
      {n:['workers'],e:['e-wdf'],at:[464,452],atp:[496,460],t:'发现异常就介入修复；遇到外部偶发故障就持续复查。维护者还能用自然语言问它原因，让它在线改提示词和触发规则。',p:'退出码 1 时重启服务，重启失败才读日志并尽力修复。'}]}
  };
  var ORDER=['noise','quiet','fresh','follow','watch'];
  var state={sc:'all',step:0,lens:'art'};
  var tabs=$('tabs');
  function mkTab(id,label){var b=document.createElement('button');b.type='button';b.id='tab-'+id;b.textContent=label;b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){go(id,0)});tabs.appendChild(b)}
  mkTab('all','总览');ORDER.forEach(function(k){mkTab(k,SC[k].tab)});

  function clear(){map.querySelectorAll('.lit,.cur').forEach(function(x){x.classList.remove('lit','cur')});$('badges').textContent=''}
  var TONE={'e-slow':'slow','e-fast':'fast','e-wdr':'watch','e-wdf':'watch'};
  function toneOf(st){for(var i=0;i<st.e.length;i++)if(TONE[st.e[i]])return TONE[st.e[i]];return 'ink'}
  function badge(n,at,now,tone){
    var ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g');g.setAttribute('class','badge'+(now?' now':''));g.setAttribute('data-tone',tone);
    var c=document.createElementNS(ns,'circle');c.setAttribute('cx',at[0]);c.setAttribute('cy',at[1]);c.setAttribute('r',now?9:8);
    var t=document.createElementNS(ns,'text');t.setAttribute('x',at[0]);t.setAttribute('y',at[1]);t.textContent=n;
    g.appendChild(c);g.appendChild(t);$('badges').appendChild(g);
  }
  function render(){
    var steps=$('steps');steps.textContent='';clear();
    tabs.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',b.id==='tab-'+state.sc?'true':'false')});
    if(state.sc==='all'){
      map.classList.remove('play');
      $('ev-title').textContent='五种事件，五种走法';$('ev-cost').textContent='';$('next').hidden=true;
      ORDER.forEach(function(k){
        var s=SC[k],li=document.createElement('li'),b=document.createElement('button');b.type='button';b.className='overview';b.style.gridTemplateColumns='minmax(0,1fr)';
        var x=document.createElement('b');x.textContent=s.tab;var q=document.createElement('span');q.className='q';q.textContent=s.title;var c=document.createElement('span');c.className='c';c.textContent=s.cost;
        var box=document.createElement('span');box.appendChild(x);box.appendChild(q);box.appendChild(c);b.appendChild(box);
        b.addEventListener('click',function(){go(k,0)});li.appendChild(b);steps.appendChild(li);
      });
      return;
    }
    map.classList.add('play');
    var s=SC[state.sc];$('ev-title').textContent=s.title;$('ev-cost').textContent=s.cost;
    s.steps.forEach(function(st,i){
      var done=i<=state.step,now=i===state.step;
      if(done){
        st.n.forEach(function(id){$(id).classList.add('lit')});
        st.e.forEach(function(id){var e=$(id);e.classList.add('lit');if(now)e.classList.add('cur')});
        badge(i+1,(state.lens==='pro'&&st.atp)||st.at,now,toneOf(st));
      }
      var li=document.createElement('li');if(now)li.className='now';if(done)li.classList.add('done');
      var b=document.createElement('button');b.type='button';var n=document.createElement('span');n.className='num';n.textContent=i+1;
      var tx=document.createElement('span');tx.textContent=st.t;
      if(state.lens==='pro'&&st.p){var p=document.createElement('span');p.className='pn';p.textContent=st.p;tx.appendChild(p)}
      b.appendChild(n);b.appendChild(tx);b.addEventListener('click',function(){go(state.sc,i)});li.appendChild(b);steps.appendChild(li);
    });
    var nx=$('next');nx.hidden=false;var last=state.step>=s.steps.length-1;nx.disabled=last;nx.textContent=last?'已走完':'下一步';
  }
  function go(sc,i){state.sc=sc;state.step=i;render()}
  $('next').addEventListener('click',function(){var s=SC[state.sc];if(s&&state.step<s.steps.length-1)go(state.sc,state.step+1)});
  function lens(l){state.lens=l;map.setAttribute('data-lens',l);document.querySelector('.legend').setAttribute('data-lens',l);$('lens-art').setAttribute('aria-pressed',l==='art'?'true':'false');$('lens-pro').setAttribute('aria-pressed',l==='pro'?'true':'false');$('lensnote').hidden=l!=='pro';$('key-unseen').hidden=l!=='pro';render()}
  $('lens-art').addEventListener('click',function(){lens('art')});
  $('lens-pro').addEventListener('click',function(){lens('pro')});
  $('replay-watch').addEventListener('click',function(){go('watch',0)});
  render();

  /* charts: one scale per panel, emphasis on Super-agent, tooltip + table twin */
  var EXP=[
    {s:'Super-agent',f:'Super-agent',p50:12.4,p95:15.7,tok:2323,hi:true},
    {s:'去掉直通',f:'Super-agent，去掉直通',p50:12.6,p95:15.5,tok:3177},
    {s:'单 Session，中性提示',f:'单 Session + Subagent，中性提示',p50:20.4,p95:29.5,tok:605},
    {s:'单 Session，优先委派',f:'单 Session + Subagent，提示优先委派',p50:13.8,p95:29.0,tok:1082}];
  var NS='http://www.w3.org/2000/svg';
  function el(t,a,p,txt){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(txt!==undefined)e.textContent=txt;if(p)p.appendChild(e);return e}
  var tip=$('tip');
  function showTip(x,y,val,label){tip.textContent='';var b=document.createElement('b');b.textContent=val;var s=document.createElement('span');s.textContent=label;tip.appendChild(b);tip.appendChild(s);tip.hidden=false;
    var w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(8,Math.min(innerWidth-w-8,x+14))+'px';tip.style.top=Math.max(8,Math.min(innerHeight-h-8,y-h-10))+'px'}
  function hideTip(){tip.hidden=true}
  function wire(g,val,label){
    g.setAttribute('tabindex','0');g.setAttribute('aria-label',label+'：'+val);
    g.addEventListener('pointermove',function(e){showTip(e.clientX,e.clientY,val,label)});
    g.addEventListener('pointerleave',hideTip);
    g.addEventListener('focus',function(){var r=g.getBoundingClientRect();showTip(r.left+r.width/2,r.top+6,val,label)});
    g.addEventListener('blur',hideTip);
  }
  var L=164,T=8,RH=46,N=EXP.length,B=T+RH*N;
  (function(){
    var svg=$('c-time'),R=600,x=function(v){return L+v*(R-L)/30};
    [0,10,20,30].forEach(function(v){el('line',{class:'grid',x1:x(v),x2:x(v),y1:T,y2:B},svg);el('text',{class:'tick',x:x(v),y:B+20,'text-anchor':'middle'},svg,v)});
    EXP.forEach(function(d,i){
      var y=T+RH*i+RH/2,g=el('g',{class:'row'},svg);
      el('rect',{class:'hit',x:0,y:T+RH*i,width:640,height:RH},g);
      var col=d.hi?'var(--ink)':'var(--mark)';
      el('text',{class:'rowl'+(d.hi?' hi':''),x:10,y:y+4},g,d.s);
      el('line',{x1:x(d.p50),x2:x(d.p95),y1:y,y2:y,stroke:col,'stroke-width':2,'stroke-linecap':'round'},g);
      el('circle',{cx:x(d.p50),cy:y,r:5,fill:'var(--panel)',stroke:col,'stroke-width':2},g);
      el('circle',{cx:x(d.p95),cy:y,r:6,fill:col,stroke:'var(--panel)','stroke-width':2},g);
      el('text',{class:'val',x:x(d.p95)+11,y:y+4},g,d.p95.toFixed(1));
      if(d.hi)el('text',{class:'val','text-anchor':'end',x:x(d.p50)-10,y:y+4},g,d.p50.toFixed(1));
      wire(g,'P50 '+d.p50.toFixed(1)+' · P95 '+d.p95.toFixed(1)+' 分钟',d.f);
    });
  })();
  (function(){
    var svg=$('c-tok'),R=430,x=function(v){return L+v*(R-L)/3500},H=18;
    [0,1000,2000,3000].forEach(function(v){el('line',{class:'grid',x1:x(v),x2:x(v),y1:T,y2:B},svg);el('text',{class:'tick',x:x(v),y:B+20,'text-anchor':'middle'},svg,v)});
    EXP.forEach(function(d,i){
      var y=T+RH*i+RH/2,g=el('g',{class:'row'},svg),col=d.hi?'var(--ink)':'var(--mark)',x1=x(d.tok);
      el('rect',{class:'hit',x:0,y:T+RH*i,width:480,height:RH},g);
      el('text',{class:'rowl'+(d.hi?' hi':''),x:10,y:y+4},g,d.s);
      el('path',{d:'M'+L+' '+(y-H/2)+'H'+(x1-4)+'a4 4 0 0 1 4 4V'+(y+H/2-4)+'a4 4 0 0 1 -4 4H'+L+'z',fill:col},g);
      el('text',{class:'val',x:x1+8,y:y+4},g,d.tok);
      wire(g,d.tok+' 万',d.f);
    });
  })();
})();
