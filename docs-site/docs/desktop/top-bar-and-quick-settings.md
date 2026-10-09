---
sidebar_position: 6
title: Top bar and Quick Settings
---

# Top bar and Quick Settings

## Top bar

- **Left:** workspace dots (no "Activities" text). The active dot is wider. Click to open the Overview.
- **Centre:** the clock, as GNOME prints it: `Oct 8␣09:05` (24-hour, zero-padded) or `Oct 8␣ 9:05 PM` (12-hour), where
  `␣` is an en space. It follows the visitor's locale. A dot appears next to it when there are unseen notifications.
- **Right:** status icons in GNOME's order: Night Light (when on), network, Do Not Disturb (when on), Airplane Mode
  (when on), volume, power profile (when not Balanced), battery.

Hover draws a 17% highlight; an open menu 28%. The clock's highlight covers only the time, not the dot.

## Quick Settings

Click the status icons or press **Super+S**.

| Row | Contents |
| --- | --- |
| System | Battery (icon and percentage), **Lock Screen**, **Power Off Menu** (Suspend, Restart…, Power Off…, Log Out…) |
| Sliders | Volume (the speaker icon mutes), Brightness |
| Tiles | Wi–Fi, Bluetooth, Power Mode, Night Light, Dark Style, Do Not Disturb, Airplane Mode |

### What each tile does

| Tile | Behaviour |
| --- | --- |
| Wi–Fi | Connected to "Home". Off → no network icon in the top bar. Browser offline → the "no route" icon. |
| Bluetooth | On/off; there are no devices, so its menu says *No available or connected devices*. |
| Power Mode | Balanced / Power Saver / Performance. A click toggles between Balanced and the last other mode. |
| Night Light | A warm 2700 K filter over the whole screen (lock screen included). |
| Dark Style | Switches the whole theme. |
| Do Not Disturb | Notifications still arrive but without banners. |
| Airplane Mode | Turns Wi–Fi and Bluetooth off; turning either back on ends it. |

Tiles with an arrow open a menu inside the panel, under their row; the rest of the panel dims while it is open. The
brightness slider dims the screen, but never to black (0% is the backlight's minimum, as on a laptop). The Screenshot
and Settings buttons are hidden until those features exist.

Every choice is saved in `ubuntu.settings.v1`.
