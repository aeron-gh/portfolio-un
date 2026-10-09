---
sidebar_position: 8
title: CI and deployment
---

# CI and deployment

**CI** (continuous integration) is a robot that runs every check on every push. **Deployment** is putting the built
site on the internet. Here, GitHub Actions does CI, and Cloudflare does deployment.

## CI: `.github/workflows/ci.yml`

It runs on every pull request, and again on `master` after each merge. If you push again to the same branch
while a run is still going, the old run is cancelled. Only the newest code matters.

There are two jobs, and they run side by side.

### Job 1: type check, tests and budgets

| Step | Command | Why |
| --- | --- | --- |
| Install | `bun install --frozen-lockfile` | Installs exactly what `bun.lock` lists. If `package.json` and the lockfile disagree, it fails instead of quietly changing versions |
| Type check | `bun run check` | `astro check` type-checks `.astro`, `.svelte` and `.ts` files together |
| Unit tests | `bun test tests/unit` | The fast rule tests |
| Build | `bun run build` | Builds `dist/` exactly as production does |
| Build checks | `bun test tests/build` | HTML checks and the [size budgets](./testing.md#size-budgets) |
| Install Chromium | `bunx playwright install --with-deps chromium` | Playwright's own browser and the system libraries it needs |
| Browser tests | `bunx playwright test` | Every browser test except the screenshots |
| Upload report | only if something failed | The Playwright report and failure screenshots, kept 7 days, under the run's **Artifacts** |

Two settings for this job:

- `GITHUB_DATA=snapshot` makes the build use the saved GitHub data in `src/data/github.snapshot.json`. A CI run then
  never fails because the GitHub API was slow or rate-limited.
- `PW_BUNDLED=1` tells Playwright to use its own Chromium. Locally it uses the one installed on the machine.

The screenshot tests are skipped when the `CI` variable is set (GitHub sets it). Fonts render a few pixels
differently on GitHub's machines, so those tests would fail for no real reason. See
[Matching real Ubuntu](./fidelity.md#screenshot-tests).

### Job 2: the docs site

Installs and builds `docs-site/`. The Docusaurus config sets `onBrokenLinks: 'throw'`, so **a broken link in these
docs fails CI**.

### When CI fails

1. Open the run on GitHub, under the **Actions** tab, and find the red step.
2. If browser tests failed, download the `playwright-report` artifact, unzip it, and open it with
   `bunx playwright show-report playwright-report`. Each failed test has a screenshot and a step-by-step trace.
3. Run the same command locally to reproduce it.

## Deployment: Cloudflare Workers

The site is a static folder (`dist/`), served by a **Cloudflare Worker** with static assets. A Worker is a small
program that runs in Cloudflare's data centres around the world. Here it only serves files.

| Setting | Main site | Docs site |
| --- | --- | --- |
| Worker name | `portfolio-un` | `portfolio-un-docs` |
| Git repository | `aeron-gh/portfolio-un` | `aeron-gh/portfolio-un` |
| Production branch | `master` | `master` |
| Root directory | `/` | `docs-site` |
| Build command | `bun run build` | `bun run build` |
| Deploy command | `npx wrangler deploy --assets=./dist --name=portfolio-un --compatibility-date=2026-10-01` | `npx wrangler deploy --assets=./build --name=portfolio-un-docs --compatibility-date=2026-10-01` |
| Build variable | `BUN_VERSION=1.4.0` | `BUN_VERSION=1.4.0` |
| Preview deploy command | `npx wrangler preview` | `npx wrangler preview` |
| Domain | `mraeron.tech`, `www.mraeron.tech` | `docs.mraeron.tech` |

Cloudflare's **Workers Builds** watches the repository. **Every change to `master` (each merged pull request) builds
and deploys.**

Each Worker also has a config file: `wrangler.jsonc` at the root for the site, and `docs-site/wrangler.jsonc` for the
docs. It holds the Worker's name and the folder to serve.

### Preview builds

For every pull request, Cloudflare also builds the branch and uploads it as a **preview**, with `npx wrangler
preview`. That command has no `--assets` flag, and it takes the Worker's name from the config file, so preview builds
need `wrangler.jsonc`.

Preview builds have **their own settings** in the dashboard, separate from production. They need the same
`BUN_VERSION=1.4.0` variable (and, for the docs Worker, the `docs-site` root directory). Without it, Cloudflare uses
its default Bun, which can't read our `bun.lock` ("Unknown lockfile version"), and the install fails.

A preview check doesn't block a merge (only the two CI jobs do), but a red check on every pull request hides real
failures, so keep them green.

`--assets=./dist` means "serve this folder". There is no Worker script of our own. The `compatibility-date` pins how
Cloudflare's runtime behaves, so a later Cloudflare change can't alter the site by surprise.

The production build has no `GITHUB_DATA`, so it fetches **live** GitHub data. If GitHub fails, it falls back to the
snapshot. See [GitHub data](./homepage/github-data.md).

### How a change reaches the site

Cloudflare deploys `master` without waiting for GitHub Actions. So the gate is on `master` itself: a GitHub
**ruleset** named "Protect master" means nothing reaches `master` without passing CI first.

| Rule | Effect |
| --- | --- |
| Pull request required | Nobody can push to `master` directly, not even the owner |
| Required checks | A pull request can't be merged until both CI jobs are green |
| No force-push, no deletion | `master`'s history can't be rewritten or lost |

The repository also allows **squash merging only**, with the pull request's title as the whole commit message. Each
pull request becomes exactly one one-line commit on `master`. The branch is deleted after the merge.

```bash
git switch -c fix-dock-menu        # 1. a short-lived branch for one change
# … edit, test, commit …
git push -u origin fix-dock-menu   # 2. push it
gh pr create --fill                # 3. open a pull request; CI runs on it
gh pr checks --watch               # 4. wait for green
gh pr merge --squash               # 5. merge: master changes, and Cloudflare deploys
git switch master && git pull      # 6. back to an up-to-date master
```

### DNS

The domain's DNS is on Cloudflare. The site's records are managed by the Worker's custom domain settings. The email
records (MX and TXT) belong to the mail provider and must not be touched.

## Before Cloudflare

Until October 2026, the old site was served by GitHub Pages. Pages is now turned off. The last version of the old site
is kept on the `legacy-site` branch.
