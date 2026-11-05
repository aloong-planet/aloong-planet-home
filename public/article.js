// Marks the section being read in a post's contents.
// A block, so these names cannot collide with a post's own script.
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
