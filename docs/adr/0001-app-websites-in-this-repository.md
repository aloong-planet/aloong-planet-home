# ADR-0001: The app websites live in this repository as workspace packages, each keeping its own domain

- Status: Accepted (2026-11-24)

## Context

JustSnap, Agentshed and Transfer each keep their website in their own app repository, and the three sites repeat the
same header, breadcrumb, i18n, tests and build setup, so a change shared by the sites is made three times. Every
site's subdomain and every published link must keep working, the owner's Cloudflare and GitHub accounts are on Free
plans, and a site takes some assets from its app (screenshots rendered from the app's own views, the app icon) while
reading versions and download links at run time from the app's download domain.

## Options

1. **One pnpm workspace in this repository: the homepage and each app site are packages under `apps/`, shared parts
   are packages under `packages/`, and each site keeps its existing Cloudflare Pages project and subdomain, deployed
   by this repository's CI** — chosen.
2. Each site stays in its app repository — rejected by the owner: the duplication grows with every app.
3. The app sites served as paths under aloongplanet.com — rejected by the owner: the subdomains stay unchanged.
4. One Pages project serving every domain, routed by host — rejected: static assets and `_redirects` match on the
   path only, so routing by host needs a Worker on every request, and the Free plan caps Worker requests per day.
5. New Workers projects with static assets in place of the existing Pages projects — rejected for the move: moving a
   custom domain to another project means removing its DNS record first, and the site is down until it is re-added.
6. App assets brought in by Git submodule or subtree — rejected: they bring source code, while screenshots exist only
   after the app has run.
7. The homepage rewritten in Astro to share components with the app sites — rejected by the owner: the duplication
   is among the three app sites, and the homepage shares only colours and fonts while carrying server-side parts.
8. Each site's palette checked against its app's theme file — rejected by the owner: a site owns its colours.
9. This repository kept private — rejected: on the Free plan a private repository cannot enforce required checks,
   and the app sites' sources are public today.

## Decision

We choose option 1. Each site is its own package under `apps/`, built on its own and deployed with Wrangler from this
repository's CI to its existing Cloudflare Pages project at its unchanged subdomain; the app repositories no longer
build or deploy a site. An app's repository produces the assets its site takes from the app and delivers them as a
pull request into this repository, and the page reads versions and download links at run time from the app's
download domain. Each site owns its colours. This repository is public, so its required checks are enforced.

## Consequences

- Positive: a change shared by the sites is made once, and one set of checks covers every site.
- Positive: domains, DNS and published links stay as they are.
- Negative: an app and its site now live in two repositories; a site's screenshots and icon are only as current as
  the last pull request its app's repository opened.
- Negative: when an app changes its colours, its site does not follow, and no check reports it.
- Negative: with Cloudflare's Git-based builds off, a site's deploy depends on this repository's CI and its
  Cloudflare API token.
- Neutral: Transfer's mainland mirror is not covered by this decision.
- Neutral: Cloudflare now starts new projects on Workers; moving a site from Pages to Workers is a separate change.

## Sources

- Cloudflare Pages limits, including Git-connected projects per repository:
  https://developers.cloudflare.com/pages/platform/limits/
- Path-only matching of Pages redirects: https://developers.cloudflare.com/pages/configuration/redirects/
- Workers request limits on the Free plan: https://developers.cloudflare.com/workers/platform/limits/
- Disabling automatic deployments on a Git-connected Pages project:
  https://developers.cloudflare.com/pages/configuration/git-integration/
- Custom domains and their DNS records: https://developers.cloudflare.com/pages/configuration/custom-domains/
