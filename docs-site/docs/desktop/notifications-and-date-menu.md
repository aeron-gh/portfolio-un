---
sidebar_position: 7
title: Notifications and date menu
---

# Notifications and date menu

## Banners

New notifications drop in under the top bar, centred (200 ms). A banner stays 4 seconds once it has arrived, waits
while the pointer is on it, and leaves 200 ms after the pointer does. Clicking it opens it (and removes it); the close
button removes it. Several notifications queue and show one after another. With **Do Not Disturb** on there are no
banners, but the notifications are still listed.

## The date menu

Click the clock or press **Super+V**.

- **Left:** notifications, one group per app, newest app first. A group of two or more collapses into a stack (the
  newest card on top, the next two peeking out below it); click to expand, Esc or the collapse button to fold it.
  Each card shows the app, a time in GNOME's words ("Just now", "5 minutes ago", "Yesterday", …), the title and one line
  of text. **Clear** removes everything. With nothing to show: *No Notifications*.
- **Right:** the **Today** button (weekday and full date), a six-week **calendar** (week start from the locale,
  zero-padded days like `07`, weekends greyed, today in the accent colour) and **Events** (*Today*, *No Events*).

## The unread dot

A dot appears next to the clock for notifications nobody has seen yet: ones that arrived while Do Not Disturb was on.
A notification counts as seen once it showed as a banner or the date menu opened.

## Built-in notifications

| When | From | Says |
| --- | --- | --- |
| A visitor's first login | Welcome | *Welcome to Ubuntu 26.04 LTS*: start with README.md on your desktop |
| The saved files could not be read | System | *This computer was reset* |
