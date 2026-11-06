# Deployment

## Local release

Use Node 26.7.0 or later and pnpm 9.12.3. Keep the lockfile committed.

```sh
pnpm install --frozen-lockfile
pnpm cf:login
pnpm cf:deploy --dry-run
pnpm cf:deploy
```

The login command opens Cloudflare OAuth, requests account/user read plus Pages/D1 write, and stores the credential in the OS keychain. Login is a one-time setup until authorization expires. Never paste credentials into source files or chat. CI uses an API token instead of interactive OAuth.

`cf:deploy` requires a clean Git checkout and uses the existing project/database in `wrangler.jsonc` and account in `deployment.config.json`. It runs type checking, all tests and the build; confirms the project and database exist; applies pending migrations; uploads `dist` to production branch `main`; and checks the deployed revision, pages, images and visitor cookie endpoint on all three hosts. An error stops subsequent steps and returns nonzero. It never creates projects or databases. The dry run checks local configuration and Git state only; it does not authenticate or execute deployment steps.

Public smoke checks do not register synthetic visitors. They check cookie bootstrap and reject a POST without a cookie. Blog pages must also serve their expected text, because the host answers an unknown address with the homepage and status 200, so a status code cannot reveal a missing page. For the same reason, every image the deployed homepage shows must come back with an image content type. Database registration/concurrency is tested against disposable local SQLite/D1; smoke checks alone do not prove production database writes. A public verification error can occur after an upload has already changed production; inspect the deployment in Cloudflare before retrying. No automatic rollback or database reset is performed.

Migrations run before upload. Keep them additive and compatible with the previously deployed site. A failed upload may leave a successfully applied schema migration in place. The initial `CREATE TABLE IF NOT EXISTS` migration preserves the table created through the dashboard. Do not drop, truncate or reseed production visitor data. `pnpm db:local` changes only the local database.

## GitHub automation

`.github/workflows/checks.yml` runs checks for pull requests and main pushes. Only main can deploy, after successful checks. Deployments are serialized and reject superseded commits. Pull requests receive no Cloudflare token and perform no remote deployment. A fresh deployment runner repeats the same local validation command before publishing.

One repository Actions secret is required:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare token scoped to account `7f1ceca4bab4b98d5d778e1231d7abaa`, with Cloudflare Pages Edit and D1 Edit |

Create the token through the Cloudflare dashboard, selecting only the existing account. Set it through GitHub Settings → Secrets and variables → Actions → New repository secret, or `gh secret set CLOUDFLARE_API_TOKEN --repo aloong-planet/aloong-planet-home` (interactive hidden input). Do not pass the token as a command-line argument or commit it. Account/project/database identifiers are already configured and are not secrets. No DNS-edit permission or paid Cloudflare plan is required by this workflow.

Without the secret, checks still run but the production deploy job fails with a setup message. Automatic deployment also requires this workflow to be merged into main and GitHub Actions to be available under the account's current allowance. There is no paid-plan upgrade or spending-limit change in this setup.

Require the `checks` job for merging where the GitHub plan supports private-repository branch protection. Deployment is not a required pull-request check. The PR merge itself requires explicit owner approval. The current private repository is on a Free organization plan: GitHub rejected ruleset creation with HTTP 403 (2026-11-02), so checks are not enforced by branch protection. Keep the repository private and review checks manually; do not upgrade or change visibility as part of deployment setup.

The Pages configuration schema does not accept `account_id`. The deployment command reads the account from `deployment.config.json` and supplies `CLOUDFLARE_ACCOUNT_ID` to Wrangler. Public verification hosts are defined in that same deployment settings file.

## Build output and environments

- `public`, the selected `assets`, the blog generated from `content`, and the compiled function become `dist`. A post the build refuses stops the build, and so the deployment.
- Build emits a plain JavaScript `_worker.js`, checks its syntax and records the Git revision in `deployment.json`. Never upload Wrangler's multipart `--outfile` output as JavaScript.
- `_routes.json` restricts function execution to `/api/visitor`; the rest is static.
- Only production binds the existing D1 database. `env.preview.d1_databases` is explicitly empty. No preview deployment is automated. Configure a separate preview database before testing its counter.
- Local development uses isolated `.wrangler` storage, not production data.
- `docs`, `tools`, raw photos, secrets, test logs, node_modules and local databases are excluded from the deployment.

## Recovery

Cloudflare Pages retains prior deployments. To recover the site, select a previously successful production deployment in the dashboard and use its rollback action after reviewing the target. Rolling back Pages does not roll back D1. Do not delete the existing project or change custom domains to fix an upload failure.

References: [Cloudflare Direct Upload CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), [Pages configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/).
