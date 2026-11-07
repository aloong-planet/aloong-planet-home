# Resource inventory

## Live infrastructure

| Resource | Identifier / destination | Purpose |
|---|---|---|
| GitHub repository | aloong-planet/aloong-planet-home | Private source and automation repository |
| Cloudflare account | 7f1ceca4bab4b98d5d778e1231d7abaa | Existing account; Free Workers/Pages and D1 |
| Pages project | aloong-planet-home | Existing Direct Upload project, production branch main |
| Canonical hostname | https://aloongplanet.com | Public personal homepage |
| Alternate hostname | https://www.aloongplanet.com | Same homepage and shared visitor cookie |
| Pages hostname | https://aloong-planet-home.pages.dev | Production alias; own host cookie, production database |
| D1 database | aloong-planet-visitors | Anonymous visitor ordinals |
| D1 database ID | f588c63e-74d6-4ede-abb3-efd5548d44a3 | Bound as VISITORS in production |
| Visitor endpoint | /api/visitor | Cookie bootstrap and idempotent registration |

These IDs are resource identifiers, not credentials. The project and binding settings are in wrangler.jsonc; the account and public verification hosts are in deployment.config.json. No paid subscription is required or enabled. Production visitor data is not part of this repository.

The initial production table was created through the dashboard using migrations/0001_visitors.sql. Its CREATE TABLE IF NOT EXISTS statement is safe to apply through migration tracking without resetting existing rows. Future schema changes must be additive/backward-compatible during deployment.

## Source layout

- public/: shipping HTML, styles, navigation, the shared article look, and visitor client.
- content/: the blog's post list, post bodies and covers, with any post's own stylesheet and script. See [publishing a post](publishing-posts.md).
- assets/: one copy of each shipping portrait, dog animation, not-found dog and app screenshot, plus the supplied portrait illustration and the generated not-found dog image, each kept as the source of its reduced copy and not deployed.
- functions/: Pages Functions request handler.
- migrations/: versioned D1 schema migrations.
- scripts/: build, verification and release automation.
- tests/: visitor contracts using SQLite and Fetch boundaries, deployment orchestration, and the blog build and its scripts run in temporary folders.
- docs/prototypes/: retained design references, including illustrative counts. Never deploy this directory.
- docs/assets/: source descriptions, the portrait prompt and the not-found dog prompt.
- tools/screenshots/: isolated synthetic Transfer fixture, retained for reproducibility; renderer bundles come from the Transfer app and are not duplicated here.
- dist/, .wrangler/, artifacts/, docs/.workings/: generated output, local runtime, archives and work records, ignored by Git.

## Related projects

Transfer (https://transfer.aloongplanet.com) and Agentshed (https://agentshed.aloongplanet.com) are links/cards only. Their repositories, Pages deployments and Transfer download statistics are outside this site's deployment.

## Retained local material

The original working folder is the aloong-home directory in the 2026/11/01 visualization workspace. Raw reference photographs, interim portraits, screenshots of design iterations, local test databases and duplicate dog assets remain there. They are not needed to build or deploy this repository. The source dog archive was golden-dog-interactive.zip from the earlier 2026-10-26 interaction project.

The initial site was manually uploaded through the dashboard. The first upload attempt used Wrangler's multipart --outfile output; the corrected deployment uses the plain index.js produced by --outdir, copied to dist/_worker.js. Syntax validation is part of the build.
