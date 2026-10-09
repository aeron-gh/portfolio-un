---
sidebar_position: 2
title: Getting started
---

# Getting started

## Prerequisites

| Tool | Version | Used for |
| --- | --- | --- |
| [Bun](https://bun.sh) | 1.4 | Installing, running scripts, unit tests |
| Chromium | any recent | Browser tests (the config uses `/usr/bin/chromium`; set `PW_BUNDLED=1` to use Playwright's own) |
| ImageMagick, libavif | optional | Only for `scripts/fetch-ubuntu-assets.ts` (re-fetching the Ubuntu assets) |

## Install and run

```bash
git clone https://github.com/aeron-gh/portfolio-un.git
cd portfolio-un
bun install
bun run dev        # http://localhost:4321  (the desktop is at /desktop/)
```

`bun run dev` uses the saved GitHub data (`GITHUB_DATA=snapshot`), so it never calls the GitHub API.

## All commands

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server with hot reload on port 4321. |
| `bun run build` | Builds the whole site into `dist/`. |
| `bun run preview` | Serves `dist/` on port 4321 to check a build. |
| `bun run check` | Type-checks every `.astro`, `.svelte` and `.ts` file (`astro check`). |
| `bun run test` | Unit tests in `tests/unit/` (pure logic, no browser). |
| `bun run test:build` | Builds, then runs `tests/build/` (HTML checks and size budgets). |
| `bun run test:e2e` | Builds, then runs every Playwright test in `e2e/` on port 4399. |
| `bun run github:snapshot` | Refreshes `src/data/github.snapshot.json` from the GitHub API. |

Browser tests use port **4399** on purpose: the dev server uses 4321, and the tests must never run against dev code.

## Environment variables

| Variable | Default | Effect |
| --- | --- | --- |
| `GITHUB_DATA` | live | `snapshot` uses `src/data/github.snapshot.json` instead of the GitHub API. |
| `GITHUB_TOKEN` | none | Optional token for the live GitHub search (higher rate limit). Without it the build still works and falls back to the snapshot if GitHub refuses. |
| `PW_BUNDLED` | unset | `1` makes Playwright use its bundled Chromium instead of `/usr/bin/chromium`. |
| `CI` | unset | Set by GitHub Actions; skips the screenshot tests (see [Testing](./testing.md)). |

## Useful URLs while developing

| URL | What you get |
| --- | --- |
| `/` | The homepage. Press **U** to boot the desktop in place. |
| `/desktop/` | The desktop on its own page. |
| `/desktop/?embed=1` | The desktop as the homepage embeds it (it talks to its parent page). |
| `/desktop/?test-apps` | Adds two hidden test apps (*Test Window*, *Test Utility*) used by the browser tests. |
