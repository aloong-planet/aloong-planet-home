// The works the Apps and Agents menus list; the homepage's Agents section renders the same Agents list.
window.SiteWorks={
  apps:[
    {id:"transfer",name:"Transfer",href:"https://transfer.aloongplanet.com/",text:"Mac 和 Windows 之间传文件，像聊天一样随手一发就到。同一个 Wi-Fi 下打开即连，多大的文件都能传，数据只在局域网里走。"},
    {id:"agentshed",name:"Agentshed",href:"https://agentshed.aloongplanet.com/",text:"Claude Code、Codex 等 agent 装了什么、烧了多少 token，打开 Agentshed 一眼看清，旧会话按提问一跳直达。"},
    {id:"justsnap",name:"随译",href:"https://justsnap.aloongplanet.com/",text:"全网响应最快的截图工具，按下快捷键瞬间进入选区。框住哪里，你选的视觉模型就直接读图，文字或对照译文边生成边出现。"}
  ],
  agents:[
    {group:"Skills",items:[
      {name:"skillshed",href:"https://github.com/aloong-planet/skillshed",text:"让 coding agent 像靠谱的资深工程师一样干活。先问清需求、写好 spec，再测试先行地实现，交来的 PR 已经过独立审查。"},
      {name:"media-studio",href:"https://github.com/aloong-planet/media-studio",text:"把一篇文章变成一支讲解视频，配音用的是你自己的声音，在本机生成，字幕和各平台封面也一并做好。"}
    ]},
    {group:"Plugins",items:[
      {name:"cc-session-pool",href:"https://github.com/aloong-planet/claudecode-session-dispatcher",text:"让 Claude Code 连轴转。会话自己压缩上下文、醒来接着干，不用你守着；一个调度会话还能指挥一池 worker 同时开工。"}
    ]}
  ]
};
// An app's website lands on its header, which the app-site headers prototype draws.
window.SiteWorks.appGoto=w=>`data-goto="nav-menus/app-site-headers" data-goto-href="../nav-menus/prototype-app-site-headers.html#${w.id}"`;
document.querySelectorAll("[data-shared-block=nav]").forEach(el=>{
  const home="../homepage/prototype-home.html", list="../blog/prototype-blog.html", W=window.SiteWorks;
  // App websites open in the same tab; GitHub repositories open in a new one.
  const item=(w,newTab)=>`<a class="ap-menu-item" href="${w.href}"${newTab?' target="_blank" rel="noreferrer"':" "+W.appGoto(w)}><strong>${w.name}</strong><span>${w.text}</span></a>`;
  const apps=`<div class="ap-menu" data-menu="apps"><a href="${home}#apps">Apps</a><div class="ap-menu-panel"><div class="ap-menu-card">${W.apps.map(w=>item(w,false)).join("")}</div></div></div>`;
  const agents=`<div class="ap-menu" data-menu="agents"><a href="${home}#agents">Agents</a><div class="ap-menu-panel"><div class="ap-menu-card">${W.agents.map(g=>`<p class="ap-menu-group">${g.group}</p>${g.items.map(w=>item(w,true)).join("")}`).join("")}</div></div></div>`;
  el.innerHTML=`<header class="ap-header"><a class="ap-brand" data-nav="home" href="${home}" data-goto="homepage/home" data-goto-href="${home}">aloong planet <small>Build &amp; Share</small></a><nav class="ap-nav" aria-label="主导航">${apps}${agents}<a data-nav="list" href="${list}" data-goto="blog/blog" data-goto-href="${list}">Blog</a><a href="${home}#about">About</a></nav><a class="ap-social" href="https://github.com/aloong-planet" target="_blank" rel="noreferrer">GitHub</a></header>`;
  const path=location.pathname;
  // An entry whose destination is the page it sits on must not navigate: it would reload and lose the demo state.
  const unlink=a=>{a.removeAttribute("href");a.removeAttribute("data-goto");a.removeAttribute("data-goto-href");};
  const blog=el.querySelector('[data-nav="list"]');
  if(path.endsWith("prototype-home.html"))unlink(el.querySelector('[data-nav="home"]'));
  if(path.endsWith("prototype-blog.html")){blog.setAttribute("aria-current","page");unlink(blog);}
  if(path.endsWith("prototype-post.html"))blog.setAttribute("aria-current","true");
  // Escape, or following the tab's own link, hides an open menu until the pointer and focus have both left it.
  el.querySelectorAll(".ap-menu").forEach(menu=>{
    const dismiss=()=>menu.setAttribute("data-dismissed","");
    const restore=()=>{if(!menu.matches(":hover")&&!menu.contains(document.activeElement))menu.removeAttribute("data-dismissed");};
    const tab=menu.querySelector(":scope > a");
    tab.addEventListener("click",dismiss);
    // Listened on the document: a menu opened by hover holds no focus, so its own keydown never fires. Focus on an item returns to the tab, since the hidden item can no longer hold it.
    document.addEventListener("keydown",e=>{if(e.key!=="Escape"||!(menu.matches(":hover")||menu.contains(document.activeElement)))return;if(menu.contains(document.activeElement))tab.focus();dismiss();});
    menu.addEventListener("mouseleave",()=>setTimeout(restore));
    menu.addEventListener("focusout",()=>setTimeout(restore));
  });
});
