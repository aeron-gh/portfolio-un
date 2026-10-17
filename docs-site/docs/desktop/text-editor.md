---
sidebar_position: 14
title: Text Editor
---

# Text Editor

A copy of **GNOME Text Editor 50.1**, the version Ubuntu 26.04 ships (package `gnome-text-editor 50.1-2`). Every
label, size and rule comes from its source (`editor-window.ui`, `editor-page.c`, `editor-search-bar.c` …),
libadwaita 1.9 and GtkSourceView 5.

| File | Job |
| --- | --- |
| `TextEditor.svelte` | The window: header bar, tabs, pages, menus, dialogs |
| `session.svelte.ts` | Open windows and documents, saving, recent documents, the app's own settings |
| `document.ts` | How a document is named: title, folder, `[Read-Only]`, the draft title |
| `markdown.ts` | Markdown highlighting, as GtkSourceView's `markdown.lang` does it |
| `find.ts` | Finding and replacing |
| `recents.ts` | Ranking and saving recent documents |
| `OpenPopover`, `SearchBar`, `SaveChangesDialog`, `ThemeSelector` | The parts of the window with their own rules |

## What works, and what is greyed out

| Works | Greyed out, and why |
| --- | --- |
| Opening files from the desktop or the Open ▾ list | **Save As…** and **Open New Document**: they need the file chooser, which comes with Files |
| Markdown colours, editing, saving (Ctrl+S) | **Print…**, **Preferences**, **Keyboard Shortcuts**, **Fullscreen**, **Document Properties** |
| Tabs, the tab menu, Move to New Window | **Troubleshooting** in About: its page lists exact package versions that are not known here |
| Find/Replace with the three search options | |
| "Save Changes?" when closing, Discard Changes | |
| The theme picker, zoom, About | |

## Behaviour worth knowing

- **Titles.** The window is called `README.md (~/Desktop) - Text Editor`. A new draft is "New Document" until it has
  text, then it takes its first words as its title.
- **One copy per file.** Opening a file that is already open brings its tab forward.
- **Recent documents.** The Open ▾ list shows recently used files that are **not** open, newest first. A file leaves
  the list while its tab is open and comes back when the tab closes. Typing ranks the list the way Text Editor does: a
  prefix of the name or folder first, then any part of it, then a fuzzy match.
- **Theme.** The theme picker changes Text Editor's windows only. The rest of the desktop keeps its own style.
- **Zoom.** Each step adds 1 point to the 11 pt Ubuntu Sans Mono (Ubuntu's default monospace font). Each tab keeps its
  own zoom.
- **Colours.** The header and the page keep libadwaita's normal colours. Text Editor only recolours its window for
  schemes other than Adwaita.

## How the colours work

A text box cannot colour parts of its own text. So the coloured text sits in a layer **behind** a see-through text
box. The text box still does everything a text box should: the caret, selection, undo, spell check and screen readers.
For the colours to stay exactly under the letters, both use the same font, padding and wrapping, and scroll together.
A browser test checks that they have the same size and scroll position.

The Markdown rules are the regexes from GtkSourceView's `markdown.lang`, in the same order. At each point the earliest
match wins, and among equals the one listed first. The colours are the Adwaita style scheme's.

## Find/Replace

The bar slides up from the bottom (Ctrl+F, or Find/Replace… in the menu). Selected text becomes the search.

| Key | Does |
| --- | --- |
| Typing | Counts and highlights the matches; the first one after the cursor scrolls into view |
| ↓ / ↑ | Next / previous match, wrapping round |
| Enter | Takes the next match and closes the bar |
| Esc | Puts the cursor back where it was and closes the bar |

## Shortcuts

| Keys | Action |
| --- | --- |
| Ctrl+S | Save |
| Ctrl+F | Find/Replace |
| Ctrl+K | Open ▾ |
| Ctrl+T, Ctrl+W | New tab, close tab |
| Ctrl++ / Ctrl+− / Ctrl+0 | Zoom in, out, reset |
| Shift+Ctrl+Alt+Page Up / Down | Move the tab left or right |
| Shift+Ctrl+N | Move the tab to a new window |

A normal browser keeps Ctrl+T, Ctrl+W and Ctrl+N for itself. The buttons and menus do those jobs, and the full-screen
session passes the keys through.

## Saved data

`ubuntu.text-editor.v1` holds the theme choice and the recent documents. The files themselves live in the desktop's
[file system](./file-system.md).
