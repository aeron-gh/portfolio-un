---
sidebar_position: 1
title: Overview
---

# The homepage

The homepage (`src/pages/index.astro`) is a single static page. Astro renders it to HTML at build time; the browser
gets HTML and CSS first, and small scripts only for the parts that move.

## Sections, top to bottom

1. **Header**: name, navigation, theme toggle.
2. **Hero**: who Abhishek is, with live numbers from GitHub (years contributing, merged pull requests).
3. **The Ubuntu machine**: a miniature desktop with a typing terminal and a **Boot** pill. See
   [The Ubuntu machine](./the-ubuntu-machine.md).
4. **Now**: what is happening this month.
5. **Open source**: merged pull requests grouped by project, plus a contribution graph.
6. **Experience** and **Education**: shown only when the profile has entries.
7. **Building**: current projects, with the Partlore pin demo.
8. **Earlier**: older projects in an accordion.
9. **Stack**: tools and languages.
10. **Contact**: email (copy button), links, latest work.

## Editing the content

All text lives in **one file**: `src/content/profile.ts`. It is a typed object, so a missing field is a type error, not
a broken page. Text fields support a small rich-text syntax parsed by `src/lib/rich.ts`:

| Write | Get |
| --- | --- |
| `**words**` | **bold** |
| `[text](https://…)` | a link |
| `{since}` | the year of the first merged pull request |
| `{total}` | the rounded total of merged pull requests |

## Theme

The page follows the system theme by default. The toggle cycles **system → light → dark** and saves the choice in
`localStorage` under `theme`. A tiny inline script in `Base.astro` applies the saved theme before the first paint, so
there is no flash.

## Accessibility and motion

- Every interactive element is reachable by keyboard; closed accordions are `inert`.
- `prefers-reduced-motion: reduce` turns animations off (the terminal stops typing, sections appear without fading).
- On phones the machine shows a hint instead of booting a full desktop.
