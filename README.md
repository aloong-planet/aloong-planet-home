# Aloong Planet

A personal homepage with Apps, Agents, a Blog, an interactive golden retriever, and a site-wide anonymous visitor total. The supplied seated portrait and interactive dog sit together on the right, with the introduction beneath them and the newest posts beside them. Small screens use a centered, full-width group followed by the posts. See [publishing a post](docs/ops/publishing-posts.md).

## Develop and verify

Use pnpm 9.12.3 and Node 26.7.0 or later. This repository is a pnpm workspace: the homepage is the package `@aloong-planet/home` in `apps/home/`, and shared parts go in `packages/`. Install once at the repository root, then run the homepage's scripts from `apps/home/` (from the root, `pnpm --filter @aloong-planet/home run <script>` runs the same script).

```sh
pnpm install --frozen-lockfile
cd apps/home
pnpm db:local
pnpm build
pnpm dev
```

The local preview runs at http://127.0.0.1:8793. Do not restart an existing dev server unnecessarily. Design references remain under `docs/prototypes/`. See [resource inventory](docs/ops/resources.md) and [asset provenance](docs/assets/README.md).

```sh
pnpm check
node scripts/verify-local-api.mjs
```

Run from `apps/home/`.

The HTTP check is hardcoded to the local server and creates local disposable test visitors. It never targets production. Lint, automated browser E2E and mutation testing are explicitly disabled in capabilities.toml. Native browser checks supplement request-level tests.

## Cloudflare Pages

Project: `aloong-planet-home`. Build output: `apps/home/dist`. The build compiles Pages Functions into a plain JavaScript `_worker.js` suitable for dashboard upload and validates its syntax. Do not use Wrangler's multipart `--outfile` as a dashboard JavaScript upload. Only `/api/visitor` invokes the function; static pages, including blog posts, and assets remain static.

Production binding `VISITORS` points to `aloong-planet-visitors`; schema is in `apps/home/migrations/0001_visitors.sql`. The production database ID is in `apps/home/wrangler.jsonc`. Local runtime state is isolated under `apps/home/.wrangler`; no local database is included in the upload. Preview deployments have no production binding; bind a separate database before testing their counter. A production deployment's pages.dev aliases use production data but have separate host cookies.

Apex and www share the one-year anonymous cookie. The homepage declares the apex canonical URL. The homepage shows the shared total of anonymous browsers. While visible, it schedules each update 30 seconds after the previous attempt finishes and requests an immediate update when it becomes visible again. The homepage, Blog list and all published posts register browsers with scripting and cookies enabled. Missing pages skip registration. Clearing cookies, changing browsers or devices, or opening a fresh private session creates a new identity on the next visit. The counter stores only an anonymous identifier, ordinal and first-visit time. It measures anonymous browsers, not verified people.

No paid subscription is enabled. Free-plan exhaustion causes the counter to disappear while the static homepage stays usable. This repository preserves the deployed source. Releases use the existing Direct Upload Pages project through `pnpm --filter @aloong-planet/home run cf:deploy`. GitHub checks run on pull requests; main pushes deploy after checks when the repository Actions secret is configured. See [deployment setup and recovery](docs/ops/deployment.md).

[Visitor total specification](docs/specs/visitor-counter.md) · [Blog specification](docs/specs/blog.md)

## Repository map

| Directory | Contents |
|---|---|
| apps/home/ | The homepage, the package `@aloong-planet/home`, with its own `package.json` and Cloudflare Pages configuration |
| apps/home/public/ | Production pages and browser code |
| apps/home/content/ | Blog post list, post bodies and covers |
| apps/home/assets/ | Shipping portrait, dog animation, not-found dog and app screenshots, plus the supplied illustration, the generated dog image and the full-size JustSnap screenshot they are reduced from |
| apps/home/functions/, apps/home/migrations/ | Visitor API and D1 schema |
| apps/home/scripts/, apps/home/tests/ | Build, validation, deployment and regression tests |
| docs/ | Accepted prototypes, specs, resource inventory and operations |
| apps/home/tools/screenshots/ | Synthetic Transfer screenshot fixture |
| packages/ | Parts shared between apps; empty for now |
| .github/workflows/, .github/ci/ | Pull-request checks, the rules that choose which checks a change runs, and main deployment |

Generated output and local state are ignored. The original prototype workspace remains separate and unchanged.
