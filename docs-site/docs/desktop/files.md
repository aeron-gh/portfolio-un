---
sidebar_position: 15
title: Files
---

# Files

A copy of **Files (Nautilus) 50.2.2**, the version a fully updated Ubuntu 26.04 runs (package `1:50.2.2-0ubuntu0.2`).
Layouts, sizes, wording and rules come from its source, with Ubuntu's patches applied, and from libadwaita 1.9.

Ubuntu is not the same as upstream GNOME here. These come from Ubuntu, not from Nautilus's own code:

| Detail | Where it comes from |
| --- | --- |
| Folder icons start at 48 px (GNOME: 96 px) | `ubuntu-settings` sets `icon-view default-zoom-level` to `small` |
| Backspace goes up a folder | `ubuntu_backspace_behaviour.patch` |
| "Open in Terminal", not "Open in Console" | `files-view-Add-xdg-terminal-exec-action.patch`, on in `debian/rules` |
| The sidebar's Documents, Music, Pictures, Videos, Downloads, in that order | `xdg-user-dirs-gtk` writes them as bookmarks for a new account |

| File | Job |
| --- | --- |
| `Files.svelte` | The window: the two panes, where you are, the shortcuts, what the menus do |
| `FileView.svelte` | The grid and list: selecting, the rubber band, column headers |
| `Sidebar.svelte`, `PathBar.svelte`, `ViewControls.svelte`, `FloatingBar.svelte` | The parts around the view |
| `NewFolderDialog.svelte`, `RenameFilePopover.svelte` | Naming things |
| `session.svelte.ts` | What every window shares: settings, and where each window is |
| `undo.svelte.ts` | The one operation that can be undone or redone, shared by every window |

The rules are plain TypeScript with unit tests:

| File | Rules |
| --- | --- |
| `sort.ts` | The order of items |
| `format.ts` | How a size or a date is worded |
| `selection.ts` | Clicks, Shift, Ctrl, arrow keys |
| `history.ts` | Back and Forward |
| `places.ts` | Sidebar rows, path bar buttons, window titles |
| `menus.ts` | What each right-click menu holds, and when an item is off |
| `names.ts` | Whether a name can be used, and where its extension starts |
| `operations.ts` | Trash, restore, rename, paste, each with its Undo |
| `status.ts` | The floating bar's words |
| `ellipsize.ts` | Cutting a long name in the middle |

## What works, and what is greyed out

| Works | Greyed out until its part exists |
| --- | --- |
| Sidebar, path bar, Back and Forward (with their right-click lists), Up and Down | **New Tab**, **Open in New Tab**: tabs |
| Grid and list, sorting, zoom, hidden files, image previews | **Search**, **Recent** and **Starred** pages stay empty |
| Selecting: click, Ctrl, Shift, keys, rubber band | **Move to…**, **Copy to…**, **Properties**, **About Files** |
| New Folder, rename, cut, copy, paste, Paste Into Folder | **Open With…**, **Open in Terminal**, **Compress…** |
| Trash, restore, delete, Empty Trash, Undo and Redo | **Set as Background…**, **Captions…**, **Visible Columns…**, **Preferences**, **Keyboard Shortcuts**, **Help** |
| The narrow layout below 682 px | **Add to Bookmarks**, **Star Folder**, the star column |

Network shows its real "No Known Connections" page. **Email…** is hidden, as on a real system with no mail app.

## Behaviour worth knowing

- **Sorting.** Folders come first, even when reversed. Numbers compare as numbers. A dot sorts below every other
  character, so `README.md` comes before `README-old.md`. Names starting with `.` or `#` go after everything else. Each
  folder keeps its own sort. The Trash always opens with the last trashed first.
- **Dates.** ICU's wording, cut down and never rounded: "Today, 09:05", "Yesterday, 23:59", "3 days ago", "Last week",
  "2 weeks ago", "Last month", "2 years ago". A file exactly 365 days old says "This year", as the real one does.
- **Selecting.** Selected items are grey, not the accent colour (`--accent-bg-color: #959595` in Nautilus's own
  stylesheet). Going to a parent folder, by any route, selects the folder you came from.
- **Hidden files** have a faded icon; their names stay at full strength. They sort after everything else.
- **The floating bar** waits 200 ms before changing, so a double-click does not flash it, and steps aside while the
  pointer is over it.
- **Opening a folder from outside** (the desktop's Home icon) reuses a window already showing it, or else opens a new one.
- **A file in the Overview's search results** opens with its default app, as a double-click does
  (`handle_activate_result`).
- **The Trash** has nothing above it (`trash:///` has no parent), and nothing inside a trashed folder can be changed until
  it is restored.
- **Ctrl+0** goes to the standard zoom, 96 px: bigger than the 48 px Ubuntu starts at.
- **A cut file's icon** becomes a dashed outline with scissors. Copying and cutting share one clipboard with the desktop.
- **Undo** remembers one operation, shared by all windows. A Trash toast's Undo button does the same as Ctrl+Z.
- **Names that clash when pasting** get Nautilus's "(Copy)" form, so nothing is lost. The real conflict dialog comes with
  Move to… and Copy to…. Saving over a name in `~/Documents` from Text Editor is a different case: see
  [Text Editor](./text-editor.md).

## Shortcuts

| Keys | Action |
| --- | --- |
| Alt+Left, Alt+Right | Back, Forward |
| Alt+Up or Backspace, Alt+Down | Up a folder, back down |
| Enter or Ctrl+O | Open |
| F2 | Rename |
| Ctrl+Shift+N | New Folder |
| Ctrl+X, Ctrl+C, Ctrl+V | Cut, copy, paste |
| Delete, Shift+Delete | Move to Trash, delete for good (asks first) |
| Ctrl+A, Ctrl+Shift+I, Esc | Select all, invert, select nothing |
| Ctrl+Z, Ctrl+Shift+Z | Undo, redo |
| Ctrl+1, Ctrl+2 | List, grid |
| Ctrl+H | Show hidden files |
| Ctrl++ / Ctrl+− / Ctrl+0 | Zoom in, out, standard |
| Ctrl+N | New window at the same place |
| Menu or Shift+F10 | The right-click menu |
| F9 | Show the sidebar (narrow layout only) |

## Saved data

`ubuntu.files.v1` holds the view, the two zoom levels, hidden files and each folder's sort. The files themselves live in
the desktop's [file system](./file-system.md).
