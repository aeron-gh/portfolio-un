---
sidebar_position: 3
title: Window manager
---

# Window manager

The model is `wm/windows.ts` (pure, unit-tested); the live state and animations are in `wm/wm.svelte.ts`;
`wm/Window.svelte` draws one window.

## Windows

| Action | Behaviour |
| --- | --- |
| Open | Centred in the work area; later windows cascade by 30px. Animation: 150 ms, growing from the bottom centre. |
| Move | Drag the header bar. At least 40px of the header always stays inside the work area. |
| Resize | Drag any edge or corner, never below the app's minimum size. |
| Maximise | Header button, double-click the header, **Super+Up**. A morph animation (250 ms). |
| Minimise | Header button or **Super+H**. The window flies into its dock icon (400 ms). |
| Close | Header button or **Alt+F4** (150 ms fade and shrink). |

The work area is the screen minus the 32px top bar and the 66px dock. When the browser window shrinks, every window
is pulled back inside, and maximised or tiled windows re-fit.

The frame copies libadwaita: 15px corners, a 47px header bar, round minimise / maximise / close buttons on the right,
and dimmed contents in windows that are not focused.

## Tiling (Ubuntu's Tiling Assistant)

Drag a window to an edge and release:

| Edge | Result |
| --- | --- |
| Left / right | Left or right half |
| Corners | Quarters |
| Bottom | Bottom half |
| Top | Maximise; hold for 600 ms to get the top half instead |

**Super+Left** / **Super+Right** tile from the keyboard. After tiling, a **tiling popup** offers the other windows for
the free half (Tab, Shift+Tab or the arrows to choose, Enter to place, Esc to skip).

## Focus and stacking

Clicking a window raises and focuses it; keyboard focus goes into it. Closing or minimising the focused window focuses
the next one in stacking order.

## Workspaces

Workspaces are dynamic, as on Ubuntu: there is always one empty workspace at the end. Switch with **Super+Page Up/Down**
or **Ctrl+Alt+Left/Right**; move the focused window with **Super+Shift+Page Up/Down**. The top bar's dots show the
workspaces; the active one is wider.

## Switchers

| Keys | Switches between |
| --- | --- |
| **Alt+Tab** | Windows on this workspace, most recent first |
| **Super+Tab** | Apps on every workspace |
| **Alt+\`** | Windows of the current app |

A quick press and release switches straight to the previous window; holding the modifier shows the popup after
150 ms. Tab / Shift+Tab move, releasing the modifier picks, Esc cancels. The pointer is ignored for 500 ms after the
popup appears, so a popup that opens under the mouse does not jump to the item there.
