---
sidebar_position: 3
title: Command menu and keys
---

# Command menu and keys

## Keys on the homepage

| Key | Action |
| --- | --- |
| **Ctrl K** (or **⌘ K**) | Open the command menu |
| **U** | Boot the Ubuntu machine |
| **Esc** | Close the command menu, or leave the booted desktop |

The keys are wired by `src/scripts/shortcuts.ts`, which is always loaded and very small. The command menu itself
(`src/scripts/command-menu.ts`) is loaded on first use, so it costs nothing until someone presses Ctrl K. If the
visitor types right after Ctrl K while the menu code is still loading, the typed text still goes into the menu.

## Commands

| Command | Does |
| --- | --- |
| Boot Ubuntu machine | Same as **U** |
| Copy email | Copies the email; falls back to "Press Ctrl C to copy" when the clipboard is blocked |
| Download resume | Shown only when a résumé PDF exists |
| Go to Open source / Building / Contact | Scrolls to the section |
| Theme: System / Light / Dark | Sets the theme |
| Open GitHub / LinkedIn / … | One command per profile link |

Matching is fuzzy (`src/lib/fuzzy.ts`): letters in order, with bonuses for word starts and consecutive letters.
