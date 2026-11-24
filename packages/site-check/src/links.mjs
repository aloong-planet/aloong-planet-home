// Links inside a site. A link to a page that is not built, or that the check never measures, is a page nobody
// measures; so every link inside the site is held to land on something that exists in the build.

// `href` is what the browser reports for `a.href`: already resolved against the page's address, so a relative link
// shows up on the local server. A link is the site's own when it points at the local server or at the site's own
// domain (the host exactly: another subdomain is another site). Mail, script and other schemes are not links.
export function classifyLink(href, { localOrigin, siteOrigin }) {
  let url
  try {
    url = new URL(href)
  } catch {
    return { kind: 'other' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { kind: 'other' }
  const own = url.origin === localOrigin || url.host === new URL(siteOrigin).host
  return own ? { kind: 'site', path: url.pathname } : { kind: 'other' }
}

// Whether the host serves something at `path` for this build: the file itself, x for x.html, x/ for x/index.html.
// `files` are the dist's files, relative and '/'-separated. A path that only some rewrite or function answers
// does not land: the site lists it as an exception.
export function linkResolves(path, files) {
  let decoded
  try {
    decoded = decodeURIComponent(path)
  } catch {
    return false
  }
  const have = new Set(files)
  const bare = decoded.slice(1)
  if (decoded.endsWith('/')) return have.has(`${bare}index.html`)
  return have.has(bare) || have.has(`${bare}.html`)
}
