// Marks the section being read in a post's contents, and opens any figure in a larger view.
// Blocks, so these names cannot collide with a post's own script.
{
  /** @type {HTMLAnchorElement[]} */
  const links = [...document.querySelectorAll('.ap-toc a')].filter(link => link instanceof HTMLAnchorElement);
  // The attribute, because link.hash percent-encodes a section id that is not ASCII.
  const targets = links.map(link => document.getElementById((link.getAttribute('href') ?? '').slice(1)));
  const addressed = () => links.findIndex(link => link.hash === location.hash);
  const atPageEnd = () => scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
  // Sections near the page end cannot scroll up to the reading line, so at the end the section the reader asked for decides.
  let requested = addressed();

  function markCurrent() {
    let current = -1;
    targets.forEach((target, index) => {
      if (target && target.getBoundingClientRect().top <= innerHeight * .35) current = index;
    });
    if (atPageEnd()) current = requested >= 0 ? requested : links.length - 1;
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  links.forEach((link, index) => link.addEventListener('click', () => {
    requested = index;
    requestAnimationFrame(markCurrent);
  }));
  addEventListener('hashchange', () => {
    requested = addressed();
    markCurrent();
  });
  addEventListener('scroll', () => {
    if (!atPageEnd()) requested = -1;
    markCurrent();
  }, {passive: true});
  addEventListener('resize', markCurrent);
  markCurrent();
}

// The larger view. Every figure opens one, from a click or tap on its drawing area, or from the keyboard through its
// button, which shows only while it has keyboard focus. The view holds a copy of the drawing area as it looks at that
// moment, so a figure mid-playback shows that step; the copy's controls do nothing. A click anywhere in the view, or Esc,
// closes it: there is no close button.
{
  // Icons: the inner elements of Lucide's own SVGs (lucide-static 0.460.0), copied as published. The site has no icon
  // module, and an inline SVG follows the text color and keeps its size exactly, where a typed symbol would not.
  const ICONS = {
    'maximize-2': '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>',
  };
  /** @param {keyof typeof ICONS} name @param {number} size */
  const icon = (name, size) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  const article = document.querySelector('.ap-article');
  // The two names the larger view gives assistive technology are the page's own words, written where the page template puts them.
  /** @param {'dialog' | 'open'} name */
  const label = name => article?.getAttribute(`data-${name}-label`) ?? '';
  // A figure's drawing area: its .ground block, or its block of drawings when it has none. Its own controls sit outside
  // this area.
  /** @param {Element} figure */
  const drawingArea = figure => figure.querySelector(':scope > .ground') ?? [...figure.children].find(child => child.tagName !== 'FIGCAPTION' && child.querySelector('svg'));
  const figures = [...document.querySelectorAll('.ap-article-body figure.fig')].filter(figure => drawingArea(figure));
  // What a click inside a drawing acts on by itself, such as a link to another section.
  const ACTIVE = 'a[href], button, input, select, textarea, summary, label';

  if (article && figures.length > 0) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', label('dialog'));
    box.hidden = true;
    // The stage takes focus on opening, so the view is announced and keys scroll it.
    box.innerHTML = '<div class="lb-stage" tabindex="-1"><div class="lb-sheet"><div class="lb-figure"></div><p class="lb-caption"></p></div></div>';
    article.append(box);
    const stage = /** @type {HTMLElement} */ (box.querySelector('.lb-stage'));
    const sheet = /** @type {HTMLElement} */ (box.querySelector('.lb-sheet'));
    const holder = /** @type {HTMLElement} */ (box.querySelector('.lb-figure'));
    const caption = /** @type {HTMLElement} */ (box.querySelector('.lb-caption'));
    /** @type {HTMLElement | null} */
    let opener = null;
    /** @type {Element | null} */
    let source = null;

    /** @param {number} width */
    const place = width => {
      holder.style.width = `${width}px`;
      sheet.style.width = `${width + 32}px`;
    };
    // As large as the window allows, at most twice the area's width in the page, and never narrower than 800px or 85% of
    // its widest drawing's own width, so its text stays legible; on a narrower window the view scrolls sideways.
    // Room: the stage keeps 16px each side and 24px above and below; the sheet adds 16px padding all round and 10px
    // before the caption.
    function size() {
      if (!source) return;
      const drawn = Math.max(0, ...[...source.querySelectorAll('svg')].map(svg => svg.viewBox?.baseVal?.width ?? 0));
      const floor = Math.max(800, Math.round(drawn * .85));
      const roomW = innerWidth - 64;
      caption.style.maxWidth = '';
      let width = Math.max(floor, Math.min(roomW, source.getBoundingClientRect().width * 2));
      place(width);
      // Shrink to the window's height, measured on the copy itself: a block of drawings and text does not keep one ratio.
      for (let pass = 0; pass < 2; pass++) {
        const roomH = innerHeight - 48 - 32 - 10 - caption.offsetHeight;
        const height = holder.offsetHeight;
        if (height <= roomH) break;
        width = Math.max(floor, width * roomH / height);
        place(width);
      }
      const wide = width > roomW;
      stage.classList.toggle('lb-wide', wide);
      caption.style.maxWidth = wide ? `${roomW}px` : '';
    }

    // Focus returns to the button only when the view was opened from it, so a pointer or touch reader never sees it.
    /** @param {Element} figure @param {HTMLElement | null} button */
    function open(figure, button) {
      source = drawingArea(figure) ?? null;
      if (!source) return;
      // The post's own figure styles are scoped to its class, so the copy sits inside that class too.
      const body = figure.closest('.ap-article-body');
      holder.className = ['lb-figure', ...[...(body?.classList ?? [])].filter(name => name.startsWith('post-'))].join(' ');
      const copy = /** @type {Element} */ (source.cloneNode(true));
      copy.classList.remove('zoomable', 'scroll');
      holder.replaceChildren(copy);
      caption.textContent = figure.querySelector('figcaption')?.textContent ?? '';
      opener = button;
      box.hidden = false;
      document.documentElement.style.overflow = 'hidden';
      size();
      stage.scrollLeft = 0;
      stage.focus({preventScroll: true});
    }
    function shut() {
      box.hidden = true;
      holder.replaceChildren();
      source = null;
      document.documentElement.style.overflow = '';
      opener?.focus();
    }

    for (const figure of figures) {
      const area = drawingArea(figure);
      if (!area) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'zoom-btn';
      button.setAttribute('aria-label', label('open'));
      button.innerHTML = icon('maximize-2', 16);
      figure.append(button);
      area.classList.add('zoomable');
      // A link or control inside the drawing area keeps its own action and does not open the view.
      area.addEventListener('click', event => {
        if (event.target instanceof Element && event.target.closest(ACTIVE)) return;
        open(figure, null);
      });
      button.addEventListener('click', () => open(figure, button));
    }
    // A click or tap anywhere in the view closes it, on the sheet too: a figure can fill a phone's screen and leave no
    // gray around it to tap. Scrolling the view is not a click.
    box.addEventListener('click', event => {
      if (!(event.target instanceof Element)) return;
      // The copy's links do nothing, like the rest of its controls.
      const active = event.target.closest(ACTIVE);
      if (active && holder.contains(active)) event.preventDefault();
      shut();
    });
    addEventListener('keydown', event => {
      if (event.key === 'Escape' && !box.hidden) shut();
    });
    addEventListener('resize', () => {
      if (!box.hidden) size();
    });
  }
}
