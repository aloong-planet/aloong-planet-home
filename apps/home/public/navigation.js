// Shared navigation for the homepage, the Blog, every post and the not-found page; all destinations work without prototype tooling.

import {ui} from './ui.js';

/** @typedef {{name: string, href: string, text: string}} Work */

// Interim: the menus still read the Chinese works until the navigation takes the page's language.
const SITE_WORKS = ui.zh.works;

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
    <nav class="ap-nav" aria-label="主要">${appsMenu()}${agentsMenu()}<a href="/blog">Blog</a><a href="/#about">About</a></nav>
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
