# Agentshed's website (`apps/agentshed/`)

An Astro static site in two languages: English at `/`, Chinese at `/zh/`. What it must do is in
[the Agentshed site spec](../../docs/specs/agentshed-site.md); why it lives in this repository is
[ADR-0001](../../docs/adr/0001-app-websites-in-this-repository.md). It is the workspace package
`@aloong-planet/agentshed`, with its dependencies in the repository's one lockfile.

## Commands

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @aloong-planet/agentshed exec playwright install --only-shell chromium   # once per Playwright version: the browser the tests run
pnpm --filter @aloong-planet/agentshed run dev            # http://localhost:4321/
pnpm --filter @aloong-planet/agentshed run build          # the static site, into apps/agentshed/dist/
pnpm --filter @aloong-planet/agentshed run preview        # serve apps/agentshed/dist/
pnpm --filter @aloong-planet/agentshed run check          # astro check: the TypeScript of every .astro and .ts file
pnpm --filter @aloong-planet/agentshed run lint           # ESLint over the package, no warning allowed
pnpm --filter @aloong-planet/agentshed run test:lint-rule # the lint rule that keeps browser cases on visit(), tested
pnpm --filter @aloong-planet/agentshed run test           # unit tests, the built-site check and the browser cases
pnpm --filter @aloong-planet/agentshed run cf:deploy      # publish the site to Cloudflare Pages (CI does this; see Deploying)
```

Without the browser, every browser test file fails at launch, naming the missing executable. On Linux,
`--with-deps` also installs the system libraries and fonts it needs, as CI does.

In CI the job `Agentshed site checks` runs `check`, `lint`, `test:lint-rule` and `test`, and the job `Site width check`
opens the site's pages at every window width (see the [README](../../README.md)). Both run when a pull request changes
anything under `apps/agentshed/` (see [deployment and CI](../../docs/ops/deployment.md)).

## Where things are

- `src/pages/index.astro`, `src/pages/zh/index.astro`: the two pages, the same sections in the same order.
- `deployment.config.json`: what the shared publish command (`pages-deploy` of `packages/pages-deploy/`, run by the
  `cf:deploy` script; see Deploying) needs of this site: the Cloudflare account and Pages project it publishes to, the
  files the build must hold before anything is uploaded, and the project's production branch.
- `public/_redirects`: permanent Cloudflare Pages redirects from `/en` and `/en/` to `/`.
  The Astro redirect also emits a static fallback for local previews.
- `src/layouts/Base.astro`: the head, the sticky header (the trail back to the author's homepage ending in the brand,
  navigation, language toggle), the footer, and the page's one script.
- `src/components/`: one component per section (`Hero`, `Features`, `Install`, `Download`). The page's icons are
  `Icon.astro` of `@aloong-planet/site-kit` (`packages/site-kit/`, shared with JustSnap's site): inline SVG copied
  from Lucide. A new icon goes there, never a character or an emoji.
- `src/i18n/ui.ts`: every string of the page, in both languages. This dictionary is the site's own. New copy goes
  here, in both languages.
- `src/styles/global.css`: the palette (purple, light and dark, by the visitor's system appearance; the site owns its
  colours) and every rule of the page, interaction states included. Markup carries classes only.
- `src/releases.ts`: the two things the page reads in the visitor's browser to decide the download, the R2 latest
  pointer and GitHub's releases for the Agentshed repository, each answer validated before anything of it is used.
- `src/download-count.ts`: the page's one other read, the download count's statistics file on the download host,
  of which only a validated total reaches the page. The file is written by an hourly workflow of Agentshed's
  repository (its `docs/ops/download-count.md`). The download host answers CORS for the landing page's own origin
  only, so `pnpm dev`, `pnpm preview` and a Pages preview show no count, as they show no formal release from R2.
- `src/download.ts`: the download state the two reads decide (formal from R2, formal from GitHub, test, or the
  list), and what each state's buttons say and where they lead. The page is served in the list state, which
  leads to GitHub's release list.
- `src/scripts/`: the features section's pinned showcase, whose step follows the scroll (`features.ts`), the language switch that keeps
  the current step and scroll position (`language-switch.ts`), and the download script that reads, decides and
  shows the state in place (`download.ts`, applying it with `apply-download.ts`), and fills the download count's
  line without the download waiting for it.
- `src/shots.ts`, `public/shots/`, `public/icon-64.png`, `public/icon-256.png`: the screenshots, one set per language,
  and the app icon. They are not edited here: they change only through the pull request that `pnpm site:assets` of
  Agentshed's repository opens into this one (app-sites::REQ-004/AC-01). Every cut is 1840×1035. The overview,
  project, token and Chinese session cuts show the owner's own data, approved for publication (2026-10-13), and are
  retaken by hand from the app; the memory, search and English session cuts show made-up data. The cuts are taken at
  2× from a window 1280pt wide and 800pt tall; the search and memory cuts from one narrowed to 984pt, in which the pane
  reflows into the cut, and the English session cut from one 1240pt wide, in which the session pane fits the cut with
  its right edge whole. The icons are scaled from the app's `build/icon.png`.
- `public/media/agentshed-intro-poster.jpg`: the shared 1600×900 poster. Both walkthroughs use the English narration.
  The [English captions](https://youtu.be/lQ-Bg8nXJKM) and [Chinese captions](https://youtu.be/TpCgkGiVqlk)
  are part of their respective YouTube videos. `src/scripts/hero-video.ts`
  loads the privacy-enhanced YouTube iframe only after activation, while the poster and the separate
  “Watch on YouTube” link work without scripts. Narration and music are part of the uploaded video.

## Tests

- Unit tests sit next to the modules they test (`src/**/*.test.ts`).
- `test/built-site.test.ts` checks the pages one fresh build produces: `test/build-site.ts` builds the site
  into a new temporary directory once per test run, so the check never reads an old `dist/`. Its file header
  says what it cannot see (scrolling, layout, the two appearances): what has no browser case yet is measured in a
  browser by hand.
- `test/support/browser.ts` loads that build in a real browser, with no server and no network: it serves the
  build's files and the stand-in answers a case gives to the page's reads, and refuses any other request, which fails
  the case, named. `test/support/browser.test.ts` is its own check. `test/agentshed-site-layout.test.ts` measures the
  layout there (agentshed-site::QR-001/AC-01) at four widths, in both languages, both appearances and every download
  state. A case that measures the page before something arrives holds its answers back (`hold`, which serves one visit) and releases them;
  a case that asserts what the page asked for reads the visit's `requests`. `test/agentshed-site-header.test.ts`
  checks the header (agentshed-site::REQ-003, REQ-012/AC-02, AC-03); `test/agentshed-site-late-content.test.ts` the
  space held for the screenshots and the download count's line, and the view kept when a download state lands
  (agentshed-site::REQ-005/AC-03, REQ-011/AC-01, Failure A7); `test/agentshed-site-video.test.ts` the walkthrough, in
  jsdom and in the browser (agentshed-site::REQ-009/AC-02). `test/agentshed-site-features.test.ts` drives the features
  section in the browser (agentshed-site::REQ-004), in both languages: the pinned showcase at four widths, the step each
  scroll position gives, a step turning, the stacked steps below 760px and without scripts, a resize and a language
  switch. `test/agentshed-site-colours.test.ts` checks the page's colours in the browser, in both appearances: every
  colour of its text, grounds and borders a palette token's, the parts the palette names their role's, its recolouring
  when the system appearance changes, the screenshots staying light and the GitHub button beside Download
  (agentshed-site::REQ-006, agentshed-site::REQ-002/AC-06, Failure D1). Every browser case opens the build through `visit()`, and `lint` fails
  on any other import of Playwright by its package name in a JavaScript or TypeScript file of the package;
  `test/eslint-browser-rule.test.mjs` (the script `test:lint-rule`) runs each form of import the rule refuses through
  the package's own lint configuration.
  `test/agentshed-site-colours.test.ts` also checks the test state's pills and note in the warning pair
  (agentshed-site::REQ-002/AC-07), and
  `test/agentshed-site-font.test.ts` the font: the stylesheet's two families, the body's and the feature steps'
  numbers', beginning with the system stack, and in the browser, in the test state at two widths, no font face, no
  font file asked for and every text in the family its rule declares (agentshed-site::CON-005).
- `src/styles/palette.test.ts` checks that the stylesheet declares every colour token in both the light and the dark
  appearance.
- `test/apply-download.test.ts` and `test/init-download.test.ts` apply the download states to that build's
  pages, the second through the page's script with a fake network. The reads' tests answer through an injected
  fetch too, so no test reaches the network; `test/fixtures/` holds the answers they use: the pointer as the
  release script writes it, and a real releases answer from GitHub reshaped to the Agentshed repository.
- `test/deploy-config.test.ts` checks this site's side of its publishing: `deployment.config.json` names this site's
  Pages project, the files its build makes and its production branch, and `cf:deploy` runs the shared command. The command's own cases (what it
  refuses to upload, what it requires of the deployment it made) are in `packages/pages-deploy/tests/`, with its process
  boundary replaced, so no test reaches Cloudflare. They cannot show that Cloudflare accepts the upload or that the
  token may make it; a Deploy run shows that.
- `test/build-site.ts` builds as production, as `astro build` does: the tests run with `NODE_ENV=test`, under which
  the build would otherwise keep the dev server's choices, such as `import.meta.env.DEV` being true.

## Deploying

The Deploy workflow (`.github/workflows/deploy.yml`) publishes the site after CI has passed on a push to main: its job
`deploy-agentshed` runs `cf:deploy`, which builds the site, uploads `dist/` to the Cloudflare Pages project `agentshed`
(the one behind `agentshed.aloongplanet.com`) as the production deployment of that commit, and then checks the
project's deployment list for it. A push deploys every site, whichever it changed. The project's Cloudflare Git builds
are off, so nothing else publishes it. [Deployment and CI](../../docs/ops/deployment.md) has the command's details, the
token and how to recover.
