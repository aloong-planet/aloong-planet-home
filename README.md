# Aloong Planet

A personal homepage with Apps, Agents, a Blog, an interactive golden retriever, and a site-wide anonymous visitor total. The homepage, the Blog page and the not-found page come in Chinese and English, the English ones under `/en/`, with their interface copy in the dictionary `apps/home/public/ui.js`; posts stay Chinese. The supplied seated portrait and interactive dog sit together on the right, with the introduction beneath them and the newest posts beside them. Small screens use a centered, full-width group followed by the posts. See [publishing a post](docs/ops/publishing-posts.md).

## Develop and verify

Use pnpm 9.12.3 and Node 26.7.0 or later. This repository is a pnpm workspace: the homepage is the package `@aloong-planet/home` in `apps/home/`, Agentshed's website is `@aloong-planet/agentshed` in `apps/agentshed/` (see its [README](apps/agentshed/README.md)), JustSnap's website is `@aloong-planet/justsnap` in `apps/justsnap/` (see its [README](apps/justsnap/README.md)), and shared parts go in `packages/`. Install once at the repository root, then run the homepage's scripts from `apps/home/` (from the root, `pnpm --filter @aloong-planet/home run <script>` runs the same script).

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

The HTTP check is hardcoded to the local server and creates local disposable test visitors. It never targets production. Mutation testing is explicitly disabled in capabilities.toml, and the homepage has no linter; lint covers Agentshed's site only. The automated browser suites are the one in `packages/site-check`, described below (the width check of every site, the focus test under the pinned header, and the homepage tests listed below), and the browser cases of Agentshed's site. Native browser checks supplement request-level tests.

The width check opens every page of every site under `apps/` in a browser, at every whole window width from 320px to 1440px, and fails when a page is wider than the window, or when its style sheets hold a width condition that changes above 1440px, such as a `min-width` of 1500px (raise `WIDEST` in `packages/site-check/src/widths.mjs` when a site needs a breakpoint wider than that). It builds each site, finds the pages in the build output, and never leaves the local machine. Run it from the repository root; the browser is installed once:

```sh
pnpm --filter @aloong-planet/site-check exec playwright install --only-shell chromium
pnpm --filter @aloong-planet/site-check run check
```

A site needs `packages/site-check/sites/<its folder under apps/>.json`, which names its origin, the answers for requests to its own backend, and any link that only a rewrite answers; without it the check fails. What the check does not cover is listed at the top of `packages/site-check/src/check-sites.mjs`. In CI it is the job `Site width check`, one of the jobs `CI gate` waits on.

The same job runs the package's tests (`pnpm --filter @aloong-planet/site-check run test`), among them seven browser tests of the homepage in `packages/site-check/tests/`: `nav-menus.test.mjs` (nav-menus::US-004/AC-03, and nav-menus::US-001/AC-05: the menu's colours in each appearance and the two-line limit of a description), `site-languages.test.mjs` (the language switch inside the header at four widths, and where it leads on each kind of page), `visitor-counter.test.mjs` (the visitor line under a German number format), `homepage-dog.test.mjs` (the dog's five lines in each language), `site-appearance.test.mjs` (every page of each language in the light and the dark appearance, site-appearance::REQ-001), `not-found.test.mjs` (the not-found buttons) and `blog.test.mjs` (a cover that fails to load). The test script builds `apps/home` once before any of them (`tests/global-setup.mjs`) and runs the files one at a time. `nav-menus.test.mjs` moves keyboard focus to a page element at 1280px and at 390px, and fails when the element ends up under the pinned header. The header's height is the custom property `--ap-header-height` in `apps/home/public/site.css`, set once for the wide layout and once for windows 700px wide or narrower; the boxes that must clear the header read it, so changing the height there changes them together, and the test fails when the page's scroll padding falls more than a pixel short of the header. It also opens each menu by hovering its tab on both homepages at 1440px and fails when a description takes more than two lines.

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
| apps/home/public/ | Stylesheets, browser code and the interface dictionary `ui.js`; the pages are rendered from it by `apps/home/scripts/pages.mjs` |
| apps/home/content/ | Blog post list, post bodies and covers |
| apps/home/assets/ | Shipping portrait, dog animation, not-found dog and app screenshots, plus the supplied illustration, the generated dog image and the full-size JustSnap screenshot they are reduced from |
| apps/home/functions/, apps/home/migrations/ | Visitor API and D1 schema |
| apps/home/scripts/, apps/home/tests/ | Build, validation, deployment and regression tests |
| docs/ | Accepted prototypes, specs, resource inventory and operations |
| apps/home/tools/screenshots/ | Synthetic Transfer screenshot fixture |
| apps/agentshed/ | Agentshed's website, the package `@aloong-planet/agentshed`: an Astro site in Chinese and English with its own unit tests, built-site check and browser cases. It is built, checked and deployed from here, to its own Cloudflare Pages project (see [deployment and CI](docs/ops/deployment.md)) |
| apps/justsnap/ | JustSnap's website, the package `@aloong-planet/justsnap`: an Astro site in Chinese and English with its own unit tests and built-site checks. It is built, checked and deployed from here, to its own Cloudflare Pages project, and its screenshots and icon arrive by pull request from JustSnap's repository (see [deployment and CI](docs/ops/deployment.md)) |
| packages/site-check/ | The project's browser suite: the width check of every site and the homepage's browser tests listed in the Develop and verify section and the setup that builds the homepage once for them, with the tests of the check and each site's check settings |
| packages/site-kit/ | What Agentshed's and JustSnap's sites share and what changes nothing a visitor sees: the icon component, the palette reader their tests use, and the base TypeScript and Vitest configuration. Source only, with its own type check and tests |
| packages/ | Other parts shared between apps; none yet |
| .github/workflows/, .github/ci/ | Pull-request checks, the rules that choose which checks a change runs, and main deployment |

Generated output and local state are ignored. The original prototype workspace remains separate and unchanged.
