// Shared mock posts. The homepage list uses `posts`, where only the first entry is a real post.
// The Blog list uses `listed`: the published posts, newest first, each with its cover. `lead` moves one post to the front, as if it were the newest.
window.BlogMock = (() => {
  const POST = '../blog/prototype-post.html';
  const posts = [
    { date: '2026-11-05', title: 'Super-agent 架构图解', summary: 'DeepSeek 提出的 Super-agent 架构怎么运转？跟一条事件走完全程，再对照公开原型，看哪些已经实现。' },
    { date: '2026-10-21', title: '一个特别长的标题，用来检验它在窄栏里换到第二行之后，还能不能保持清晰，超出的部分会被截断', summary: '这是一段同样偏长的摘要，用来检验两行截断：摘要最多显示两行，超出部分用省略号收尾，每一条的高度因此保持可控，不会把下一条推出第一屏之外。' },
    { date: '2026-09-30', title: '把一个想法，做成可以使用的作品', summary: '这里展示文章摘要，用一两句话说清这篇文章讲什么、读完能得到什么。' },
    { date: '2026-09-12', title: '关于工具、好奇心和日常的小发现', summary: '保留清晰的标题层级与舒适的阅读节奏，让文字成为这一页的主角。' },
    { date: '2026-08-03', title: '第五篇示例文章', summary: '用来检验已发布文章多于首页显示上限时的表现。' },
  ];
  const listed = [
    { slug: 'super-agent-architecture', date: '2026-11-05', title: 'Super-agent 架构图解', summary: 'DeepSeek 提出的 Super-agent 架构怎么运转？跟一条事件走完全程，再对照公开原型，看哪些已经实现。' },
    { slug: 'claude-code-idle-compaction', date: '2026-11-05', title: '省钱提醒-马上升级你的 claudecode 到最新版以使用idleCompaction功能', summary: '离开超过一小时再回来，Claude Code 要把整段上下文重写进缓存。新版的 idleCompaction 赶在缓存过期前先压缩。按 API 价折算，我的 28 次真实记录里回来这一下少花 73%，整张账单估计省 8% 到 14%。' },
    { slug: 'subagent-review-token-postmortem', date: '2026-10-30', title: '惨痛教训-复盘用子 agent 做对抗性测试后一个晚上多花掉 2.6 亿 token', summary: '把测试审查换成独立子 agent 做对抗性测试后，一个需求跑一晚上用掉 18 亿 token。拆开会话记录才发现，2.6 亿（14.4%）花在了「等」上：一个子 agent 每 4 秒查一次进度。这篇讲怎么查出来、怎么用一条规则解决。' },
    { slug: 'agent-live-model-e2e-testing', date: '2026-10-20', title: '聊一聊 Agent 开发中的真模型端到端回归测试', summary: '刚开始用 Codex 开发微信插件时，测试通过并不意味着实际交付符合预期。后来，我让真实模型参与端到端回归，把用户交互、工具决策和执行结果一起验证。这篇介绍为什么原来的测试会漏掉问题，以及怎样把反复修复的过程提前到交付之前。' },
    { slug: 'agent-opentelemetry', date: '2026-10-08', title: '聊一聊 OpenTelemetry 在 Agent 开发中的作用', summary: '我开发了一个以微信 Clawbot 为入口的 Codex 插件。权限、沙箱与职责分离让执行链路更复杂，也增加了 Agent 排障的难度。我通过 OpenTelemetry Tracing 和集中 instrumentation 串起执行过程，让 Agent 更快定位故障，更准确地分析耗时。' },
    { slug: 'agent-structured-result-testing', date: '2026-09-16', title: '聊一聊Agent开发中的语义化测试替代方案', summary: '模型换了一种说法，测试就失败，是否应该再请一个模型来评分？评分器不难接，但会增加调用、校准和维护成本。我的做法是用结构化结果和真实执行记录验证业务结论，把语义评分留给确实需要理解语言的部分。' },
    { slug: 'skill-pitfalls', date: '2026-09-08', title: '你的 skill 为什么没有按预期工作——聊一聊如何评估和优化 skills', summary: 'skill 失效不报错——agent 只是安静地执行出另一种行为,而那不是随机的。触发、记忆、执行三道关,每道关都有确定的失效机制:歧义被默认值填满、每个词都过它自己的解释器、没被要求的内容从未被生成。懂了机制,评估和优化才有抓手。' },
  ];
  const goto = `href="${POST}" data-goto="blog/post" data-goto-href="${POST}"`;
  const homeEntry = p => `<li><a class="ap-home-post" ${goto}><time>${p.date}</time><h2>${p.title}</h2><p>${p.summary}</p></a></li>`;
  // The newest post leads; covers are decorative here, since the title beside them names the post.
  const listEntry = (p, lead) => `<article${lead ? ' class="ap-post-lead"' : ''}><a class="ap-post-card" ${goto}><div class="ap-post-cover"><img src="../blog/covers/${p.slug}.webp" width="1200" height="511" alt=""${lead ? '' : ' loading="lazy"'}></div><div class="ap-post-text"><time>${p.date}</time><h2>${p.title}</h2><p>${p.summary}</p></div></a></article>`;
  return {
    posts,
    // The homepage list: up to `shown` of the newest `published` posts, then the link to all posts.
    // `allLong` fills every entry with the longest title and summary, the tallest the list can get.
    home(mount, published, shown, allAttrs, allLong = false) {
      const shownPosts = posts.slice(0, Math.min(published, shown)).map(p => allLong ? {...p, title: posts[1].title, summary: posts[1].summary} : p);
      mount.innerHTML = `<div class="ap-home-blog-inner"><ol class="ap-home-posts">${shownPosts.map(homeEntry).join('')}</ol><a class="ap-link ap-home-blog-all" ${allAttrs}>全部文章</a></div>`;
    },
    list(mount, published, lead) {
      const order = lead ? [...listed.filter(p => p.slug === lead), ...listed.filter(p => p.slug !== lead)] : listed;
      mount.innerHTML = `<div class="ap-post-list">${order.slice(0, published).map((p, i) => listEntry(p, i === 0)).join('')}</div>`;
    },
  };
})();
