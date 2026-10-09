---
sidebar_position: 4
title: Scripts and tests
---

# Scripts and tests

## `scripts/`

| Script | When to run it | What it does |
| --- | --- | --- |
| `fetch-ubuntu-assets.ts` | Rarely, when assets change | Downloads the real Ubuntu 26.04 assets from pinned sources (Yaru icons, GNOME Shell icons, wallpapers, system files) into `src/desktop/`, and makes the login avatar from `scripts/sources/abhishek.jpeg`. Needs ImageMagick and libavif. |
| `github-snapshot.ts` | When the open-source numbers should be refreshed | Writes `src/data/github.snapshot.json` from the GitHub API. |
| `serve-dist.ts` | Started by Playwright | Serves `dist/` on port 4399 for the browser tests. |

## `tests/unit/` (Bun, no browser)

One file per module, testing the pure rules: window maths (`windows`, `tiling`, `switcher`), shell rules (`dock`,
`app-grid`, `overview`, `search`, `menu`, `quick-settings`, `desktop-grid`, `desktop-menu`), system rules (`session`,
`settings`, `shortcuts`, `fullscreen`, `calendar`, `notifications`, `end-session`), the file system (`vfs`, `seed`),
assets (`ubuntu-assets`: every icon the desktop uses exists and is a real image), and the homepage helpers (`github`,
`github-fetch`, `rich`, `fuzzy`, `split`, `profile`, `featured`, `theme`, `spotify`).

```bash
bun run test
```

## `tests/build/` (reads the built site)

These run after `bun run build` and check the HTML and the sizes in `dist/`: the page shell, the top of the page,
the middle sections, the open-source section, contact and footer, the desk, the desktop page, and the **size budgets**
(see [Testing](../testing.md#size-budgets)).

```bash
bun run test:build
```

## `e2e/` (Playwright, real Chromium)

| File | Tests | Covers |
| --- | ---: | --- |
| `top.e2e.ts`, `building.e2e.ts`, `oss.e2e.ts`, `contact.e2e.ts`, `preview.e2e.ts`, `guards.e2e.ts` | 21 | Homepage sections, previews, guards against broken states |
| `menu.e2e.ts` | 11 | The command menu |
| `boot.e2e.ts` | 13 | Booting the desktop from the homepage and coming back |
| `embed.e2e.ts` | 5 | The iframe protocol (ready, Esc to exit, Power Off) |
| `desktop-page.e2e.ts` | 1 | The desktop page loads with no script errors |
| `desktop-session.e2e.ts` | 16 | Boot, login, lock, idle lock, style and accent, the top bar |
| `desktop-icons.e2e.ts` | 7 | Icon grid, drag, open |
| `desktop-menus.e2e.ts` | 5 | Right-click menus, rename, copy/paste, trash, arrange |
| `windows.e2e.ts` | 11 | Open, move, resize, snap, maximise, minimise, close |
| `dock.e2e.ts` | 9 | Dock clicks, menus, pins, running dots |
| `overview.e2e.ts` | 12 | Window picker, workspaces, search, app grid |
| `keyboard.e2e.ts` | 14 | Shortcuts, Alt+Tab, the full-screen session |
| `quick-settings.e2e.ts` | 10 | Tiles, sliders, menus, power menu |
| `end-session.e2e.ts` | 8 | Log Out / Restart / Power Off dialogs, countdown, Suspend |
| `notifications.e2e.ts` | 6 | Banners, the date menu, grouping, Do Not Disturb |
| `layers.e2e.ts` | 4 | Keys and focus with several layers open |
| `review-fixes.e2e.ts` | 6 | Edge cases: slow downloads, full screen, id reuse, failures |
| `desktop-budget.e2e.ts` | 2 | Icon download budget; each on-demand surface is its own small file |
| `desktop-visual.e2e.ts` | 8 | Screenshot baselines for 11 surfaces in light and dark (local only) |

```bash
bun run test:e2e
```
