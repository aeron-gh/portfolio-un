---
sidebar_position: 2
title: Boot, login, lock and power
---

# Boot, login, lock and power

## The session state machine

`system/session.ts` is a small table of moves; `Desktop.svelte` shows the screen for the current state.

```text
boot ──booted──▶ login ──login──▶ session ──lock──▶ lock
  ▲                ▲                │  ▲             │
  │                └────logout──────┘  └───unlock────┘
  └──restart── session / lock / login / off
off ◀──powerOff── any state
```

## Boot

The page starts with the Ubuntu boot animation (Plymouth), drawn in plain HTML and CSS so it paints with the page.
After boot it fades out and is hidden from screen readers.

## Login (GDM)

- The user list shows **Abhishek Agarwal**. Click it or press Enter; the password step accepts any password.
- The gear button (bottom right, on the password step) is the **session chooser**: *Ubuntu* or
  *Ubuntu (full screen)*. The choice is remembered (`ubuntu.session.v1`).
- The entry uses GDM's real style: `#3b3b3b`, `#454545` on hover, an accent ring when focused.
- Embedded in the homepage, Esc on the user list goes back to the page; on the password step Esc first returns to the
  user list, as GDM does.

## Lock screen

- **Super+L**, *Lock Screen* in Quick Settings, or 5 minutes without input locks the screen.
- The clock curtain shows the time and date over the blurred wallpaper. Any key except Shift or Caps Lock lifts it,
  and that key's character goes into the password field (GNOME's `unlockDialog.js` rule).
- The session stays alive underneath but is `inert`: nothing in it can take focus, and shortcuts are off.

## Log Out, Restart, Power Off

Chosen from the power menu in Quick Settings (or **Ctrl+Alt+Delete** for Log Out). Each opens GNOME's end-session
dialog:

| Dialog | Title | Text |
| --- | --- | --- |
| Log Out | Log Out Abhishek Agarwal | Abhishek Agarwal will be logged out automatically in 60 seconds |
| Restart | Restart | The system will restart automatically in 60 seconds |
| Power Off | Power Off | The system will power off automatically in 60 seconds |

- **Cancel** has keyboard focus; Esc cancels; Tab stays inside the dialog.
- The countdown shows tens (60, 50, …) and then every second for the last ten, like GNOME. At zero it runs the action.
- The screen behind gets GNOME's dark vignette (darker at the corners).
- **Log Out** closes every window and clears the notifications. **Restart** replays the boot screen. **Power Off** on
  the homepage shrinks the machine back into the page; on its own page it shows a black screen with a power button.
- Leaving the full-screen session also leaves browser full screen and releases the keyboard.

## Suspend

Suspend locks the screen and turns it black. The key or click that wakes it does nothing else, so the lock screen
underneath stays as it was.
