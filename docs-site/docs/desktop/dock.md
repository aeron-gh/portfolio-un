---
sidebar_position: 4
title: The dock
---

# The Ubuntu Dock

Rules in `shell/dock.ts`, drawing in `shell/Dock.svelte`. Values come from the ubuntu-dock extension's 26.04 defaults.

## Layout

- Left edge, full height under the top bar, **66px** wide (48px icons + padding), opaque `#131313`.
- Pinned apps, then running apps that are not pinned, then a divider, Trash, and **Show Apps** (the Ubuntu logo) at
  the bottom.
- A dot under an app for each open window (up to four).
- A tooltip with the app name after 300 ms of hover.

## Clicking an app (`focus-or-appspread`)

| App state | Click does |
| --- | --- |
| Not running | Opens it |
| Running, not focused | Focuses its most recent window |
| Focused, one window | Keeps it focused |
| Focused, several windows | Shows only that app's windows in the Overview (app spread) |

**Super+1 … Super+9** do the same for the first nine dock apps; with **Ctrl** they open a new window.

## Right-click menu

The app name as a header, then **Open Windows** with each window's title (when running), **New Window**, **Pin to
Dock** or **Unpin**, and **Quit** (when running). Arrow keys and Enter work; Esc closes only the menu. Pins are saved
(`ubuntu.dock.v1`); broken saved data falls back to the default pins.
