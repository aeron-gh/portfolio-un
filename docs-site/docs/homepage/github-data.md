---
sidebar_position: 2
title: GitHub data
---

# GitHub data

The open-source section, the hero numbers and the contribution graph come from merged pull requests on GitHub.

## Where the data comes from

```text
build starts
  └── loadGithub()  (src/lib/site-data.ts)
        ├── GITHUB_DATA=snapshot → read src/data/github.snapshot.json
        └── otherwise → fetchMergedPrs() (src/lib/github-fetch.ts)
              ├── GitHub search API, with a timeout
              └── on any failure → fall back to the snapshot
  └── shapeGithubData()  (src/lib/github.ts)
        → totals, groups by project, the 52-week graph
```

The data is fetched **at build time only**: the visitor's browser never calls GitHub.

## Keeping it fresh

- Production builds fetch live data. With no `GITHUB_TOKEN` the anonymous rate limit may be hit; the build then uses
  the snapshot, so it never fails because of GitHub.
- `bun run github:snapshot` refreshes the snapshot by hand (commit the new JSON).
- Dev, CI and tests always use the snapshot, so they are fast and give the same result every run.

## Excluded repositories

Some owners and repositories are left out (for example personal forks). The list is `exclude` in
`src/content/profile.ts`, and `shapeGithubData()` applies it.
