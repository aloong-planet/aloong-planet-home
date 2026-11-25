# JustSnap's website (`apps/justsnap/`)

An Astro static site in two languages: Chinese at `/`, English at `/en/`. What it must do is in
[the JustSnap site spec](../../docs/specs/justsnap-site.md); why it lives in this repository is
[ADR-0001](../../docs/adr/0001-app-websites-in-this-repository.md). It is the workspace package
`@aloong-planet/justsnap`, with its dependencies in the repository's one lockfile. Only the Apple silicon package
exists (JustSnap's ADR-0004), so the page offers one DMG, `JustSnap-<version>-mac-arm64.dmg`.

## Commands

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @aloong-planet/justsnap run dev       # http://localhost:4321/
pnpm --filter @aloong-planet/justsnap run build     # the static site, into apps/justsnap/dist/
pnpm --filter @aloong-planet/justsnap run preview   # serve apps/justsnap/dist/
pnpm --filter @aloong-planet/justsnap run check     # astro check: the TypeScript of every .astro and .ts file
pnpm --filter @aloong-planet/justsnap run test      # unit tests and the built-site checks, on a fresh build
pnpm --filter @aloong-planet/justsnap run cf:deploy # publish the site to Cloudflare Pages (CI does this; see Deploying)
```

In CI the job `JustSnap site checks` runs `check` and `test`, and the job `Site width check` opens the site's pages at
every window width (see the [README](../../README.md)). Both run when a pull request changes anything under
`apps/justsnap/` (see [deployment and CI](../../docs/ops/deployment.md)). A push to main deploys the site (see Deploying).

## Where things are

- `src/pages/index.astro`, `src/pages/en/index.astro`: the two pages, the same sections in the same order.
- `src/layouts/Base.astro`: the head, the sticky header (the breadcrumb back to the aloong planet homepage, ending on
  the brand; navigation; language toggle), the footer, and the page's one script.
- `src/components/`: one component per section (`Hero`, `Features`, `Download`, which also holds the install steps).
  The page's interface icons are `Icon.astro` of `@aloong-planet/site-kit` (`packages/site-kit/`, shared with
  Agentshed's site): inline SVG copied from Lucide. A new icon goes there, never a character or an emoji. The app
  icon in the header is the one exception: it is an image, set in `Base.astro`.
- `src/i18n/ui.ts`: every string of the page, in both languages. This dictionary is the site's own, separate from the
  app's. New copy goes here, in both languages.
- `src/styles/global.css`: the palette (light and dark, by the visitor's system appearance; the site owns its
  colours) and every rule of the page, interaction states included. Markup carries classes only.
- `src/releases.ts`: the two things the page reads in the visitor's browser, the R2 latest pointer and GitHub's
  releases for the JustSnap repository, each answer validated before anything of it is used.
- `src/download.ts`: the download state the two reads decide (from R2, from GitHub, or the list), and what each state's
  buttons say and where they lead. The page is served in the list state, which leads to GitHub's release list. There is
  no pre-release state: a pre-release is never offered.
- `src/scripts/`: the features section's pinned showcase, whose step follows the scroll (`features.ts`), the language
  switch that keeps the current step and scroll position (`language-switch.ts`), and the download script that reads,
  decides and shows the state in place (`download.ts`, applying it with `apply-download.ts`).
- `src/shots.ts`, `public/shots/`, `public/icon.svg`, `public/icon.png`: the screenshots, one set per language, and the
  app icon. They are not edited here: they change only through the pull request that `node Scripts/site-assets.mjs`
  of JustSnap's repository opens into this one (app-sites::REQ-004/AC-01). The screenshots are the hero's and the six
  features', all 1840×1035 (16:9), light appearance, over made-up content; see "Screenshots" below.
- `deployment.config.json`: what the shared publish command (`pages-deploy` of `packages/pages-deploy/`, run by the
  `cf:deploy` script; see Deploying) needs of this site: the Cloudflare account and Pages project it publishes to, the
  files the build must hold before anything is uploaded, and the project's production branch.

## Screenshots

The fourteen files in `public/shots/` (`<hero|select|extract|translate|paste|history|providers>-<zh|en>.png`) are
renders of the app's own SwiftUI views over invented content, not captures of a running app or of anyone's screen.
JustSnap's repository makes them: `node Scripts/site-assets.mjs` there runs its tool `JustSnapSiteShots`
(`Sources/JustSnapSiteShots/`), derives the two icon files from `Distribution/AppIcon.svg`, and opens a pull request
into this repository with those sixteen files and nothing else. Its runbook is `docs/ops/site-assets.md` there.

- The tool shows no window and activates nothing: each scene is laid out in a hosting view that is never put on the
  display and painted into a bitmap, in a process with no Dock presence. It captures no screen and reads no history,
  settings, Keychain or screenshots; the "screen being captured" is drawn in the tool, and the provider key is a
  placeholder string.
- Real views: the capture toolbar, the result box (streamed Markdown, translation, the paste box), the menu bar
  panel, and the management window's history and provider pages. Redrawn in the tool because they need a live display
  or are private to the app: the freeze overlay (dim, selection border and handles, with the app's own constants), the
  window frames and the menu bar around the views.
- Each language is rendered by its own process, started with that language's region and the UTC time zone, so
  dates and number formats follow the language and do not depend on the Mac it runs on. The output is byte-for-byte
  the same on every run. The selection and handle color is the system accent color, which is the one setting of the
  Mac that does reach the pictures: render with the default blue.
- All shots are drawn at 951×535 points into 1840×1035 pixels, so text has the same size in every one of them.
- The production build refuses to run while any two screenshots are the same file (`scripts/check-shots.mjs`).

## Tests

- Unit tests sit next to the modules they test (`src/**/*.test.ts`).
- `test/built-site.test.ts` checks the pages one fresh build produces: `test/build-site.ts` builds the site into a
  new directory once per test run, so the check never reads an old `dist/`. Its file header says what it cannot see
  (scrolling, layout across widths, the two appearances); the `Site width check` job covers one part of the widths: it
  fails when a page is wider than the window at any width from 320px. It does assert the numbers the spec fixes (a turn, the pin point, the 760px breakpoint) from the built
  stylesheet. `test/features-sync.test.ts` checks which measurements turn the scroll into a step;
  `test/check-shots.test.ts` checks the screenshot check the production build runs.
- `src/styles/palette.test.ts` checks that the stylesheet declares every colour token in both the light and the dark
  appearance, the contrast of text on its surface, and the accent's two values. `test/font.test.ts` checks the built
  site: its text is set in the system font stack, and no stylesheet or page loads a web font.
- `test/shots.test.ts` checks the fourteen screenshots: every one exists, each is 1840×1035 by its PNG header, and no
  two are the same file. What they show is checked by looking at them.
- `test/apply-download.test.ts` and `test/init-download.test.ts` apply the download states to that build's pages, the
  second through the page's script with a fake network. The reads' tests answer through an injected fetch too, so no
  test reaches the network; `test/fixtures/` holds the answers they use: the pointer as JustSnap's `Scripts/mirror-release.mjs` writes it,
  and a real-shaped releases answer from GitHub.
- `test/language-switch.test.ts` moves a note between the two pages through a fake session storage.
- `test/deploy-config.test.ts` checks this site's side of its publishing: `deployment.config.json` names this site's
  Pages project and files its build makes, and `cf:deploy` runs the shared command. The command's own cases (what it
  refuses to upload, what it requires of the deployment it made) are in `packages/pages-deploy/tests/`, with its process
  boundary replaced, so no test reaches Cloudflare. They cannot show that Cloudflare accepts the upload or that the
  token may make it; a Deploy run shows that.
- `test/build-site.ts` builds as production, as `astro build` does: the tests run with `NODE_ENV=test`, under which the
  build would otherwise keep the dev server's choices, such as `import.meta.env.DEV` being true. The Deploy run builds
  the site again and runs none of the checks, so `test/build-site.test.ts` builds it as the build script does, in a
  process with none of Vitest's environment, and compares every file with the build the checks read.

## Deploying

The Deploy workflow (`.github/workflows/deploy.yml`) publishes the site after CI has passed on a push to main: its job
`deploy-justsnap` runs `cf:deploy`, which builds the site, uploads `dist/` to the Cloudflare Pages project `justsnap`
(the one behind `justsnap.aloongplanet.com`) as the production deployment of that commit, and then checks the
project's deployment list for it. A push deploys every site, whichever it changed. The project's Cloudflare Git builds
are off, so nothing else publishes it. [Deployment and CI](../../docs/ops/deployment.md) has the command's details, the
token and how to recover.

The DMGs and the `latest.json` pointer the page reads are served from `dl.justsnap.aloongplanet.com` (an R2 bucket),
written by the release mirror of JustSnap's repository (`Scripts/mirror-release.mjs`), not by this site. Until a formal
release has been mirrored there is no pointer, and the page falls back to GitHub Releases.
