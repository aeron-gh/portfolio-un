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
| `Files.svelte` | The window: the two panes, the tabs, where you are, the shortcuts, what the menus and drops do |
| `FileView.svelte` | The grid and list: selecting, the rubber band, column headers, stars, dragging items |
| `Sidebar.svelte`, `PathBar.svelte`, `ViewControls.svelte`, `FloatingBar.svelte` | The parts around the view |
| `LocationEntry.svelte` | Typing a path, with completion |
| `SearchEntry.svelte`, `SearchFilters.svelte` | The search entry and its filters (the filters load when first opened) |
| `NewFolderDialog.svelte`, `RenameFilePopover.svelte`, `RenameBookmarkPopover.svelte` | Naming things |
| `Properties.svelte`, `PropertiesDialog.svelte`, `PropertiesWindow.svelte` | Properties: its pages, in a dialog over the window or in a window of its own (loaded when first opened) |
| `AboutFiles.svelte` | About Files (loaded when opened) |
| `slot.svelte.ts` | One tab: its place, history, selection and search |
| `session.svelte.ts` | What every window shares: settings, and where each window is |
| `undo.svelte.ts` | The one operation that can be undone or redone, shared by every window |
| `drag.ts`, `dnd.ts` | Dragging: what each part of a window says about a drop, and the drag itself (`dnd.ts` loads on the first press) |

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
| `operations.ts` | Trash, restore, rename, paste, starring, each with its Undo |
| `status.ts` | The floating bar's words |
| `ellipsize.ts` | Cutting a long name in the middle |
| `tabs.ts` | Where a new tab goes, which tab comes up when one closes |
| `location.ts` | What a typed path means, and its completions |
| `bookmarks.ts` | The bookmarks: adding, moving, renaming, following a folder that moves |
| `query.ts`, `search.ts`, `stem.ts` | What a search finds and in what order (`search.ts` and `stem.ts` load when first needed) |
| `drop.ts` | What a drop does, and which action the keys pick |
| `properties.ts` | What Properties says about the items, and which lines it shows |

## What works, and what is greyed out

| Works | Greyed out until its part exists |
| --- | --- |
| Sidebar, path bar, Back and Forward (with their right-click lists), Up and Down | **Move to…**, **Copy to…** |
| Grid and list, sorting, zoom, hidden files, image previews | **Open With…**, **Open in Terminal**, **Compress…** |
| Selecting: click, Ctrl, Shift, keys, rubber band | **Set as Background…**, **Captions…**, **Visible Columns…** |
| New Folder, rename, cut, copy, paste, Paste Into Folder | **Preferences**, **Keyboard Shortcuts**, **Help** |
| Trash, restore, delete, Empty Trash, Undo and Redo | **Search Settings**, and the filters' **Specific Type** and **Custom Date Range** |
| Tabs, typing a path, bookmarks, Starred, Recent | **File History Settings…**, **Trash Settings…** |
| Search, Search Everywhere and the filters; drag and drop | In Properties: changing permissions, **Set Custom Icon**, **Open in Disks** |
| Properties, and its own window; About Files | |
| The narrow layout below 682 px | |

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
- **Names that clash when pasting or dropping** get Nautilus's "(Copy)" form, so nothing is lost. The real conflict
  dialog comes with Move to… and Copy to…. Saving over a name in `~/Documents` from Text Editor is a different case:
  see [Text Editor](./text-editor.md).
- **Tabs** open after the tab they came from, and its own tabs (AdwTabView's rule). Closing one brings up the one before
  it if that came from the same tab, or else the next. Opening a folder in a new tab leaves it behind the current one.
- **Bookmarks** follow their folder when it is renamed or moved. A drop of one folder on the sidebar shows a **New
  bookmark** row at the top of the bookmarks; a bookmark can be dragged to another place among them.
- **Recent** lists the files opened from Files, the last first. **Starred** takes items inside Home only.
- **Search** begins when you type in the view. Four engines look at once, as in the real one: the folder you are in,
  recent files, an index of Home, and every folder below. The index finds whole words, and the start of the last word
  typed; words are cut to their English root (Snowball 3.0.1, as `localsearch` runs it), so "reports" finds `report.txt`.
  It also reads what is inside text and Markdown files, and shows the match in **Full Text Match**. Results are ranked
  as `nautilus-search-hit.c` ranks them: nearer first, then newer, then the better match (SQLite's bm25).
- **Properties** is a dialog over the window, 480 px wide, as in Nautilus 50. Its button at the top right moves it into
  a window of its own, as tall as what it shows; desktop icons open that window directly. A folder's contents are
  counted all the way down, as `g_format_size` writes them. Free space comes from the desktop's disk: 64 GiB, of which
  Ubuntu takes 11 GB (values chosen for this desktop). Home belongs to `ubuntu`; the system and anything that cannot be
  opened belong to `root`. **/** is shown as the computer, named Ubuntu, with its disk.
- **Search Everywhere** (Ctrl+Shift+F) searches the index only: all of Home but hidden files.
- **Dragging** moves on the same disk and copies what cannot be removed from where it is. **Shift** moves, **Ctrl**
  copies (a copy into the same folder is a duplicate), **Esc** cancels and the picture slides back. Holding a drag over a
  folder, a sidebar row, a path bar button or a tab for half a second opens it. A drop on **Starred** stars, on **Trash**
  trashes. What arrives in the folder a tab shows is selected there.

## Shortcuts

| Keys | Action |
| --- | --- |
| Alt+Left, Alt+Right | Back, Forward |
| Alt+Up or Backspace, Alt+Down | Up a folder, back down |
| Alt+Home | Home |
| Enter or Ctrl+O | Open |
| F2 | Rename |
| Ctrl+Shift+N | New Folder |
| Ctrl+X, Ctrl+C, Ctrl+V | Cut, copy, paste |
| Delete, Shift+Delete | Move to Trash, delete for good (asks first) |
| Ctrl+A or Ctrl+/, Ctrl+Shift+A or Ctrl+\\, Ctrl+Shift+I | Select all, select nothing, invert |
| Ctrl+Z, Ctrl+Shift+Z | Undo, redo |
| Ctrl+1, Ctrl+2 | List, grid |
| Ctrl+H | Show hidden files |
| Ctrl++ / Ctrl+− / Ctrl+0 | Zoom in, out, standard |
| F5 or Ctrl+R | Reload |
| Ctrl+N | New window at the same place |
| Ctrl+T, Ctrl+Shift+T, Ctrl+W | New tab, bring back a closed tab, close the tab |
| Ctrl+Page Up / Page Down, with Shift | The tab before or after; with Shift, move the tab |
| Alt+1 … 9 | That tab |
| Ctrl+L, or / or ~ | Type a path |
| Ctrl+D | Bookmark the folder |
| Ctrl+I or Alt+Enter | Properties of the selection, or of the folder |
| Typing, Ctrl+F | Search this folder |
| Ctrl+Shift+F | Search everywhere |
| Esc | Leave the search |
| Shift, Ctrl, Esc while dragging | Move, copy, cancel |
| Menu or Shift+F10 | The right-click menu |
| F9 | Show the sidebar (narrow layout only) |

## Saved data

`ubuntu.files.v1` holds the view, the two zoom levels, hidden files, each folder's sort, the bookmarks, the starred items,
the recent files, and the search filters' date type and text matching. The files themselves live in the desktop's
[file system](./file-system.md).
