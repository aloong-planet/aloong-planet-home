// Shared navigation for the homepage, the Blog, every post and the not-found page; all destinations work without prototype tooling.

/** @typedef {{name: string, href: string, text: string}} Work */

/**
 * The works the menus list, in order (nav-menus::REQ-002). The homepage build renders its Agents section from the
 * same list, so the section and the menus cannot drift apart.
 */
export const SITE_WORKS = {
  /** @type {Work[]} */
  apps: [
    {name:'Transfer', href:'https://transfer.aloongplanet.com/', text:'Mac 和 Windows 之间传文件，像聊天一样随手一发就到。同一个 Wi-Fi 下打开即连，多大的文件都能传，数据只在局域网里走。'},
    {name:'Agentshed', href:'https://agentshed.aloongplanet.com/', text:'Claude Code、Codex 等 agent 装了什么、烧了多少 token，打开 Agentshed 一眼看清，旧会话按提问一跳直达。'},
    {name:'随译', href:'https://justsnap.aloongplanet.com/', text:'全网响应最快的截图工具，按下快捷键瞬间进入选区。框住哪里，你选的视觉模型就直接读图，文字或对照译文边生成边出现。'},
  ],
  /** @type {{group: string, works: Work[]}[]} */
  agents: [
    {group:'Skills', works:[
      {name:'skillshed', href:'https://github.com/aloong-planet/skillshed', text:'让 coding agent 像靠谱的资深工程师一样干活。先问清需求、写好 spec，再测试先行地实现，交来的 PR 已经过独立审查。'},
      {name:'media-studio', href:'https://github.com/aloong-planet/media-studio', text:'把一篇文章变成一支讲解视频，配音用的是你自己的声音，在本机生成，字幕和各平台封面也一并做好。'},
    ]},
    {group:'Plugins', works:[
      {name:'cc-session-pool', href:'https://github.com/aloong-planet/claudecode-session-dispatcher', text:'让 Claude Code 连轴转。会话自己压缩上下文、醒来接着干，不用你守着；一个调度会话还能指挥一池 worker 同时开工。'},
    ]},
  ],
};

/** @type {Record<string, string>} */
const ENTITIES = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'};
/** Text for markup; the homepage build escapes the works' text with this too. @param {string} text */
export const escapeHtml = text => text.replace(/[&<>"]/g, c => ENTITIES[c]);

// App websites open in the current tab (nav-menus::US-001/AC-03), GitHub repositories in a new one (nav-menus::US-001/AC-04).
/** @param {Work} work @param {boolean} newTab */
const menuItem = (work, newTab) => `<a class="ap-menu-item" href="${escapeHtml(work.href)}"${newTab ? ' target="_blank" rel="noreferrer"' : ''}><strong>${escapeHtml(work.name)}</strong><span>${escapeHtml(work.text)}</span></a>`;
/** @param {string} section @param {string} label @param {string} items */
const menu = (section, label, items) => `<div class="ap-menu" data-menu="${section}"><a href="/#${section}">${label}</a><div class="ap-menu-panel"><div class="ap-menu-card">${items}</div></div></div>`;
const appsMenu = () => menu('apps', 'Apps', SITE_WORKS.apps.map(work => menuItem(work, false)).join(''));
const agentsMenu = () => menu('agents', 'Agents', SITE_WORKS.agents.map(({group, works}) => `<p class="ap-menu-group">${escapeHtml(group)}</p>${works.map(work => menuItem(work, true)).join('')}`).join(''));

/** The site header with its navigation, as markup. */
export const navigationMarkup = () => `<header class="ap-header">
    <a class="ap-brand" href="/">aloong planet <small>Build &amp; Share</small></a>
    <nav class="ap-nav" aria-label="主导航">${appsMenu()}${agentsMenu()}<a href="/blog">Blog</a><a href="/#about">About</a></nav>
    <a class="ap-social" href="https://github.com/aloong-planet" target="_blank" rel="noreferrer">GitHub</a>
  </header>`;

/**
 * The stylesheet opens a menu while the pointer rests on it or it holds keyboard focus, which this marks with
 * data-keyboard-focus. Escape, or following the tab's own link, hides it until the pointer and keyboard focus have both
 * left (nav-menus::US-001/AC-07, nav-menus::US-001/AC-08).
 * Keyboard focus is focus the browser shows as :focus-visible: a mouse click leaves focus on the link it followed, and
 * that focus alone must not hold a menu open or hidden (nav-menus::US-001/AC-02). The mark is kept while focus moves from
 * the tab to an item: during that move no element in the menu matches :focus-visible, so a stylesheet rule on it would
 * hide the panel and the item could not take focus (nav-menus::US-001/AC-06).
 * @param {ParentNode} root
 */
function wireMenus(root) {
  const menus = [...root.querySelectorAll('.ap-menu')].map(menu => ({
    menu: /** @type {HTMLElement} */ (menu),
    tab: /** @type {HTMLElement} */ (menu.querySelector(':scope > a')),
    panel: /** @type {HTMLElement} */ (menu.querySelector('.ap-menu-panel')),
  }));
  for (const {menu, tab} of menus) {
    tab.addEventListener('click', () => menu.setAttribute('data-dismissed', ''));
    menu.addEventListener('focusin', () => menu.toggleAttribute('data-keyboard-focus', !!menu.querySelector(':focus-visible')));
    // focusout fires before focus reaches its next element, which relatedTarget names.
    menu.addEventListener('focusout', event => {
      if (event.relatedTarget instanceof Node && menu.contains(event.relatedTarget)) return;
      menu.removeAttribute('data-keyboard-focus');
      if (!menu.matches(':hover')) menu.removeAttribute('data-dismissed');
    });
    menu.addEventListener('mouseleave', () => {
      if (!menu.hasAttribute('data-keyboard-focus')) menu.removeAttribute('data-dismissed');
    });
  }
  // Listened on the document: a menu the pointer opened holds no focus, so its own keydown never fires.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    // Only the menu showing is hidden: with focus in one menu and the pointer on the other, the other one shows, and
    // the focused one comes back once the pointer leaves.
    const open = menus.find(({panel}) => getComputedStyle(panel).display !== 'none');
    if (!open) return;
    // A hidden item cannot keep focus, so focus on one returns to the tab.
    if (open.menu.contains(document.activeElement) && document.activeElement !== open.tab) open.tab.focus();
    open.menu.setAttribute('data-dismissed', '');
  });
}

function mountNavigation() {
  for (const mount of document.querySelectorAll('[data-site-navigation]')) {
    mount.innerHTML = navigationMarkup();
    wireMenus(mount);
    // The not-found page belongs to no section, even when it answers an address under /blog/.
    if (mount.hasAttribute('data-no-section')) continue;
    if (location.pathname === '/blog' || location.pathname === '/blog.html') {
      mount.querySelector('a[href="/blog"]')?.setAttribute('aria-current','page');
    } else if (location.pathname.startsWith('/blog/')) {
      mount.querySelector('a[href="/blog"]')?.setAttribute('aria-current','true');
    }
  }
}

if (typeof document !== 'undefined') mountNavigation();
