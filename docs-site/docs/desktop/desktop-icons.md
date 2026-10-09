---
sidebar_position: 8
title: Desktop icons
---

# Desktop icons

Ubuntu draws desktop icons with the **Desktop Icons NG** extension (DING). This page copies DING's rules.

| File | Job |
| --- | --- |
| `shell/DesktopIcons.svelte` | The icons, selection, drag, keys and the actions behind the menus |
| `shell/desktop-grid.ts` | The grid maths: cell size, fill order, nearest free cell, arrow-key neighbour |
| `shell/desktop-arrange.ts` | Sort orders and the saved "Arrange By" settings |
| `shell/desktop-menu.ts` | The right-click menus, new-folder names, copy names and name checks (loaded on first use) |
| `shell/GtkMenu.svelte` | A GTK3-style menu at the pointer, with submenus, check and radio items |
| `shell/RenamePopover.svelte` | The rename box under an icon |
| `shell/clipboard.svelte.ts` | Files cut or copied on the desktop, waiting for Paste |

## What is on the desktop

**Home** first, then everything in `~/Desktop` (the `README.md`, and `Resume.pdf` when the build has a resume). The
desktop reads from the same [file system](./file-system.md) as everything else. A file made in `~/Desktop` shows up as
an icon at once.

## The grid

- Each cell is **96 × 112 px**, with an 8 px margin around the grid.
- Icons fill from the **bottom-right corner**: up the rightmost column first, then the next column to the left.
- Drag an icon and it lands on the free cell nearest to where you dropped it. A move under 4 px counts as a click.
- After a drag, every icon's cell is saved (`ubuntu.desktop-icons.v1`), so the other icons stay where they are.
- If a saved cell no longer fits the screen (a smaller window), it is skipped, and that icon flows back into the grid.

## Selecting

| Do this | Result |
| --- | --- |
| Click an icon | Selects only that icon |
| Ctrl+click or Shift+click | Adds or removes that icon |
| Click empty desktop | Clears the selection |
| Ctrl+A | Selects all |
| Esc | Clears the selection |
| Arrow keys | Moves to the nearest icon in that direction, preferring the same row or column |

## Keys

| Key | Action |
| --- | --- |
| Enter, double-click | Open |
| Ctrl+C, Ctrl+X, Ctrl+V | Copy, cut, paste |
| Delete | Move to Trash |
| F2 | Rename |
| Ctrl+Shift+N | New folder |
| Menu key, Shift+F10 | The right-click menu for the selection |

Home can never be cut, copied, renamed or trashed, just like on Ubuntu.

## Right-click on empty desktop

New Folder · Paste · Select All · **Arrange Icons** · **Arrange By…** (Keep Arranged, Keep Stacked by type, Sort
Home/Drives/Trash, then Sort by Name, Name Descending, Modified Time, Type, Size) · Show Desktop in Files · Open in
Terminal · Change Background… · Desktop Icons Settings · Display Settings.

Items that need an app that is not built yet are shown greyed out, the same way GTK shows an unavailable action. New
Document is left out, because Ubuntu only shows it when `~/Templates` has templates, and it is empty.

**Keep Stacked by type** stays off and greyed out. Stacking is not built.

## Right-click on icons

Open (or Open All… for several) · Open With Other Application · Cut · Copy · Rename… · Move to Trash · Send to… ·
Compress · **New Folder with N items** · Properties · Show in Files · Open in Terminal (one folder only).

## Names

These follow Nautilus and DING exactly:

| Situation | Name |
| --- | --- |
| New folder | `New Folder`, then `New Folder 1`, `New Folder 2` … |
| Paste a copy next to the original | `README (Copy).md`, then `README (Copy 2).md` |
| Copy of a copy | Counts on: `README (Copy 2).md` → `README (Copy 3).md` |
| Rename is accepted when | The name is not empty, has no `/`, and is not taken |

When the rename box opens, only the part before the extension is selected (`README` in `README.md`). Folders and
dotfiles select the whole name.

## Arranging

| Choice | What it does |
| --- | --- |
| **Arrange Icons** | Packs the icons back into the grid, keeping their current order |
| A **Sort by …** order | Re-arranges the icons in that order at once (as DING does) |
| **Keep Arranged** | Keeps the icons in the chosen order after every change. Icons can't be dragged, and "Arrange Icons" is greyed out |
| **Sort Home/Drives/Trash** | Lets Home be sorted with the rest. When off, Home keeps its own place |

Ubuntu's default order is **Sort by Name Descending** (Ubuntu overrides DING's default). The choices are saved in
`ubuntu.desktop-arrange.v1`.

## Opening

The real apps (Files, Text Editor, Document Viewer …) are not built yet. For now, opening any icon shows a small
dialog that says no app can open it. It looks like GNOME's own dialog. It keeps keyboard focus inside itself, and Esc
gives focus back to the icon.
