---
sidebar_position: 9
title: File system
---

# The file system

The desktop has one file tree. The desktop icons and search use it now. Files, Terminal and Text Editor will use the
same tree when they are built.

| File | Job |
| --- | --- |
| `fs/seed.ts` | Builds the starting tree **at build time** from `profile.ts`, the GitHub data and real Ubuntu files |
| `fs/system/` | Real Ubuntu 26.04 files copied in by the asset script (`os-release`, `lsb-release`, `issue`, `skel/` dotfiles) |
| `fs/vfs.ts` | The tree itself: paths, reading, writing, copy, move, Trash, watching for changes |
| `fs/fs.svelte.ts` | The single shared copy, and a counter that goes up on every write |

## Seed plus overlay

Think of it as a printed book plus sticky notes.

- The **seed** is the book. It is built once, when the site is built, and written into the page.
- The **overlay** is the sticky notes. It is a list of the visitor's changes: `path → new node`, or `path → null` for
  a deleted file. It is saved in `localStorage` under `ubuntu.fs.v1`.
- On load, the overlay is replayed on top of the seed.

Why this way? When the seed changes (a new project, new GitHub numbers), the visitor's own files are not lost. Only
the paths they touched are stored, so the saved data stays small.

If the saved overlay is damaged (bad JSON, or one bad entry), the whole overlay is thrown away and replaced with an
empty one. The visitor gets one notification from GNOME's "System" source, so the reset is not silent. One bad entry
throws everything away on purpose: a bad entry would otherwise crash every visit at login.

## What is in it

```text
/
├── etc/            os-release, lsb-release, issue, hostname, hosts (read-only)
├── home/ubuntu/
│   ├── Desktop/        README.md, Resume.pdf (when there is a resume)
│   ├── Documents/      about.md, skills.md, contact.md
│   ├── Downloads/  Music/  Public/  Templates/  Videos/
│   ├── Pictures/       abhishek.avif, Wallpapers/
│   ├── Projects/       one folder per project: README.md and a link file
│   ├── Open-Source/    one file per project, listing merged pull requests
│   ├── snap/firefox/
│   ├── .bashrc  .profile  .bash_logout
│   └── .config/  .cache/  .local/share/Trash/
├── root/           "Permission denied"
├── tmp/            writable
└── bin, boot, dev, lib, media, mnt, opt, proc, snap, srv, sys, usr, var  (empty, read-only)
```

The text in `about.md`, `skills.md`, `contact.md`, the project READMEs and the open-source files comes from the same
`profile.ts` the homepage uses. Each site has one source of truth.

Links to web pages are stored as **freedesktop link files** (`Name.desktop` with `Type=Link`). That is how GNOME stores
a shortcut to a web page.

## Nodes

Each file or folder is an `FsNode`:

| Field | Meaning |
| --- | --- |
| `kind` | `dir`, `file` or `link` |
| `content` | Text of a text file |
| `url` | For images, PDFs and links: where the real bytes live |
| `size`, `mtime`, `mime` | Shown by Files and used for sorting |
| `readonly` | Nothing can be created, changed or removed here |
| `denied` | Listing or reading gives "Permission denied" |
| `origin` | For items in the Trash: where they came from |

## Rules

- Errors use Unix names: `ENOENT` (not found), `EEXIST`, `ENOTDIR`, `EISDIR`, `EACCES` (permission), `EINVAL`.
- Only things inside `/home/ubuntu` can be trashed. Trash lives at `~/.local/share/Trash/files`, as on Ubuntu.
  **Restore** puts an item back where it came from.
- A copy is always the visitor's own, never read-only, even when copied from a read-only place.
- Listings sort like GNOME Files: folders first, dotfiles last in each group, then natural order (`2` before `10`).
  Terminal's `ls` will sort differently, the way `ls` does.
- `watch(path, fn)` calls `fn` when `path` or anything inside it changes. The desktop icons use this, so a new file
  in `~/Desktop` appears at once.

## Using it from code

```ts
import { fs } from '../fs/fs.svelte';

fs().write('/home/ubuntu/Desktop/note.txt', 'hello');
fs().list('/home/ubuntu/Desktop');   // FsNode[]
fs().trash('/home/ubuntu/Desktop/note.txt');
```

`fs()` throws if the desktop has not started yet. That makes a wrong load order fail loudly instead of quietly
reading an empty tree.
