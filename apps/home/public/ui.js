// The homepage site's interface copy, in each language: every sentence, label, text alternative and address that differs
// between the Chinese and the English pages. The site's pages, its navigation, its dog's status lines and its visitor line
// all read from here, so changing a sentence is a change to this file alone. Chinese is the source language; the English copy
// is typed to the Chinese copy's shape, so a key, or an entry of a list, that one language has and the other lacks stops
// `pnpm typecheck`. The wording of what is not copy (a post's body, the app sites' own pages) lives elsewhere.
//
// Both languages are left to right and the set of languages is fixed (site-languages Out of Scope), so nothing here mirrors.
// Plurals go through the platform's rules (Intl.PluralRules), not a table kept here.

/** @typedef {'zh' | 'en'} Language */

/**
 * What a language's copy must have to match the Chinese copy's: the same keys, the same list lengths, a string where it has one,
 * and a function of the same signature where it has one. Functions are matched before objects, because in the type system a
 * function is also an object and would otherwise be taken for a nested dictionary.
 * @template T
 * @typedef {T extends (...args: infer A) => infer R ? (...args: A) => R : T extends string ? string : {[K in keyof T]: Shape<T[K]>}} Shape
 */

/** The facts about each language that are not copy: the document language it declares and where its pages are (site-languages::REQ-001). */
export const LANGUAGES = {
  zh: {tag: 'zh-CN', home: '/', blog: '/blog', notFound: '/404'},
  en: {tag: 'en', home: '/en/', blog: '/en/blog', notFound: '/en/404'},
};
/** Posts exist in Chinese only (site-languages::REQ-001): the language every link to a post declares. */
export const POST_LANGUAGE = LANGUAGES.zh.tag;
/** The site's address, for the alternates a page names (site-languages::REQ-004). */
export const ORIGIN = 'https://aloongplanet.com';

/** The language a document language tag names; a page that declares none of the two is a post page, which is Chinese. @param {string | null | undefined} tag @returns {Language} */
export const languageOf = tag => (tag === LANGUAGES.en.tag ? 'en' : 'zh');

const zh = /** @type {const} */ ({
  brand: {name: 'aloong planet', tag: 'Build & Share'},
  nav: {label: '主要', apps: 'Apps', agents: 'Agents', blog: 'Blog', about: 'About', github: 'GitHub'},
  // Each language's name for itself, so a visitor who cannot read the page's language still finds the switch (site-languages::REQ-003).
  language: {label: '语言', zh: '中文', en: 'EN', enName: 'English'},
  // The works the menus list and the homepage shows, in order (nav-menus::REQ-002); an app also carries its homepage card.
  works: {
    apps: [
      {
        id: 'transfer', name: 'Transfer', href: 'https://transfer.aloongplanet.com/',
        text: 'Mac 和 Windows 之间传文件，像聊天一样随手一发就到。同一个 Wi-Fi 下打开即连，多大的文件都能传，数据只在局域网里走。',
        card: {
          lines: ['Mac 和 Windows 之间传文件，像聊天一样随手一发就到，', '同一个 Wi-Fi 下打开即连，数据只在局域网里走。'],
          open: '查看 Transfer 官网', visit: '访问 Transfer 官网',
          alt: 'Transfer 白色主题主界面：演示设备、聊天记录与文件传输',
        },
      },
      {
        id: 'agentshed', name: 'Agentshed', href: 'https://agentshed.aloongplanet.com/zh/',
        text: 'Claude Code、Codex 等 agent 装了什么、烧了多少 token，打开 Agentshed 一眼看清，旧会话按提问一跳直达。',
        card: {
          lines: ['Claude Code、Codex 等 agent 装了什么、烧了多少 token，', '打开 Agentshed 一眼看清，旧会话按提问一跳直达。'],
          open: '查看 Agentshed 官网', visit: '访问 Agentshed 官网',
          alt: 'Agentshed 主界面：Agents 总览与近 90 天 Token 用量趋势',
        },
      },
      {
        id: 'justsnap', name: '随译', href: 'https://justsnap.aloongplanet.com/',
        text: '全网响应最快的截图工具，按下快捷键瞬间进入选区。框住哪里，你选的视觉模型就直接读图，文字或对照译文边生成边出现。',
        card: {
          lines: ['全网响应最快的截图工具，按下快捷键瞬间进入选区，', '框住的文字或对照译文边生成边出现。'],
          open: '查看随译官网', visit: '访问随译官网',
          alt: '随译截图翻译：框选一段英文，右侧结果框显示中文译文',
        },
      },
    ],
    agents: [
      {group: 'Skills', works: [
        {name: 'skillshed', href: 'https://github.com/aloong-planet/skillshed', text: '让 coding agent 像靠谱的资深工程师一样干活。先问清需求、写好 spec，再测试先行地实现，交来的 PR 已经过独立审查。'},
        {name: 'media-studio', href: 'https://github.com/aloong-planet/media-studio', text: '把一篇文章变成一支讲解视频，配音用的是你自己的声音，在本机生成，字幕和各平台封面也一并做好。'},
      ]},
      {group: 'Plugins', works: [
        {name: 'cc-session-pool', href: 'https://github.com/aloong-planet/claudecode-session-dispatcher', text: '让 Claude Code 连轴转。会话自己压缩上下文、醒来接着干，不用你守着；一个调度会话还能指挥一池 worker 同时开工。'},
      ]},
    ],
  },
  home: {
    title: 'Aloong Planet',
    description: 'Aloong 的个人星球：分享独立作品，记录技术、创造和生活。',
    heading: "Hi, I'm Aloong.",
    intro: ['把好奇心变成作品，', '记录技术、创造和生活里的小发现。'],
    portraitAlt: 'Aloong 穿蓝色 T 恤坐在木凳上的卡通形象',
    appsHeading: 'Apps.',
    agentsHeading: 'Agents.',
    footer: {heading: '保持好奇，做点有意思的东西。', text: ['这里是 Aloong 的个人星球。', '分享我做的作品，也记录一路上的想法。'], bottom: ['aloong planet', '作品 · 记录 · 日常']},
  },
  // The dog's button name (homepage-dog::REQ-002) and the lines it says about itself for assistive technology.
  dog: {
    name: '小狗摇尾巴',
    alt: '坐在 Aloong 身旁的金毛',
    status: {resting: '静静陪着你', greeting: '很高兴见到你', wagging: '见到你，就忍不住摇尾巴', paused: '好啦，乖乖坐好', unavailable: '小狗先静静陪着你，刷新后再试试'},
  },
  blog: {
    title: 'Blog · Aloong Planet',
    heading: 'Blog',
    intro: '关于技术、作品，以及创造的过程。把值得留下的想法，慢慢写下来。',
    back: '返回首页',
    latest: '最新文章',
    allPosts: '全部文章',
    /** What an entry's date line reads (blog::REQ-006). @param {string} date */
    dateLine: date => date,
  },
  notFound: {
    title: '这一页走丢了 · Aloong Planet',
    dogAlt: '歪着头找东西的金毛小狗',
    code: '404',
    heading: '这一页走丢了',
    text: ['小狗找了一圈，没找到这个地址。', '可能是链接打错了，或者页面已经搬走。'],
    home: '回首页',
    blog: '看看博客',
  },
  visitor: {
    /** @param {number} count @param {string} formatted the count, written in the browser's own number format */
    line: (count, formatted) => `本站累计访客 ${formatted} 人`,
  },
});

/** @typedef {Shape<typeof zh>} Copy */

/** @type {Copy} */
const en = {
  brand: {name: 'aloong planet', tag: 'Build & Share'},
  nav: {label: 'Main', apps: 'Apps', agents: 'Agents', blog: 'Blog', about: 'About', github: 'GitHub'},
  language: {label: 'Language', zh: '中文', en: 'EN', enName: 'English'},
  works: {
    apps: [
      {
        id: 'transfer', name: 'Transfer', href: 'https://transfer.aloongplanet.com/en',
        text: 'Send files between Mac and Windows as easily as a chat message. On the same Wi-Fi it connects as soon as it opens, takes files of any size, and your data never leaves the local network.',
        card: {
          lines: ['Send files between Mac and Windows as easily as sending a chat message;', 'on the same Wi-Fi it connects as soon as it opens, and your data stays on the local network.'],
          open: 'View the Transfer website', visit: 'Visit the Transfer website',
          alt: "Transfer's main window in the light theme: demo devices, chat history and a file transfer",
        },
      },
      {
        id: 'agentshed', name: 'Agentshed', href: 'https://agentshed.aloongplanet.com/',
        text: 'See at a glance what Claude Code, Codex and other agents have installed and how many tokens they burn, and jump straight to an old session by what you asked in it.',
        card: {
          lines: ['See what Claude Code, Codex and other agents have installed and how many tokens they burn', 'at a glance in Agentshed, and jump straight to an old session by what you asked in it.'],
          open: 'View the Agentshed website', visit: 'Visit the Agentshed website',
          alt: "Agentshed's main window: the Agents overview and the token usage trend of the last 90 days",
        },
      },
      {
        id: 'justsnap', name: 'JustSnap', href: 'https://justsnap.aloongplanet.com/en/',
        text: 'The fastest screenshot tool around: press the shortcut and start selecting at once. Whatever you frame, the vision model you chose reads the image directly, and the text or a side-by-side translation appears as it is generated.',
        card: {
          lines: ['The fastest screenshot tool around: press the shortcut and start selecting at once,', 'and the framed text or its side-by-side translation appears as it is generated.'],
          open: 'View the JustSnap website', visit: 'Visit the JustSnap website',
          alt: 'JustSnap screenshot translation: a selected passage of English, with its Chinese translation in the result box beside it',
        },
      },
    ],
    agents: [
      {group: 'Skills', works: [
        {name: 'skillshed', href: 'https://github.com/aloong-planet/skillshed', text: 'Makes your coding agent work like a dependable senior engineer: it pins down the requirements and writes the spec, then implements test-first, and the PR it hands over has already had an independent review.'},
        {name: 'media-studio', href: 'https://github.com/aloong-planet/media-studio', text: 'Turns an article into an explainer video narrated in your own voice, generated on your own machine, with subtitles and a cover for each platform made along the way.'},
      ]},
      {group: 'Plugins', works: [
        {name: 'cc-session-pool', href: 'https://github.com/aloong-planet/claudecode-session-dispatcher', text: 'Keeps Claude Code working around the clock. Sessions compact their own context and wake up to carry on, without you watching over them; one dispatcher session can also run a whole pool of workers at once.'},
      ]},
    ],
  },
  home: {
    title: 'Aloong Planet',
    description: "Aloong's personal planet: independent work, and notes on technology, making and life.",
    heading: "Hi, I'm Aloong.",
    intro: ['Turning curiosity into things I make,', 'and writing down small discoveries from tech, making and life.'],
    portraitAlt: 'Cartoon of Aloong in a blue T-shirt sitting on a wooden stool',
    appsHeading: 'Apps.',
    agentsHeading: 'Agents.',
    footer: {heading: 'Stay curious, and make something interesting.', text: ["This is Aloong's personal planet.", 'I share what I make here, and write down the thoughts I pick up along the way.'], bottom: ['aloong planet', 'Work · Notes · Daily life']},
  },
  dog: {
    name: 'Dog wagging its tail',
    alt: 'A golden retriever sitting next to Aloong',
    status: {resting: 'Sitting quietly beside you', greeting: 'Nice to see you', wagging: "Can't help wagging my tail when I see you", paused: 'All right, sitting nicely', unavailable: 'The dog is keeping you company quietly for now; refresh to try again'},
  },
  blog: {
    title: 'Blog · Aloong Planet',
    heading: 'Blog',
    intro: 'On technology, my work, and the process of making things. Writing down, slowly, the ideas worth keeping.',
    back: 'Back to home',
    latest: 'Latest posts',
    allPosts: 'All posts',
    // The posts are in Chinese, and the date line says so (blog::REQ-006).
    dateLine: date => `${date} · In Chinese`,
  },
  notFound: {
    title: 'This page got lost · Aloong Planet',
    dogAlt: 'A golden retriever tilting its head, looking for something',
    code: '404',
    heading: 'This page got lost',
    text: ["The dog looked everywhere and couldn't find this address.", 'The link may be mistyped, or the page may have moved.'],
    home: 'Back to home',
    blog: 'Read the blog',
  },
  visitor: {
    // The plural comes from the platform's rule for English, not from a table: 1 reads "visitor", every other count "visitors".
    line: (count, formatted) => `${formatted} ${new Intl.PluralRules('en').select(count) === 'one' ? 'visitor' : 'visitors'} so far`,
  },
};

/**
 * The copy of every language.
 * @type {Record<Language, Copy>}
 */
export const ui = {zh, en};

/**
 * What a post page says about itself, in Chinese only: posts have no English version (site-languages::REQ-001), so these are not
 * in `ui`, whose languages must match entry for entry.
 */
export const postUi = {
  contents: {label: '文章目录', title: '目录'},
  neighbours: {label: '上一篇和下一篇', earlier: '上一篇', later: '下一篇', noEarlier: '已是最早的一篇', noLater: '已是最新的一篇'},
  source: '解读',
  figure: {dialog: '大图', open: '查看大图'},
};
