---
sidebar_position: 5
title: Overview, search and app grid
---

# Overview, search and app grid

## Opening it

| Way | Opens |
| --- | --- |
| **Super** (press and release) | The window picker |
| The workspace dots in the top bar | The window picker |
| **Super+A** or **Show Apps** in the dock | The app grid |

Ubuntu turns off GNOME's top-left hot corner, so moving the mouse there does nothing (as on real Ubuntu).

## Window picker

The real windows shrink into their places (they are the live windows, transformed, not copies), with a 250 ms
animation. Hover shows the title and a close button; click a window to focus it; drag a window onto a workspace
thumbnail to move it there. Workspace thumbnails appear when there is more than one workspace in use.

## Search

Start typing anywhere in the Overview and the text goes into the search entry ("Type to search"). App results come
first, then one section per search provider, at most 5 rows each. Search providers belong to apps (files need Files,
settings need Settings), so until those apps exist only app results show. Esc clears the search first, then closes the
Overview.

## App grid

- **10 columns × 3 rows** of 64px icons on wide screens (what the real 26.04 shows), 8 columns below 1200px, smaller
  icons below 900px.
- Pages with dots below; scroll or drag to change page (400 ms).
- Folders open as a dialog. Drag an icon to reorder it; the order is saved (`ubuntu.app-grid.v1`) and broken saved
  data falls back to the default order.
- Apps that are not built yet are hidden.
