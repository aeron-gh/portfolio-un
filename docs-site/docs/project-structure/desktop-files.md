---
sidebar_position: 3
title: Desktop files
---

# Desktop files (`src/desktop/`)

The desktop is one Svelte app, mounted by `src/pages/desktop/index.astro`. Folders follow the parts of the system.

## Top level

| File | Job |
| --- | --- |
| `Desktop.svelte` | The root: picks the screen for the session state (boot, login, session, lock, off), sets the theme and accent, Esc-to-exit when embedded, idle lock, test hooks (`window.ubuntu`). |
| `env.ts` | The data the page hands to the desktop (name, avatar, wallpapers). |
| `embed.ts` | Talking to the homepage when running in its iframe (`?embed=1`): `desktop:ready`, `desktop:exit`. |
| `icons.ts` | Yaru icon name → URL of the committed file. |

## `boot/` (screens outside the session)

| File | Job |
| --- | --- |
| `Login.svelte` | GDM login: user list, password step, session chooser (Ubuntu / Ubuntu full screen), accessibility button. |
| `Lock.svelte` | The lock screen: clock curtain, then the password prompt; the first key goes into the field. |
| `PowerOff.svelte` | The black "powered off" screen (loaded on demand). |

## `shell/` (GNOME Shell: everything around the windows)

| File | Job |
| --- | --- |
| `Session.svelte` | The logged-in session: wallpaper, top bar, desktop icons, windows, dock, and the on-demand surfaces. Quits every app when the session ends. |
| `TopBar.svelte` | The top bar: workspace dots, clock (with the unread dot), status icons. |
| `QuickSettings.svelte`, `quick-settings.ts`, `Slider.svelte` | Quick Settings: system row, volume and brightness sliders, the seven tiles and their menus. |
| `ScreenFilters.svelte` | Night Light (warm overlay) and brightness (dimming overlay). |
| `DateMenu.svelte`, `Calendar.svelte` | The date menu: notifications on the left; Today, calendar and events on the right. |
| `Banner.svelte`, `MessageCard.svelte` | Notification banners and the notification card used everywhere. |
| `Dock.svelte`, `dock.ts`, `dock-menu.ts` | The Ubuntu Dock: pinned and running apps, running dots, tooltips, menus, Show Apps. The menu builder (`dock-menu.ts`) loads on first right-click. |
| `Overview.svelte`, `overview.ts`, `overview.svelte.ts` | Activities Overview: window picker, workspaces, search, app grid. |
| `AppGrid.svelte`, `app-grid.ts` | The app grid: pages, folders, drag to reorder. |
| `SearchResults.svelte`, `search.ts` | Overview search results and ranking. |
| `Keyboard.svelte` | Every keyboard shortcut (see [Keyboard shortcuts](../desktop/keyboard-shortcuts.md)). |
| `Switcher.svelte`, `SwitcherList.svelte`, `switcher.svelte.ts` | Alt+Tab, Super+Tab and Alt+\` switchers. |
| `EndSessionDialog.svelte` | Log Out / Restart / Power Off dialogs with the 60-second countdown. |
| `SuspendScreen.svelte` | The dark screen after Suspend. |
| `Dialog.svelte` | The "no app installed" dialog for files. |
| `PopupMenu.svelte`, `menu.ts` | Shell popup menus (dock menu, session chooser). |
| `DesktopIcons.svelte` | Desktop icons: grid, drag, selection, right-click menus, rename, clipboard, arrange. |
| `GtkMenu.svelte`, `desktop-menu.ts` | The desktop's GTK-style menus and their items. |
| `RenamePopover.svelte` | The "Folder name" / "File name" popover. |
| `desktop-grid.ts`, `desktop-arrange.ts` | Icon grid maths and the sort orders. |
| `clipboard.svelte.ts` | Files cut or copied, waiting for Paste. |
| `file-icons.ts` | Which icon a file gets, and the "no app" dialog text. |
| `panel.svelte.ts` | Which top-bar menu is open (only one at a time). |
| `surfaces.ts` | Loads surfaces on first use and prefetches them when the browser is idle. |
| `focus-trap.ts` | Keeps Tab inside modal dialogs. |
| `layout.ts` | Shell geometry: top bar 32px, dock 66px, the work area. |

## `wm/` (the window manager)

| File | Job |
| --- | --- |
| `windows.ts` | The model: open, focus, stack, maximise, tile, move, resize, workspaces. Pure and unit-tested. |
| `wm.svelte.ts` | The live window manager: the shared state, animation phases, launch, close, minimise, quit all. |
| `tiling.ts` | Edge snapping rules (Tiling Assistant) and the tiling popup's candidates. |
| `switcher.ts` | Switcher order: most recently used first. |
| `Window.svelte` | One window: libadwaita-style frame, drag, resize, animations, keyboard focus. The app draws its own header bar. |
| `WindowLayer.svelte` | All windows, the snap preview, workspace slides, the tiling popup. |
| `TilingPopup.svelte` | "Pick the window for the other half" after tiling. |

## `system/` (state and rules not tied to one surface)

| File | Job |
| --- | --- |
| `session.ts`, `session.svelte.ts` | The session state machine: boot → login → session ⇄ lock, power off, restart. |
| `settings.ts`, `settings.svelte.ts` | Settings (style, accent, Night Light, Power Mode, radios, volume, brightness…), loaded safely from storage. |
| `shortcuts.ts` | Key event → action table. |
| `fullscreen.ts` | The full-screen session (Fullscreen API + Keyboard Lock). |
| `layers.svelte.ts` | The stack of open overlays: who gets the keys, when Esc may leave the page. |
| `clock.ts`, `battery.ts`, `devices.svelte.ts` | Clock text, battery icon and label, live battery and network state. |
| `calendar.ts` | The six-week month grid and date headings. |
| `notifications.ts`, `notifications.svelte.ts` | Notification grouping, time words, the banner queue, welcome and reset notices. |
| `end-session.ts`, `end-session.svelte.ts`, `actions.ts` | End-session texts and countdown, the open dialog, Suspend, the power menu actions. |

## `fs/` (the file system)

| File | Job |
| --- | --- |
| `vfs.ts` | The in-browser file system: one tree; changes saved as an overlay. |
| `fs.svelte.ts` | The shared instance and a version counter that changes on every write. |
| `seed.ts` | Builds the starting tree at build time: `~/Desktop/README.md`, documents, projects, open-source work, system files. |
| `system/` | Real Ubuntu files: `/etc/os-release`, `lsb-release`, `issue`, and the default `~/.bashrc`, `~/.profile`, `~/.bash_logout`. |

## `apps/`, `theme/`, `assets/`

| Path | Contents |
| --- | --- |
| `apps/registry.ts` | Every app the desktop knows: built apps load on demand; the others are marked as not built yet; the two test apps load only with `?test-apps`. |
| `apps/open.ts`, `apps/opener.ts` | Which app opens a file type, and what a double-click does. |
| `apps/adw/` | The libadwaita kit every app uses: header bar, popovers and menus, dialogs, tab bar, status page, colours and buttons. See [Apps](../desktop/apps.md). |
| `apps/text-editor/` | [Text Editor](../desktop/text-editor.md). |
| `apps/test-window/` | *Test Window* and *Test Utility*, used by the browser tests. |
| `theme/tokens.css` | Every colour and size, light and dark, from Yaru and GNOME Shell. |
| `theme/base.css` | Reset, fonts, symbolic icons (`.sym`), reduced motion. |
| `assets/icons/` | Yaru icons (symbolic SVGs and colour PNGs), fetched from a pinned Yaru commit. |
| `assets/wallpapers/` | The default Ubuntu 26.04 wallpapers (light and dark) as AVIF, plus tiny placeholders. |
