---
sidebar_position: 11
title: Settings and saved data
---

# Settings and saved data

There is no server. Everything a visitor changes is saved in their own browser's `localStorage`. It stays on their
device and is never sent anywhere.

## Every saved key

| Key | What it holds | Written by |
| --- | --- | --- |
| `ubuntu.settings.v1` | Style, accent, Night Light, power mode, Do Not Disturb, 12/24-hour clock, volume, brightness, Wi-Fi, Bluetooth, Airplane mode | `system/settings.ts` |
| `ubuntu.fs.v1` | The visitor's file changes (the overlay, see [File system](./file-system.md)) | `fs/vfs.ts` |
| `ubuntu.desktop-icons.v1` | Where each desktop icon sits (`path → cell`) | `shell/DesktopIcons.svelte` |
| `ubuntu.desktop-arrange.v1` | The "Arrange By" choices | `shell/desktop-arrange.ts` |
| `ubuntu.dock.v1` | Pinned dock apps, in order | `shell/dock.ts` |
| `ubuntu.app-grid.v1` | The visitor's own app grid order | `shell/app-grid.ts` |
| `ubuntu.session.v1` | `ubuntu` or `fullscreen`, the last session picked at login | `system/fullscreen.ts` |
| `ubuntu.welcome.v1` | `1` once the "Welcome to Ubuntu 26.04 LTS" note has been shown | `system/notifications.svelte.ts` |
| `theme` | The **homepage's** theme: `light`, `dark` or `system` | `src/scripts/theme.ts` |

The `.v1` at the end is a version number. If a saved shape ever has to change in a way old data can't fit, the key
becomes `.v2`. Old data is then ignored instead of misread.

## The settings model

`system/settings.ts` is pure TypeScript with unit tests. `system/settings.svelte.ts` wraps it in a reactive store that
every component reads.

| Setting | Default | Notes |
| --- | --- | --- |
| `style` | `system` | `light`, `dark`, or follow the visitor's OS |
| `accent` | `orange` | One of Ubuntu's 10 accents, see [Theming](./theming.md) |
| `nightLight` | off | A warm 2700 K overlay |
| `powerMode` | `balanced` | The tile switches between Balanced and the last other mode |
| `dnd` | off | Do Not Disturb: no banners, no unread dot |
| `clock24` | `null` | `null` means "follow the visitor's locale" |
| `volume`, `brightness` | 70, 100 | Whole numbers from 0 to 100 |
| `wifi`, `bluetooth` | on | |
| `airplane` | off | Only valid while Wi-Fi and Bluetooth are both off |

To change a setting from code:

```ts
import { settings, updateSettings } from '../system/settings.svelte';

updateSettings({ accent: 'teal' }); // changes the store and saves it
settings.accent;                     // 'teal', and every component that reads it updates
```

## Never trust saved data

Saved data can be old, hand-edited or half-written. So every loader checks every field before using it:

- A wrong type or unknown value falls back to the default for **that field only**. The other fields are kept.
- Numbers are rounded and clamped. A saved volume of `250` loads as `100`.
- Fields that depend on each other are checked together. `airplane: true` with Wi-Fi on is a damaged save, so it
  loads as off.
- `accent` is checked with `Object.hasOwn`, so a saved value like `"toString"` can't slip through as a real key.

## When storage is blocked

Some browsers block `localStorage` (strict privacy modes, some embedded views). `safeStorage()` returns `null` there
instead of throwing. Every save is wrapped in `try … catch`. So the desktop still works: changes last for the visit,
and nothing breaks.

## Starting fresh

To reset the desktop on your own browser, open the browser's developer tools, then go to **Application → Local
Storage**, and delete the keys that start with `ubuntu.`. Or run this in the console on the site:

```js
Object.keys(localStorage).filter((k) => k.startsWith('ubuntu.')).forEach((k) => localStorage.removeItem(k));
```
