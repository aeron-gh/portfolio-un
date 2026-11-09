---
sidebar_position: 6
title: Matching real Ubuntu
---

# Matching real Ubuntu

The rule for the desktop is: **someone who uses Ubuntu 26.04 every day should not be able to tell it apart from the
real thing.** That means no value is guessed. Every size, colour, delay and label comes from a real source.

## The sources

| What | Source | Version |
| --- | --- | --- |
| Shell behaviour (top bar, Overview, dock clicks, notifications, dialogs, switcher) | GNOME Shell JavaScript (`dateMenu.js`, `appIcons.js`, `endSessionDialog.js`, `switcherPopup.js` …) | 50.1 |
| Shell look (sizes, colours, radii, padding) | The **compiled** Yaru GNOME Shell CSS | Yaru commit `7f18973e` |
| Accent colours | Ubuntu's own patch to GNOME Shell (not upstream GNOME) | 26.04 |
| Keyboard shortcuts | GNOME Shell and mutter keybinding schemas, plus Ubuntu's overrides | 50 |
| Dock | The ubuntu-dock extension's defaults as Ubuntu ships them | 26.04 |
| Files | Nautilus's source with Ubuntu's `debian/patches` applied, `ubuntu-settings`, `xdg-user-dirs-gtk` | 50.2.2 |
| Files search | `localsearch` (what is indexed), `tinysparql` (how words are read and matched), Snowball's English stemmer, SQLite FTS5 (`bm25`, `snippet`) | 3.11.2, 3.11.0, 3.0.1, 3.46.1 |
| Dragging | Mutter (keys, cursor, a drop that does nothing), GTK (scrolling near an edge), libadwaita (drop colours) | 50.1, 4.22.2, 1.9 |
| Desktop icons | Desktop Icons NG (`desktopManager.js`, `askRenamePopup.js`) | 26.04 |
| Desktop right-click menus | The Yaru GTK3 theme | Yaru commit `7f18973e` |
| Icons | Yaru icon theme | Yaru commit `7f18973e` |
| Wallpapers | `ubuntu-wallpapers` package | 26.04.2 |
| `/etc/os-release`, `.bashrc` … | `base-files` and `bash` packages | 14ubuntu6.2, 5.3-2ubuntu1 |

The asset files are downloaded by `scripts/fetch-ubuntu-assets.ts` from **pinned** URLs (an exact commit or package
version). Running it again gives the same files. A source can't change under us.

## How one value gets in

1. **Find it in the source.** For a size, read the compiled CSS for that element. For a behaviour, read the JavaScript
   that does it.
2. **Copy it with a comment that names where it came from.** Anyone can then check it:
   ```ts
   /** click-action 'focus-or-appspread' (appIcons.js): spread only when the app is focused and has 2+ windows. */
   ```
   ```css
   --panel-bg: #131313; /* $yaru_panel_bg_color */
   ```
3. **Pin it with a test.** A unit test for a rule, a browser test for a behaviour, a screenshot for a look.

## Why the compiled CSS, not the source SCSS

Yaru's SCSS (the source the CSS is generated from) is spread over many files, with variables, mixins and overrides
for each Ubuntu flavour. What actually reaches the screen is the compiled `gnome-shell.css`, so values are read from
there.

Even the compiled CSS needs care. One example: a rule written only for left-to-right languages (`:ltr`) was missed
at first, so the Quick Settings tiles got 3 px of left padding instead of 15 px. Since then, direction-specific rules
are always checked too.

## Behaviour, not just looks

Looking right is half of it. Things also have to **behave** like Ubuntu. A few examples:

| Detail | What Ubuntu does |
| --- | --- |
| Clicking a dock app that is focused with 2+ windows | Shows only that app's windows in the Overview |
| Tapping Super | Opens the Overview, but only if no other key was pressed while Super was down |
| Alt+Tab with the pointer resting where the switcher appears | Ignores hover for 500 ms, so the switcher doesn't jump to the window under the pointer |
| Notification banner | Stays 4 s, waits while hovered, leaves 200 ms after the pointer does |
| End-session dialog countdown | 60 s in tens, then each second for the last ten, then it acts |
| Desktop icons | Fill from the bottom-right corner, sorted by name descending (Ubuntu's override) |
| Accent | Ubuntu's own colours, not GNOME's, and not the brand orange `#E95420` |

Each one has a test.

## Screenshot tests

`e2e/desktop-visual.e2e.ts` takes screenshots of 11 surfaces in light and dark, and compares them with saved
baselines: login, lock, the session, a window, Quick Settings, the date menu, the desktop menu, the dock menu, the
Overview, the app grid and the Power Off dialog. Each baseline is checked by eye when it is made.

Fonts render a few pixels differently on other computers, so these tests run only on the machine that made the
baselines. CI skips them. To update them after an intended change:

```bash
bunx playwright test e2e/desktop-visual.e2e.ts --update-snapshots=all
```

Then look at every changed image before you commit it.

## Where the desktop differs on purpose

| Difference | Why |
| --- | --- |
| Some keys (Super, Alt+Tab, Alt+F4) may be taken by your own OS first | A web page can't stop that. Every action has a mouse path, and the full-screen session can lock the keys in Chromium |
| Holding Esc for 2 s leaves full screen | A browser rule |
| World clocks and weather are hidden in the date menu | Ubuntu hides them too when their apps are not installed |
| "New Document" is missing from the desktop menu | Ubuntu hides it too when `~/Templates` is empty |
| Apps show a "no app" dialog | The apps are not built yet, see [Roadmap](./roadmap.md) |
| Files' search does not read what is inside a PDF | Only text and Markdown files have their text here |
| Search filters' "Used" and "Created" dates, and Properties' "Accessed" and "Created", go by when a file last changed, unless Files opened it | A file here keeps one time |
| Properties' access menus, "Executable as Program" and "Change Permissions for Enclosed Files…" are greyed out | Changing permissions comes with Terminal |
| Who owns what in Properties: files 644, folders 755, Home 750; the system belongs to root | The desktop keeps no real permissions; these are Ubuntu's usual values |
| The disk in Properties is 64 GiB, with 11 GB used by Ubuntu | There is no real disk; the values are chosen for this desktop |
| Properties of the Trash folder itself is not offered | What Nautilus shows for `trash:///` is not confirmed |
| **Set Custom Icon** in Properties is greyed out | It needs the file chooser, which comes next |
| When two search engines find the same file, the order of who answers first is fixed | In Ubuntu it depends on which engine is quicker that time |
| Dragging stays inside the page, and files from your own computer cannot be dropped in | The desktop has no access to your files, and the drag looks like GNOME's whatever the system |
| Ctrl over the Trash still trashes | What the real Trash does with a copy dropped on it is not confirmed |
