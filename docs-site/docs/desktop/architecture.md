---
sidebar_position: 1
title: Architecture
---

# Desktop architecture

The desktop at `/desktop/` is one Svelte 5 app. `src/pages/desktop/index.astro` builds the starting file system and
the profile data at build time, then mounts `Desktop.svelte` in the browser.

## Layers of the code

```text
Desktop.svelte                 picks the screen for the session state
├── boot/Login.svelte          login screen (GDM)
├── shell/Session.svelte       the logged-in session
│   ├── TopBar                 clock, status icons, workspace dots
│   ├── DesktopIcons           ~/Desktop on the wallpaper
│   ├── wm/WindowLayer         every window
│   ├── Dock                   the Ubuntu Dock
│   ├── Keyboard               every shortcut
│   └── on demand: Overview, Quick Settings, date menu, banners,
│                  switcher, menus, dialogs
├── boot/Lock.svelte           lock screen (over the live session)
└── shell/ScreenFilters        Night Light and brightness overlays
```

## Three kinds of files

| Kind | Example | Rule |
| --- | --- | --- |
| **Pure logic** (`.ts`) | `wm/windows.ts`, `shell/dock.ts`, `system/calendar.ts` | No DOM, no Svelte. Unit-tested with Bun. |
| **Stores** (`.svelte.ts`) | `wm/wm.svelte.ts`, `system/settings.svelte.ts` | Shared `$state` that several components read. |
| **Components** (`.svelte`) | `shell/Dock.svelte` | Markup, styles and wiring; they call the logic and read the stores. |

This keeps the hard parts (window maths, ordering rules, menus, text formats) testable without a browser, and keeps
each component small.

## Overlays and the keyboard

Menus, dialogs, the Overview and the switcher are **layers**. `system/layers.svelte.ts` keeps them in a stack:

- `openLayer()` returns a handle with `top()` and `close()`.
- A component that listens for keys on the whole window acts only when its layer is on top
  (so Esc in the date menu over the Overview closes only the menu).
- When the desktop is embedded in the homepage, Esc leaves the desktop only when no layer is open.

Keyboard focus follows the window manager: when a window becomes the focused window and no layer is above it, keyboard
focus moves into it, back to whatever was focused there last time.

## Loading on demand

The first download stays small (see [size budgets](../testing.md#size-budgets)). Everything a visitor does not need at
first paint loads the first time it is used, and is prefetched when the browser is idle after login:
Overview, Quick Settings, the date menu, banners, end-session dialogs, menus, the rename popover, the switcher, the
tiling popup, the "no app" dialog, the power-off screen. This logic is in `shell/surfaces.ts`. If one of these fails
to download (for example, offline right after a deploy), the surface backs out cleanly instead of getting stuck.

## Motion

All animation uses `transform` and `opacity` with GNOME's timings and curves (ease-out-quad, ease-out-expo,
ease-out-back). `prefers-reduced-motion: reduce` makes every animation instant, in CSS and in JavaScript.
