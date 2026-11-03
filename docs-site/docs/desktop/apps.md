---
sidebar_position: 13
title: Apps and the libadwaita kit
---

# Apps and the libadwaita kit

GNOME apps are built with **libadwaita**, GNOME's set of widgets and styles. Every app here uses a small copy of those
widgets, in `src/desktop/apps/adw/`. [Text Editor](./text-editor.md) and [Files](./files.md) use them, and Image Viewer
and Document Viewer will too.

## How an app plugs in

| Piece | File | Job |
| --- | --- | --- |
| Registry entry | `apps/registry.ts` | Name, icon, window size, `built: true`, and `load` (the app's code, loaded on demand) |
| `open` hook | `apps/registry.ts` | Optional: how the app opens a file when a new window is not always right (Text Editor adds a tab) |
| Window frame | `wm/Window.svelte` | Only the frame: border, shadow, rounded corners, resize edges |
| Header bar | `apps/adw/HeaderBar.svelte` | The app draws its own header bar, as GTK apps do. It gets its window through a Svelte **context** (`wm/window-context.ts`) |
| Close check | `guardClose()` in `wm/wm.svelte.ts` | An app with unsaved work can pause a close and ask first |
| Title and style | `win.title`, `win.style` | The app names its window, and can give it its own light or dark style |

A **context** lets a parent component share something with any component inside it, at any depth. The window frame
shares its window and its drag handler, and the header bar picks them up.

## Opening a file

| File | Job |
| --- | --- |
| `apps/open.ts` | Which app opens a file type (pure, unit-tested) |
| `apps/opener.ts` | `openPath(path)`: what a double-click does anywhere on the desktop |

| File type | Opens in |
| --- | --- |
| `text/*`, JSON | Text Editor |
| images | Image Viewer |
| PDF | Document Viewer |
| folders | Files |

If that app is not built yet, the caller shows GNOME's "no app" dialog.

## The kit

| Component | libadwaita / GTK original | Notes |
| --- | --- | --- |
| `HeaderBar` | `AdwHeaderBar` | Start and end slots, centred title, window buttons. `flat` for a header inside an `AdwToolbarView` |
| `Popover` | `GtkPopover` | Lives in the window layer: above its window, below the top bar and dock, never clipped. Arrow 24 × 12 px. Opens above its button when there is no room below. `align="start"`, `point` (at the pointer) and `arrow={false}` for context menus |
| `PopoverMenu` | `GtkPopoverMenu` | Sections with separators or titles, shortcuts dimmed 12 px after the label, check and radio items, submenus that slide in, custom rows. One mark in a menu indents every label, as GTK's size group does |
| `AlertDialog` | `AdwAlertDialog` | Over its own window. The buttons sit in one row of equal widths, and that row sets the width (300 to 600 px) |
| `AboutDialog` | `AdwAboutDialog` | 360 px wide. Main page, Credits and Legal pages, the "Copied to clipboard" toast |
| `TabBar` | `AdwTabBar` | Tabs share the width, 5 px apart. Middle-click closes. Right-click asks the app for its menu |
| `StatusPage` | `AdwStatusPage` | 128 px icon, `title-1` heading, description, optional button |
| `Dialog` | `AdwDialog` | A floating sheet with a title and a close button. Focus goes to its entry if it has one |
| `EntryRow` | `AdwEntryRow` | The title moves above the text when the row is focused or has text |
| `Toast` | `AdwToast` | A dark pill near the bottom, an optional button, Dismiss. Goes by itself after 5 seconds |
| `Scrollbar` | `GtkScrollbar.overlay-indicator` | Floats over the content and takes no room. 3 px, 8 px when hovered, gone after 2 seconds |
| `keep-focus.ts` | `focus-on-click` | A click on a header or a label leaves the keyboard where it was |
| `focus-ring.ts` | `GtkWindow:focus-visible` | A ring shows when a key has just moved the focus, and goes after 3 seconds. Styles use `:root[data-focus-ring] x:focus` |
| `adw.css` | libadwaita's stylesheet | The named colours for light and dark, buttons (`.adw-button`), boxed lists and rows |

The kit's code and styles load with the first app, not at start.

### Focus rings are not `:focus-visible`

The browser's `:focus-visible` guesses from the last input, and keeps showing a ring when a script moves the focus. GTK
has a clearer rule (`_gtk_window_update_focus_visible`): when a key is released, the ring shows if that key moved the
focus, and goes after `VISIBLE_FOCUS_DURATION`, 3 seconds. So typing in an entry never shows one, and a menu opened with
the mouse shows none, unless a key moved the focus in the last 3 seconds.

### One opacity worth remembering

libadwaita's `$dimmer_opacity` is 30 %. It is used for the arrow on a submenu, the ring of a menu radio and the line in a
split button. Its `--dim-opacity` (55 %) is a different value, for dimmed text.

### GTK sizes are content sizes

In GTK's CSS, `min-width` and `min-height` size the **content**, inside the padding. This project's CSS uses
`box-sizing: border-box`, where they include the padding. So a GTK button with `min-width: 60px` and `padding: 10px 20px`
is `100px` here. Forgetting this made the first "Save Changes?" dialog 346 px wide instead of 372 px.

## Icons

Icons used only inside an app live next to that app and are imported directly (`icons/…svg?url`). They load with the
app, not at start. Icons from libadwaita itself (`adw/assets/`) are its own files. One of them,
`adw-external-link.svg`, is in GTK's newer SVG format and has no SVG namespace, so it is fixed for browsers when
fetched (see `scripts/fetch-ubuntu-assets.ts`). A unit test checks that every SVG has the namespace.

## Adding an app

1. Make `src/desktop/apps/<app>/` with a component that takes `AppProps` (`winId`, optional `args`). Start it with
   `<HeaderBar>`.
2. In `registry.ts`, set `built: true` and `load: () => import('./<app>/<App>.svelte')`.
3. Write its rules in plain `.ts` files with unit tests, then browser tests and screenshots.
4. Add its main file to the chunk budget in `e2e/desktop-budget.e2e.ts` (at most 25 KB compressed).
5. Give its root `onmousedown={keepFocus}`, so a click on its header does not take the keyboard away, and give anything
   that scrolls `scrollbar-width: none` and a `<Scrollbar>`.
