---
sidebar_position: 1
title: Overview
---

# Project structure

```text
portfolio-un/
├── .github/workflows/ci.yml   CI: type check, tests, budgets, docs build
├── astro.config.mjs           Astro setup: Svelte, fonts, build options
├── bun.lock                   Exact dependency versions (CI refuses to change it)
├── docs-site/                 This documentation site (Docusaurus)
├── e2e/                       Playwright browser tests (+ screenshot baselines)
├── package.json               Scripts and dependencies
├── playwright.config.ts       Browser test setup (port 4399, reduced motion)
├── public/                    Files copied as they are (favicon)
├── scripts/                   One-off and helper scripts
├── src/
│   ├── components/            Homepage sections (.astro)
│   ├── content/               Profile text: the only file to edit for content
│   ├── data/                  Saved GitHub data (snapshot)
│   ├── desktop/               The Ubuntu 26.04 desktop (Svelte)
│   ├── layouts/               The HTML shell every page uses
│   ├── lib/                   Pure helpers (GitHub data, rich text, search)
│   ├── pages/                 Routes: / and /desktop/
│   ├── scripts/               Homepage browser scripts (small, one job each)
│   └── styles/                Homepage CSS: tokens, base, blocks
├── tests/
│   ├── unit/                  Pure logic tests (Bun)
│   └── build/                 Tests that read the built dist/ (HTML, budgets)
└── tsconfig.json              Strict TypeScript, Bun types
```

## How the code is organised

Two rules shape the whole repository:

1. **Logic lives in plain `.ts` files; components only show it.** Every rule that can be tested without a browser
   (where a window opens, which dock icons show, how a clock is formatted) is a pure function in a `.ts` file with unit
   tests. `.svelte` and `.astro` files hold markup, styles and wiring.
2. **Shared state lives in `.svelte.ts` stores.** A file like `wm.svelte.ts` holds `$state` that several components
   read (the window list, the open menu). Components import the store; there is no global event bus.

The detailed pages:

- [Homepage files](./homepage-files.md): `src/pages`, `src/components`, `src/scripts`, `src/lib`, `src/styles`,
  `src/content`, `src/data`, `src/layouts`, `public`.
- [Desktop files](./desktop-files.md): every file in `src/desktop/`.
- [Scripts and tests](./scripts-and-tests.md): `scripts/`, `tests/unit`, `tests/build`, `e2e/`.
