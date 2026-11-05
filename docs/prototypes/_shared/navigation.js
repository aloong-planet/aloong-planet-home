document.querySelectorAll("[data-shared-block=nav]").forEach(el=>{
  const home="../homepage/prototype-home.html", list="../blog/prototype-blog.html";
  el.innerHTML=`<header class="ap-header"><a class="ap-brand" data-nav="home" href="${home}" data-goto="homepage/home" data-goto-href="${home}">aloong planet <small>Build &amp; Share</small></a><nav class="ap-nav" aria-label="主导航"><a href="${home}#apps">Apps</a><a data-nav="list" href="${list}" data-goto="blog/blog" data-goto-href="${list}">Blog</a><a href="${home}#about">About</a></nav><a class="ap-social" href="https://github.com/aloong-planet" target="_blank" rel="noreferrer">GitHub</a></header>`;
  const path=location.pathname;
  // An entry whose destination is the page it sits on must not navigate: it would reload and lose the demo state.
  const unlink=a=>{a.removeAttribute("href");a.removeAttribute("data-goto");a.removeAttribute("data-goto-href");};
  const blog=el.querySelector('[data-nav="list"]');
  if(path.endsWith("prototype-home.html"))unlink(el.querySelector('[data-nav="home"]'));
  if(path.endsWith("prototype-blog.html")){blog.setAttribute("aria-current","page");unlink(blog);}
  if(path.endsWith("prototype-post.html"))blog.setAttribute("aria-current","true");
});
