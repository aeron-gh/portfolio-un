---
sidebar_position: 10
title: Roadmap
---

# Roadmap

The shell is done: boot, login, lock, top bar, Quick Settings, dock, windows, Overview, search, notifications,
desktop icons. The next work is the **apps** that open inside it.

## Next: the apps

Every app is already listed in `src/desktop/apps/registry.ts` with `built: false`. That flag keeps an app out of the
dock, the app grid and search until it works. So the dock order is already right, and once an app works, showing it
is a small change in one file.

| Phase | Apps | Notes |
| --- | --- | --- |
| 1 | **Files**, **Text Editor**, **Image Viewer**, **Document Viewer** | All four work on the [file system](./desktop/file-system.md), which is ready. Files also gets a "Reset" menu item that puts the files back to the seed |
| 2 | **Terminal** | Looks like Ptyxis, the terminal Ubuntu 26.04 ships, and runs `bash`-like commands on the same file system |
| 3 | **Firefox** | A browser window that looks like Firefox |
| 4 | **Settings**, **Music**, **Help**, **App Center**, **About**, and the screenshot tool | Settings is a window over the settings store that already exists. It adds Privacy → "Reset this computer". App Center lists the projects as apps to install. Music plays the Spotify playlist |

When an app is built, the greyed-out desktop menu items that need it (Show in Files, Open in Terminal, Properties,
Change Background…) turn on too.

### Adding an app

1. Make a folder `src/desktop/apps/<app>/` with a Svelte component that takes `AppProps` (`winId`, and optional
   `args`).
2. In `registry.ts`, set `built: true` and add `load: () => import('./<app>/<App>.svelte')`. The dynamic import keeps
   the app out of the start-up JavaScript (see [Size budgets](./testing.md#size-budgets)).
3. Write the app's rules in plain `.ts` files with unit tests, then browser tests for what a visitor does.

## Smaller items

| Item | Now | Ubuntu |
| --- | --- | --- |
| Tile preview and workspace dot animation | Animate `width` | Should animate `transform`, which the browser can do without re-laying-out the page |
| Super+1 … 9 | Reads the dock pins from saved data | Should read the dock's live copy, so a change made a moment ago is always seen |
| Desktop icons: rubber-band selection | Not built | Drag on empty desktop to draw a box and select the icons inside |
| Desktop icons: Keep Stacked by type | Greyed out | Groups files of one type into a stack |
| Drag and drop between the desktop and windows | Not built | Needs Files first |
