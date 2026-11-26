# The download count's Worker (`workers/download-count/`)

The Cloudflare Worker that a Cron Trigger runs every hour to count Agentshed's downloads, from GitHub and from the
download host, into the statistics file `stats/downloads.json` that Agentshed's site (`apps/agentshed/`) reads. It is
the workspace package `@aloong-planet/download-count`, with its dependencies in the repository's one lockfile. Source
only: nothing is built.

- `scripts/download-count-worker.mjs`: the Worker's main module. It holds the Worker's handlers and the run record,
  and runs the core.
- `scripts/download-count-core.mjs`: the core, which reads the sources, adds up the count and writes the statistics
  file. It imports nothing, so that a runtime without Node can run it.
- `scripts/testing/`, `scripts/fixtures/`: what the tests stand in for at the system boundary (GitHub's releases,
  Cloudflare's analytics and the release bucket's binding), with GitHub's real answer of 2026-11-22 as the fixture.

What the count must do, why it is collected by a Worker, and why its code lives here are in Agentshed's repository: the
[download count spec](https://github.com/aloong-planet/agentshed/blob/main/docs/specs/download-count.md),
[ADR-0056](https://github.com/aloong-planet/agentshed/blob/main/docs/adr/0056-download-count-collected-by-a-cloudflare-worker.md)
and [ADR-0058](https://github.com/aloong-planet/agentshed/blob/main/docs/adr/0058-download-count-code-lives-in-aloong-planet-home.md).
The requirement identifiers (`download-count::REQ-011`), ADR numbers and `docs/` paths in these files' comments name
that repository's documents, not this one's. How the Worker is run, checked and recovered is its
[runbook](https://github.com/aloong-planet/agentshed/blob/main/docs/ops/download-count.md).

## Commands

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @aloong-planet/download-count run lint   # ESLint over the package, no warning allowed
pnpm --filter @aloong-planet/download-count run test   # the core's and the Worker's tests
```

In CI the job `Download count Worker checks` runs `lint` and `test`, on Node 26.7.0, when a pull request changes
anything under `workers/download-count/` (see [deployment and CI](../../docs/ops/deployment.md)).

## Deploying

Nothing in this repository deploys the Worker. aloong-planet/infra's `workers` stack deploys the two modules, the main
module and the core beside it, from the commit of this repository that it pins, each checked against its pinned SHA-256,
and binds the core's hash to the Worker as `CORE_SHA256`, which each run records. A change here reaches the Worker
only when infra pins a commit that holds it. The Deploy workflow deploys every site after CI succeeds on a push to
`main`, a push that changes only this package included.

## The main module

The constraint on `scripts/download-count-worker.mjs` is in the repository's [AGENTS.md](../../AGENTS.md), with the two
cases of `scripts/download-count-worker.test.mjs` that guard it. This is the reason. The runtime takes every export of a
Worker's main module for a handler or an entrypoint and refuses to load one with any other export, a string included,
and then runs nothing. Infra uploads only two modules, the main module and the core, so the main module has nothing
else it can import. The postmortem
[A Worker's main module that would not load](https://github.com/aloong-planet/agentshed/blob/main/docs/postmortems/2026-11-23-a-worker-main-module-that-would-not-load.md)
has the failure it came from.
