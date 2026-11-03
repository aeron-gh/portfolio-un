---
sidebar_position: 10
title: Keyboard shortcuts
---

# Keyboard shortcuts

The shortcuts are Ubuntu 26.04's defaults: GNOME Shell 50's keybindings, the window manager's defaults, and Ubuntu's
own overrides.

| File | Job |
| --- | --- |
| `system/shortcuts.ts` | A table from key to action, plus the "tap Super" rule. Pure, unit-tested |
| `shell/Keyboard.svelte` | Listens for keys and runs the action |

## How a key becomes an action

`actionFor(event)` builds a short code from the modifiers, always in the same order: **S** = Super, **C** = Ctrl,
**A** = Alt, **s** = Shift. Then it adds the key's `code`. So Super+Shift+Page Down becomes `"Ss PageDown"`, and the
table maps that to `move-next`.

It uses `event.code` (the physical key), not `event.key` (the letter). Shortcuts then stay on the same keys on any
keyboard layout, as they do in GNOME.

## The shortcuts

### Shell

| Keys | Action |
| --- | --- |
| Tap **Super** | Open or close the Overview |
| Super+A | Show the app grid |
| Super+S | Quick Settings |
| Super+V, Super+M | Date menu and notifications |
| Super+L | Lock the screen |
| Ctrl+Alt+Delete | Log Out dialog |
| Super+1 … Super+9 | Open or focus the n-th dock app |
| Super+Ctrl+1 … 9 | Open a new window of the n-th dock app |

**Tap Super** means Super goes down and comes back up with no other key in between. Super+A does not open the
Overview, because another key was pressed in the middle. This is mutter's "overlay key" rule
(`createOverlayKey()`).

### Windows

| Keys | Action |
| --- | --- |
| Super+Up | Maximize |
| Super+Down, Alt+F5 | Unmaximize |
| Alt+F10 | Toggle maximize |
| Super+H | Minimize |
| Alt+F4 | Close |
| Super+Left, Super+Right | Tile to the left or right half |
| Super+D, Super+Ctrl+D, Ctrl+Alt+D | Show the desktop (hide all windows) |

### Switching

| Keys | Action |
| --- | --- |
| Alt+Tab, Alt+Shift+Tab | Switch windows (Ubuntu switches windows, not apps, with Alt+Tab) |
| Super+Tab, Super+Shift+Tab | Switch apps |
| Super+Grave or Alt+Grave (Grave is the key above Tab), and with Shift | Switch between windows of the same app |

While the switcher is open: **Tab** or **→** moves forward, **Shift+Tab** or **←** moves back, **Enter** picks,
**Esc** cancels. Letting go of Alt or Super picks the selected window.

### Workspaces

| Keys | Action |
| --- | --- |
| Super+Page Up / Page Down | Previous or next workspace |
| Super+Alt+← / → | Previous or next workspace |
| Ctrl+Alt+← / → | Previous or next workspace |
| Super+Shift+Page Up / Page Down | Move the focused window to the previous or next workspace |
| Super+Alt+Shift+← / → | Move the focused window |
| Ctrl+Alt+Shift+← / → | Move the focused window |

## When keys do nothing

| Situation | Why |
| --- | --- |
| Boot, login and lock screens | Only the session runs shortcuts. The lock screen sits on top of a live session |
| An end-session dialog is open | GNOME's modal grab takes every key. Only the dialog's own keys work: Tab, Enter and Esc |
| A menu or popup is open | The [layer stack](./architecture.md#overlays-and-the-keyboard) gives keys to the top layer first |

## Keys the browser or your OS takes first

A web page can't see some keys. Your own OS may use Super, Alt+Tab or Alt+F4 before the browser gets them. Two things
help:

1. **Every action has a mouse path too.** Alt+Tab has the Overview, Alt+F4 has the close button, and so on.
2. **The "Ubuntu (full screen)" session.** Pick it with the **Choose Session** button next to the password box. It uses the browser's full-screen
   mode plus the **Keyboard Lock API**, so Super, Alt+Tab and Esc reach the desktop. This works in Chromium browsers.
   Other browsers get full screen only. Holding Esc for 2 seconds leaves full screen. That is a browser rule, not ours
   to change. The choice is saved in `ubuntu.session.v1`.

## In apps

Apps have their own shortcuts: [Text Editor's](./text-editor.md#shortcuts) and [Files'](./files.md#shortcuts).

## Embedded on the homepage

When the desktop runs inside the homepage (`?embed=1`), **Esc** on a quiet session hands control back to the homepage.
"Quiet" means no menu, popup or dialog is open and you are not typing in a box. Esc on the login screen's user list
does the same. See [The Ubuntu machine](../homepage/the-ubuntu-machine.md).
