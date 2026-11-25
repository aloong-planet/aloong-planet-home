# Resource inventory

## Live infrastructure

| Resource | Identifier / destination | Purpose |
|---|---|---|
| GitHub repository | aloong-planet/aloong-planet-home | Public source and automation repository |
| Cloudflare account | 7f1ceca4bab4b98d5d778e1231d7abaa | Existing account; Free Workers/Pages and D1 |
| Pages project | aloong-planet-home | Existing Direct Upload project, production branch main |
| Pages project | agentshed | Existing project behind https://agentshed.aloongplanet.com; its Git builds are off and this repository uploads it, production branch main |
| Canonical hostname | https://aloongplanet.com | Public personal homepage |
| Alternate hostname | https://www.aloongplanet.com | Same homepage and shared visitor cookie |
| Pages hostname | https://aloong-planet-home.pages.dev | Production alias; own host cookie, production database |
| D1 database | aloong-planet-visitors | Anonymous visitor records and cumulative total |
| D1 database ID | f588c63e-74d6-4ede-abb3-efd5548d44a3 | Bound as VISITORS in production |
| Visitor endpoint | /api/visitor | Cookie bootstrap, idempotent registration and read-only totals |

These IDs are resource identifiers, not credentials. The project and binding settings are in apps/home/wrangler.jsonc; the account and public verification hosts are in apps/home/deployment.config.json. No paid subscription is required or enabled. Production visitor data is not part of this repository.

The initial production table was created through the dashboard using apps/home/migrations/0001_visitors.sql. Its CREATE TABLE IF NOT EXISTS statement is safe to apply through migration tracking without resetting existing rows. Future schema changes must be additive/backward-compatible during deployment.

## Source layout

The repository is a pnpm workspace (`pnpm-workspace.yaml`): `apps/home/` is the homepage, the package `@aloong-planet/home`, and `packages/` holds parts shared between apps. The directories below are under `apps/home/`, except those that start with `docs/`.

- public/: shipping styles, navigation, the shared article look, the interface dictionary ui.js and the visitor client. The homepage, Blog page and not-found page of each language are rendered from ui.js by scripts/pages.mjs, and the posts by scripts/blog.mjs.
- content/: the blog's post list, post bodies and covers, with any post's own stylesheet and script. See [publishing a post](publishing-posts.md).
- assets/: one copy of each shipping portrait, dog animation, not-found dog and app screenshot, plus the supplied portrait illustration, the generated not-found dog image and JustSnap's full-size translation screenshot, each kept as the source of its reduced copy and not deployed.
- functions/: Pages Functions request handler.
- migrations/: versioned D1 schema migrations.
- scripts/: build, verification and release automation.
- tests/: visitor contracts using SQLite and Fetch boundaries, deployment orchestration, and the blog build and its scripts run in temporary folders.
- docs/prototypes/: retained design references, including illustrative counts. Never deploy this directory.
- docs/assets/: source descriptions, the portrait prompt and the not-found dog prompt.
- tools/screenshots/: isolated synthetic Transfer fixture, retained for reproducibility; renderer bundles come from the Transfer app and are not duplicated here.
- dist/, .wrangler/, artifacts/, docs/.workings/: generated output, local runtime, archives and work records, ignored by Git. `docs/.workings/` is ignored wherever it appears, which includes `apps/home/docs/.workings/`, where `pnpm check` writes its log.

## Related projects

Transfer (https://transfer.aloongplanet.com), Agentshed (https://agentshed.aloongplanet.com) and JustSnap, named 随译 on this site (https://justsnap.aloongplanet.com), are links/cards only. The skills and plugins in the Agents menu and section are links to their GitHub repositories. Their repositories, deployments and Transfer download statistics are outside this site's deployment.

## Retained local material

The original working folder is the aloong-home directory in the 2026/11/01 visualization workspace. Raw reference photographs, interim portraits, screenshots of design iterations, local test databases and duplicate dog assets remain there. They are not needed to build or deploy this repository. The source dog archive was golden-dog-interactive.zip from the earlier 2026-10-26 interaction project.

The initial site was manually uploaded through the dashboard. The first upload attempt used Wrangler's multipart --outfile output; the corrected deployment uses the plain index.js produced by --outdir, copied to apps/home/dist/_worker.js. Syntax validation is part of the build.
