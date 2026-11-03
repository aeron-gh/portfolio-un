---
sidebar_position: 10
title: Roadmap
---

# Roadmap

The shell is done: boot, login, lock, top bar, Quick Settings, dock, windows, Overview, search, notifications,
desktop icons. **[Text Editor](./desktop/text-editor.md)** and the first part of **[Files](./desktop/files.md)** are
built, on the shared [libadwaita kit](./desktop/apps.md). The next work is the rest of Files, then the other apps.

## Next: the apps

Every app not built yet is listed in `src/desktop/apps/registry.ts` with `built: false`. That flag keeps an app out of the
dock, the app grid and search until it works. So the dock order is already right, and once an app works, showing it
is a small change in one file.

| Phase | Apps | Notes |
| --- | --- | --- |
| 1 | **Text Editor** (done), **Files** (browsing and managing done), **Image Viewer**, **Document Viewer** | All four work on the [file system](./desktop/file-system.md). Files comes in three parts: browse and manage (done); search, Recent, Starred, bookmarks, tabs, typing a path and dragging into folders; then Properties, Move to…, Copy to…, the name clash dialog and the file chooser that turns on Text Editor's Save As… |
| 2 | **Terminal** | Looks like Ptyxis, the terminal Ubuntu 26.04 ships, and runs `bash`-like commands on the same file system |
| 3 | **Firefox** | A browser window that looks like Firefox |
| 4 | **Settings**, **Music**, **Help**, **App Center**, **About**, and the screenshot tool | Settings is a window over the settings store that already exists. It adds Privacy → "Reset this computer". App Center lists the projects as apps to install. Music plays the Spotify playlist |

When an app is built, the greyed-out desktop menu items that need it (Show in Files, Open in Terminal, Properties,
Change Background…) turn on too. Real Files has no "Reset" menu item, so putting the files back to the seed waits for
Settings → Privacy. Until then, clearing the site's data in the browser does it.

### Adding an app

See [Apps and the libadwaita kit](./desktop/apps.md#adding-an-app).

## Smaller items

| Item | Now | Ubuntu |
| --- | --- | --- |
| Tile preview and workspace dot animation | Animate `width` | Should animate `transform`, which the browser can do without re-laying-out the page |
| Super+1 … 9 | Reads the dock pins from saved data | Should read the dock's live copy, so a change made a moment ago is always seen |
| Files: long names in the path bar | Scroll | Buttons also shrink, cut in the middle, down to 7 characters |
| Files: previews of PDF files | The file's icon | The first page, from Papers' thumbnailer |
| Files: folder colours | Orange only | Yaru has a folder set for each accent colour; this waits for Settings |
| Text Editor: other languages | Only Markdown is coloured | GtkSourceView also colours shell scripts (`.bashrc`), `.desktop` files and more |
| Text Editor: drafts after logout | Lost | Text Editor restores the last session, unsaved drafts included |
| Text Editor: undo after switching tabs | Gone: the browser keeps one undo list for the whole page, so each tab's text box starts a fresh one | Each tab keeps its own undo history |
| Desktop icons: rubber-band selection | Not built | Drag on empty desktop to draw a box and select the icons inside |
| Desktop icons: Keep Stacked by type | Greyed out | Groups files of one type into a stack |
| Drag and drop between the desktop and windows | Not built | Needs Files first |
