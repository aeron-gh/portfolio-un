---
sidebar_position: 4
title: The Ubuntu machine
---

# The Ubuntu machine

The homepage can turn into a full Ubuntu desktop and back, without leaving the page.

## What the visitor sees

1. They press **U**, click the **Boot** pill or click the miniature.
2. The miniature grows to fill the screen (800 ms), and the real desktop boots inside it: the Ubuntu boot screen, then
   the login screen.
3. They log in (click the user, press Enter; there is no password) and use the desktop.
4. **Esc** on a quiet desktop (no menu or dialog open, not typing), on the login screen, or **Power Off** shrinks the
   machine back into the page. Focus returns to where it was.

On phones (no hover, or narrower than 720px) the machine shows a hint instead: the desktop is made for a keyboard and
a mouse.

## How it works

The homepage side is `src/scripts/machine.ts`; the desktop side is `src/desktop/embed.ts`. The desktop runs in an
iframe at `/desktop/?embed=1`, on the same origin, and the two talk with `postMessage`:

| Message | From | Meaning |
| --- | --- | --- |
| `desktop:ready` | desktop | The desktop has mounted; the homepage can drop its loading state. |
| `desktop:exit` | desktop | Esc on a quiet desktop or the login screen, or Power Off: please shrink back. |

The homepage checks `event.origin` on every message and ignores anything else.

While the desktop is open the page behind it is made `inert` and stops scrolling, so screen readers and the Tab key
stay inside the desktop. If the desktop does not say `desktop:ready` within 8 seconds, an error panel offers a retry.

## Prefetching

The homepage adds one `<link rel="prefetch">` for the desktop page, so booting feels instant. It does this the first
time the pointer enters a boot control, or 3 seconds after the page has loaded, whichever comes first. It never
prefetches on small screens or when the browser asks to save data (`Save-Data`).

## Full-screen session

On the login screen, the gear button offers **Ubuntu (full screen)**. It uses the Fullscreen API and, in Chromium,
the Keyboard Lock API, so keys like **Super** and **Alt+Tab** reach the desktop instead of the visitor's own
operating system. In that session Esc belongs to the desktop; holding Esc for two seconds leaves full screen (a browser
rule).
