# Transfer's website (`apps/transfer/`)

An Astro static site in two languages: Chinese at `/`, English at `/en/`, each with a privacy page (`/privacy`,
`/en/privacy`). What it must do is in [the Transfer site spec](../../docs/specs/transfer-site.md); why it lives in this
repository is [ADR-0001](../../docs/adr/0001-app-websites-in-this-repository.md). It is the workspace package
`@aloong-planet/transfer`, with its dependencies in the repository's one lockfile.

## Commands

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @aloong-planet/transfer run dev       # http://localhost:4321/
pnpm --filter @aloong-planet/transfer run build     # the static site, into apps/transfer/dist/
pnpm --filter @aloong-planet/transfer run preview   # serve apps/transfer/dist/
pnpm --filter @aloong-planet/transfer run check     # astro sync, then the checker: the TypeScript of every .astro and .ts file
pnpm --filter @aloong-planet/transfer run test      # unit tests and the built-page checks
```

In CI the job `Transfer site checks` runs `check` and `test`, and the job `Site width check` opens the site's pages at
every window width (see the [README](../../README.md)). Both run when a pull request changes anything under
`apps/transfer/` (see [deployment and CI](../../docs/ops/deployment.md)).

`check` runs the checker's own binary, `astro-check`, and not `astro check`: when `@astrojs/check` cannot be imported,
`astro check` prints an install prompt and exits 0, a type error included, while `astro-check` is then not found and the
command fails (`src/check-script.test.ts` has the details).

## Where things are

- `src/pages/index.astro`, `src/pages/en/index.astro`: the landing page in each language, the same sections in the same
  order; `src/pages/privacy.astro`, `src/pages/en/privacy.astro`: the privacy page.
- `src/layouts/Base.astro`: the head, the header (the breadcrumb back to the aloong planet homepage, ending on the
  brand; navigation; language switch) and the footer.
- `src/components/`: one component per section of the landing page (`Hero`, `Features`, `HowItWorks`, `Download`,
  `Security`).
- `src/i18n/ui.ts`: every string of the page, in both languages. This dictionary is the site's own, separate from the
  app's. New copy goes here, in both languages.
- `src/styles/global.css`: the palette (light and dark, by the visitor's system appearance; the site owns its colours)
  and the rules shared by the components; each component also holds the styles of its own markup.
- `src/download-config.ts`, `src/releases.ts`, `src/download-section.ts`, `src/download-statistics.ts`: the download
  section. It reads, in the visitor's browser, the latest-release pointer on the download host and GitHub's releases for
  the Transfer repository, validates each answer before anything of it is used, and shows the state they decide. The page
  is served in the list state, which leads to GitHub's release list, so a release needs no change here
  (transfer-site::REQ-002).
- `src/beian.ts`: the mainland China filing number the footer shows when the build is given one (`PUBLIC_ICP_BEIAN`).
  This repository does not set it: the mainland copy is not built here.
- `src/fixtures/`: answers of the two places the download section reads, in the shape they have: the pointer as the
  release workflow of Transfer's repository writes it, and GitHub's releases list.
- `public/favicon.svg`, `public/screenshots/main.png`: the app icon and the screenshot of the landing page's hero. They are
  not edited here: they change only through the pull request that `pnpm site:assets` of Transfer's repository opens
  into this one (app-sites::REQ-004/AC-01).

## Tests

- Unit tests sit next to the modules they test (`src/**/*.test.ts`), run on the site's own Astro configuration so that
  they can render the `.astro` pages through Astro's Container API.
- `src/landing-page.test.ts` renders each page as delivered and builds the site once, into a directory under
  `node_modules/.cache/` of this package, to read the download section as the built stylesheets lay it out.
- `src/styles/palette.test.ts` checks that the stylesheet declares every colour token in both the light and the dark
  appearance.
- `src/check-script.test.ts` pins the form of the `check` script.
- The page's width at every window width from 320px is the `Site width check` job's (`packages/site-check/`, with the
  site's settings in `packages/site-check/sites/transfer.json`).

## Deploying

This repository does not deploy the site yet: Transfer's website is still published from Transfer's repository.
