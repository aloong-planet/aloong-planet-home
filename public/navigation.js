// Shared navigation for the homepage and blog; all destinations work without prototype tooling.
for (const mount of document.querySelectorAll('[data-site-navigation]')) {
  mount.innerHTML = `<header class="ap-header">
    <a class="ap-brand" href="/">aloong planet <small>Build &amp; Share</small></a>
    <nav class="ap-nav" aria-label="主导航"><a href="/#apps">Apps</a><a href="/blog">Blog</a><a href="/#about">About</a></nav>
    <a class="ap-social" href="https://github.com/aloong-planet" target="_blank" rel="noreferrer">GitHub</a>
  </header>`;
  if (location.pathname === '/blog' || location.pathname === '/blog.html') {
    mount.querySelector('a[href="/blog"]')?.setAttribute('aria-current','page');
  } else if (location.pathname.startsWith('/blog/')) {
    mount.querySelector('a[href="/blog"]')?.setAttribute('aria-current','true');
  }
}
