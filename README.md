# Aloong Planet

A personal homepage with Apps, a Blog layout, an interactive golden retriever, and an anonymous visitor ordinal. The Blog currently contains clearly labeled layout examples, not real articles. Portrait refinement remains paused.

## Develop and verify

Use pnpm and Node 26+.

```sh
pnpm install --frozen-lockfile
pnpm db:local
pnpm build
pnpm dev
```

The local preview runs at http://127.0.0.1:8793. Do not restart an existing dev server unnecessarily. The earlier design-only preview remains under `docs/prototypes/homepage/`. See [resource inventory](docs/ops/resources.md) and [asset provenance](docs/assets/README.md).

```sh
node scripts/verify.mjs docs/.workings/visitor-counter/final-verification.log
node scripts/verify-local-api.mjs
```

The HTTP check is hardcoded to the local server and creates local disposable test visitors. It never targets production. Lint, automated browser E2E and mutation testing are explicitly disabled in capabilities.toml. Native browser checks supplement request-level tests.

## Cloudflare Pages

Project: `aloong-planet-home`. Build output: `dist`. The build compiles Pages Functions into a plain JavaScript `_worker.js` suitable for dashboard upload and validates its syntax. Do not use Wrangler's multipart `--outfile` as a dashboard JavaScript upload. Only `/api/visitor` invokes the function; static pages and assets remain static.

Production binding `VISITORS` points to `aloong-planet-visitors`; schema is in `migrations/0001_visitors.sql`. The production database ID is in wrangler.jsonc. Local runtime state is isolated under .wrangler; no local database is included in the upload. Preview deployments have no production binding; bind a separate database before testing their counter. A production deployment's pages.dev aliases use production data but have separate host cookies.

Apex and www share the one-year anonymous cookie. The homepage declares the apex canonical URL. The number is the browser's original ordinal, not the current total or a verified person count. Clearing cookies, changing browsers/devices or opening a fresh private session creates a new identity. No IP address, fingerprint or user agent is persisted by this feature.

No paid subscription is enabled. Free-plan exhaustion causes the counter to disappear while the static homepage stays usable. This repository preserves the deployed source. Releases currently use the existing Direct Upload Pages project; deployment automation is being added in a separate review branch.

[Visitor behavior](docs/features/visitor-counter.md) · [Specification](docs/specs/visitor-counter.md)
