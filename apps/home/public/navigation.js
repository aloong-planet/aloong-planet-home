// Shared navigation for the homepage, the Blog, every post and the not-found page, in the language of the page it is on; all destinations work without prototype tooling.
import {LANGUAGES, languageOf, ui} from './ui.js';

/** @typedef {import('./ui.js').Language} Language */
/** @typedef {{name: string, href: string, text: string}} Work */
/** The kind of page the navigation sits on, which decides what it marks and where its language switch leads. @typedef {'home' | 'blog' | 'post' | 'not-found'} PageKind */

/** @type {Record<string, string>} */
const ENTITIES = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'};
/** Text for markup; the homepage build escapes the works' text with this too. @param {string} text */
export const escapeHtml = text => text.replace(/[&<>"]/g, c => ENTITIES[c]);

// App websites open in the current tab (nav-menus::US-001/AC-03), GitHub repositories in a new one (nav-menus::US-001/AC-04).
/** @param {Work} work @param {boolean} newTab */
const menuItem = (work, newTab) => `<a class="ap-menu-item" href="${escapeHtml(work.href)}"${newTab ? ' target="_blank" rel="noreferrer"' : ''}><strong>${escapeHtml(work.name)}</strong><span>${escapeHtml(work.text)}</span></a>`;
/** @param {Language} lang @param {string} section @param {string} label @param {string} items */
const menu = (lang, section, label, items) => `<div class="ap-menu" data-menu="${section}"><a href="${LANGUAGES[lang].home}#${section}">${escapeHtml(label)}</a><div class="ap-menu-panel"><div class="ap-menu-card">${items}</div></div></div>`;
/** @param {Language} lang */
const appsMenu = lang => menu(lang, 'apps', ui[lang].nav.apps, ui[lang].works.apps.map(work => menuItem(work, false)).join(''));
/** @param {Language} lang */
const agentsMenu = lang => menu(lang, 'agents', ui[lang].nav.agents, ui[lang].works.agents.map(({group, works}) => `<p class="ap-menu-group">${escapeHtml(group)}</p>${works.map(work => menuItem(work, true)).join('')}`).join(''));

/**
 * The language switch (site-languages::REQ-003): the page's own language as marked text, the other as a link to the same page in
 * that language. A post page has a Chinese version only, so its link to English leads to the English Blog page; a not-found
 * page leads to the other language's homepage.
 * @param {Language} lang @param {PageKind} page
 */
function languageSwitch(lang, page) {
  const other = lang === 'zh' ? 'en' : 'zh';
  const destination = page === 'blog' || page === 'post' ? LANGUAGES[other].blog : LANGUAGES[other].home;
  const names = ui[lang].language;
  /** @param {Language} target */
  const item = target => target === lang
    ? `<span lang="${LANGUAGES[target].tag}" aria-current="true">${escapeHtml(names[target])}</span>`
    // The English link is named in full for assistive technology, whatever the page's own language.
    : `<a lang="${LANGUAGES[target].tag}" hreflang="${LANGUAGES[target].tag}" rel="alternate" href="${destination}"${target === 'en' ? ` aria-label="${escapeHtml(names.enName)}"` : ''}>${escapeHtml(names[target])}</a>`;
  return `<div class="ap-lang" role="group" aria-label="${escapeHtml(names.label)}">${item('zh')}${item('en')}</div>`;
}

/**
 * The site header with its navigation, as markup, in a language and for a kind of page. Every address in it stays in that
 * language (site-languages::REQ-005). The Blog tab is the current page on the Blog page and the current section on a post page.
 * @param {{lang: Language, page: PageKind}} where
 */
export function navigationMarkup({lang, page}) {
  const {nav, brand} = ui[lang];
  const {home, blog} = LANGUAGES[lang];
  const blogMark = page === 'blog' ? ' aria-current="page"' : page === 'post' ? ' aria-current="true"' : '';
  return `<header class="ap-header">
    <a class="ap-brand" href="${home}">${escapeHtml(brand.name)} <small>${escapeHtml(brand.tag)}</small></a>
    <nav class="ap-nav" aria-label="${escapeHtml(nav.label)}">${appsMenu(lang)}${agentsMenu(lang)}<a href="${blog}"${blogMark}>${escapeHtml(nav.blog)}</a><a href="${home}#about">${escapeHtml(nav.about)}</a></nav>
    <div class="ap-header-end"><a class="ap-social" href="https://github.com/aloong-planet" target="_blank" rel="noreferrer">${escapeHtml(nav.github)}</a>${languageSwitch(lang, page)}</div>
  </header>`;
}

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

/** The kind of page a mount names; a mount that names none is taken for a homepage. @param {string | null} value @returns {PageKind} */
const pageKind = value => (value === 'blog' || value === 'post' || value === 'not-found' ? value : 'home');

function mountNavigation() {
  // The page's own document language decides the language, and its mount the kind of page (site-languages::REQ-002).
  const lang = languageOf(document.documentElement.lang);
  for (const mount of document.querySelectorAll('[data-site-navigation]')) {
    mount.innerHTML = navigationMarkup({lang, page: pageKind(mount.getAttribute('data-page'))});
    wireMenus(mount);
  }
}

if (typeof document !== 'undefined') mountNavigation();
