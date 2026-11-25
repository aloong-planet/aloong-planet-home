# Aloong Planet

Use pnpm for JavaScript dependencies and commands. Do not restart existing development servers unnecessarily. Production data must never be used for destructive tests. Never commit credentials, raw reference photos, local databases, or generated deployment archives.

Cross-skill project facts are declared in the repository-root `capabilities.toml`.

To publish or republish a post, follow `docs/ops/publishing-posts.md`.

A workflow job that needs more than read access to the repository declares its own `permissions` (`docs/ops/deployment.md`).

## The homepage site (`apps/home`)

Constraints on anyone changing `apps/home`, one line each; the reason lives where the line points.

- New visible copy goes into the site's dictionary, `apps/home/public/ui.js`, in both Chinese and English, never into markup, a page template or a script; a post's own body and the labels of a post page (`postUi` in that file) are Chinese only.

## Agentshed's site (`apps/agentshed`)

Constraints on anyone changing `apps/agentshed`, one line each; the reason lives where the line points.

- New visible copy goes into the site's dictionary, `apps/agentshed/src/i18n/ui.ts`, in both Chinese and English, never into markup or a script.
- Every colour token of `apps/agentshed/src/styles/global.css` is declared in both the light and the dark block, and a colour reaches a rule only through a token (`apps/agentshed/src/styles/palette.test.ts`, `apps/agentshed/test/agentshed-site-colours.test.ts`).
- A site browser case opens the build through `visit()` (`apps/agentshed/test/support/browser.ts`); `pnpm --filter @aloong-planet/agentshed run lint` fails on any other import of Playwright by its package name in a JavaScript or TypeScript file of the package (the reason is in that file's header).
- The screenshots and the icons under `apps/agentshed/public/` change only through the pull request that `pnpm site:assets` of Agentshed's repository opens (`docs/specs/app-sites.md`, app-sites::REQ-004/AC-01).

## Agent skills

### Issue tracker

Tickets use GitHub Issues. See `docs/agents/issue-tracker.md`.

### Documentation layout

This repository uses one documentation context. See `docs/agents/docs-layout.md`.
