// Shared mock posts for the homepage list and the Blog list. Only the first entry is a real post.
window.BlogMock = (() => {
  const POST = '../blog/prototype-post.html';
  const posts = [
    { date: '2026-11-05', title: 'Super-agent 架构图解', summary: 'DeepSeek 提出的 Super-agent 架构怎么运转？跟一条事件走完全程，再对照公开原型，看哪些已经实现。' },
    { date: '2026-10-21', title: '一个特别长的标题，用来检验它在窄栏里换到第二行之后，还能不能保持清晰，超出的部分会被截断', summary: '这是一段同样偏长的摘要，用来检验两行截断：摘要最多显示两行，超出部分用省略号收尾，每一条的高度因此保持可控，不会把下一条推出第一屏之外。' },
    { date: '2026-09-30', title: '把一个想法，做成可以使用的作品', summary: '这里展示文章摘要，用一两句话说清这篇文章讲什么、读完能得到什么。' },
    { date: '2026-09-12', title: '关于工具、好奇心和日常的小发现', summary: '保留清晰的标题层级与舒适的阅读节奏，让文字成为这一页的主角。' },
    { date: '2026-08-03', title: '第五篇示例文章', summary: '用来检验已发布文章多于首页显示上限时的表现。' },
  ];
  const goto = `href="${POST}" data-goto="blog/post" data-goto-href="${POST}"`;
  const homeEntry = p => `<li><a class="ap-home-post" ${goto}><time>${p.date}</time><h2>${p.title}</h2><p>${p.summary}</p></a></li>`;
  const listEntry = p => `<article class="ap-post"><a class="ap-post-link" ${goto}><small><time>${p.date}</time></small><div><h2>${p.title}</h2><p>${p.summary}</p></div></a></article>`;
  return {
    posts,
    // The homepage list: up to `shown` of the newest `published` posts, then the link to all posts.
    // `allLong` fills every entry with the longest title and summary, the tallest the list can get.
    home(mount, published, shown, allAttrs, allLong = false) {
      const shownPosts = posts.slice(0, Math.min(published, shown)).map(p => allLong ? {...p, title: posts[1].title, summary: posts[1].summary} : p);
      mount.innerHTML = `<div class="ap-home-blog-inner"><ol class="ap-home-posts">${shownPosts.map(homeEntry).join('')}</ol><a class="ap-link ap-home-blog-all" ${allAttrs}>全部文章</a></div>`;
    },
    list(mount, published) {
      mount.innerHTML = posts.slice(0, published).map(listEntry).join('');
    },
  };
})();
