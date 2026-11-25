// Writes the homepage, the Blog page and the not-found page of each language into the built site (site-languages::REQ-001),
// from the interface copy in public/ui.js. The Blog slots and the Agents slot they hold are filled by blog.mjs and homepage.mjs.
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {escapeHtml} from '../public/navigation.js';
import {LANGUAGES, ORIGIN, ui} from '../public/ui.js';

/** @typedef {import('../public/ui.js').Language} Language */

export const LANGUAGE_LIST = /** @type {Language[]} */ (Object.keys(LANGUAGES));
export const HOME_SLOT = '<!-- blog:home -->';
export const LIST_SLOT = '<!-- blog:list -->';
export const AGENTS_SLOT = '<!-- agents:groups -->';

/** Where a page of a language sits in the built site: the Chinese pages at its root, the English ones in its /en/ folder. @param {Language} lang @param {'index' | 'blog' | '404'} name */
export const pageFile = (lang, name) => (lang === 'en' ? `en/${name}.html` : `${name}.html`);

const text = escapeHtml;
/** Lines of one paragraph, broken where the copy breaks them (the copy holds no markup). @param {readonly string[]} lines */
const broken = lines => lines.map(text).join('<br>');

/** The language alternates a page names, itself included (site-languages::REQ-004). @param {'home' | 'blog' | 'notFound'} page */
const alternates = page => Object.values(LANGUAGES).map(({tag, [page]: path}) => `<link rel="alternate" hreflang="${tag}" href="${ORIGIN}${path}">`);

// The artwork of each homepage card is the same in both languages; only the words around it differ.
const CARD_ART = {
  transfer: {link: 'ap-art', src: '/assets/apps/transfer-main-light.jpg', width: 1100, height: 720},
  agentshed: {link: 'ap-art', src: '/assets/apps/agentshed-main-90days.png', width: 2200, height: 1440},
  justsnap: {link: 'ap-art ap-art-justsnap', src: '/assets/apps/justsnap-translate-zh.webp', width: 1840, height: 1035},
};

/** @param {Language} lang */
function appCards(lang) {
  return ui[lang].works.apps.map(({id, name, href, card}) => {
    const art = CARD_ART[/** @type {keyof typeof CARD_ART} */ (id)];
    const address = text(href);
    return `        <article class="ap-project">
          <a class="${art.link}" href="${address}" target="_blank" rel="noreferrer" aria-label="${text(card.open)}">
            <img src="${art.src}" width="${art.width}" height="${art.height}" alt="${text(card.alt)}" loading="lazy">
          </a>
          <div class="ap-project-info"><h3>${text(name)}</h3><p>${broken(card.lines)}</p><a class="ap-link ap-project-visit" href="${address}" target="_blank" rel="noreferrer">${text(card.visit)}</a></div>
        </article>`;
  }).join('\n');
}

/** @param {Language} lang */
export function homePage(lang) {
  const {home, dog} = ui[lang];
  const {tag, home: address} = LANGUAGES[lang];
  const status = Object.entries(dog.status).map(([state, line]) => `data-${state}="${text(line)}"`).join(' ');
  return `<!doctype html>
<html lang="${tag}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${text(home.description)}">
  <title>${text(home.title)}</title>
  <link rel="stylesheet" href="/site.css">
  <link rel="canonical" href="${ORIGIN}${address}">
  ${alternates('home').join('\n  ')}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script type="module" src="/navigation.js"></script>
  <script src="/assets/golden-interaction.js" defer></script>
  <script type="module" src="/visitor.js"></script>
</head>
<body class="ap-site">
  <div data-site-navigation data-page="home"></div>
  <main>
    <section class="ap-hero" aria-labelledby="homeTitle">
      <div class="ap-hero-profile">
        <div class="ap-scene">
          <div class="ap-floor" aria-hidden="true"></div>
          <img class="ap-person" src="/assets/aloong-cartoon.webp" width="260" height="390" fetchpriority="high" alt="${text(home.portraitAlt)}">
          <button class="golden-trigger" id="goldenTrigger" type="button" aria-label="${text(dog.name)}" aria-pressed="true">
            <span class="golden-mascot" id="goldenMascot" data-drawing="false">
              <img class="golden-idle" id="goldenIdle" src="/assets/golden-wag/idle.png" width="160" height="160" fetchpriority="low" alt="${text(dog.alt)}">
              <canvas class="golden-canvas" id="goldenCanvas" width="320" height="320" aria-hidden="true" data-mode="loading"></canvas>
            </span>
          </button>
        </div>
        <div class="ap-intro">
          <h1 id="homeTitle">${text(home.heading)}</h1>
          <p>${broken(home.intro)}</p>
          <p class="ap-visitor" data-visitor-counter aria-live="polite" aria-atomic="true"></p>
        </div>
        <span id="goldenStatus" hidden ${status}></span>
      </div>
      ${HOME_SLOT}
    </section>
    <section class="ap-work" id="apps" aria-labelledby="appsTitle">
      <h2 class="ap-section-title" id="appsTitle">${text(home.appsHeading)}</h2>
      <div class="ap-grid">
${appCards(lang)}
      </div>
    </section>
    <section class="ap-agents" id="agents" aria-labelledby="agentsTitle">
      <h2 class="ap-section-title" id="agentsTitle">${text(home.agentsHeading)}</h2>
      ${AGENTS_SLOT}
    </section>
  </main>
  <footer class="ap-footer" id="about">
    <h2>${text(home.footer.heading)}</h2>
    <p>${broken(home.footer.text)}</p>
    <div class="ap-bottom">${home.footer.bottom.map(part => `<span>${text(part)}</span>`).join('')}</div>
  </footer>
</body>
</html>
`;
}

/** @param {Language} lang */
export function blogPage(lang) {
  const {blog} = ui[lang];
  const {tag, home} = LANGUAGES[lang];
  return `<!doctype html>
<html lang="${tag}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${text(blog.title)}</title><link rel="stylesheet" href="/site.css">${alternates('blog').join('')}<link rel="icon" href="/favicon.svg" type="image/svg+xml"><script type="module" src="/navigation.js"></script><script type="module" src="/visitor.js"></script></head>
<body class="ap-site"><div data-site-navigation data-page="blog"></div><main class="ap-blog"><div class="ap-blog-head"><h1>${text(blog.heading)}</h1><p class="ap-blog-intro">${text(blog.intro)}</p></div>${LIST_SLOT}<p class="ap-blog-back"><a class="ap-link" href="${home}">${text(blog.back)}</a></p></main></body></html>
`;
}

/** @param {Language} lang */
export function notFoundPage(lang) {
  const {notFound} = ui[lang];
  const {tag, home, blog} = LANGUAGES[lang];
  return `<!doctype html>
<html lang="${tag}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${text(notFound.title)}</title><link rel="stylesheet" href="/site.css">${alternates('notFound').join('')}<link rel="icon" href="/favicon.svg" type="image/svg+xml"><script type="module" src="/navigation.js"></script></head>
<body class="ap-site"><div data-site-navigation data-page="not-found"></div><main class="ap-notfound"><img class="ap-notfound-dog" src="/assets/not-found/puzzled-dog.webp" width="160" height="160" alt="${text(notFound.dogAlt)}"><p class="ap-notfound-code">${text(notFound.code)}</p><h1>${text(notFound.heading)}</h1><p class="ap-notfound-text">${broken(notFound.text)}</p><div class="ap-notfound-actions"><a class="ap-button ap-button-primary" href="${home}">${text(notFound.home)}</a><a class="ap-button ap-button-secondary" href="${blog}">${text(notFound.blog)}</a></div></main></body></html>
`;
}

/** Writes both languages' pages into outDir, which already holds the copied public files. */
export async function buildPages({outDir}) {
  await mkdir(join(outDir, 'en'), {recursive: true});
  for (const lang of LANGUAGE_LIST) {
    await writeFile(join(outDir, pageFile(lang, 'index')), homePage(lang));
    await writeFile(join(outDir, pageFile(lang, 'blog')), blogPage(lang));
    await writeFile(join(outDir, pageFile(lang, '404')), notFoundPage(lang));
  }
}
