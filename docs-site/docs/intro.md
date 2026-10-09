---
sidebar_position: 1
slug: /
title: Introduction
---

# mraeron.tech

This is the documentation for **[mraeron.tech](https://mraeron.tech)**, the portfolio of Abhishek Agarwal, and for the
**Ubuntu 26.04 desktop** that runs inside it at **[mraeron.tech/desktop/](https://mraeron.tech/desktop/)**.

The site has two parts that live in one repository:

| Part | What it is | Where it lives |
| --- | --- | --- |
| **The homepage** | A fast, mostly static résumé page: open-source work, projects, experience, contact. | `src/pages/index.astro`, `src/components/`, `src/scripts/` |
| **The Ubuntu desktop** | A browser copy of Ubuntu 26.04 LTS (GNOME Shell 50, Yaru theme): boot screen, login, top bar, Quick Settings, dock, windows, Overview, notifications. The homepage can boot it in place. | `src/pages/desktop/`, `src/desktop/` |

The goal of the desktop is simple to state and hard to do: **someone who uses Ubuntu should not be able to tell it apart
from the real thing**. Every size, colour, timing and text is copied from the real Ubuntu 26.04 sources (GNOME Shell,
the Yaru theme, the Ubuntu Dock, Desktop Icons NG), never guessed. See [Matching real Ubuntu](./fidelity.md).

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Site framework | [Astro](https://astro.build) 7 | Static HTML by default; JavaScript only where a page needs it. |
| Interactive desktop | [Svelte](https://svelte.dev) 5 (runes) | Small compiled output, fine-grained reactivity, no virtual DOM. |
| Language | TypeScript (strict) | Every module is type-checked with `astro check`. |
| Runtime and tests | [Bun](https://bun.sh) | Installs, scripts and fast unit tests. |
| Browser tests | [Playwright](https://playwright.dev) | Real Chromium: clicks, keys, screenshots, timing with a fake clock. |
| Hosting | Cloudflare Workers (static assets) | Free, global, deploys on every push to `master`. |
| CI | GitHub Actions | Type check, unit tests, build budgets, browser tests, docs build. |
| These docs | [Docusaurus](https://docusaurus.io) 3 | Lives in `docs-site/` next to the code it describes. |

## Where to go next

- **Run it locally:** [Getting started](./getting-started.md)
- **Find your way around the code:** [Project structure](./project-structure/overview.md)
- **Understand the desktop:** [Desktop architecture](./desktop/architecture.md)
- **How the project came together:** [How it was built](./history.md)
