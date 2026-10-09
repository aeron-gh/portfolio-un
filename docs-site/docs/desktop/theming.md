---
sidebar_position: 12
title: Theming
---

# Theming: style, accent, icons and fonts

| File | Job |
| --- | --- |
| `theme/tokens.css` | Every colour, size and timing as a CSS variable, for light and dark |
| `theme/base.css` | Page reset, the body font, symbolic icons, reduced motion |
| `system/settings.ts` | The 10 accent colours (`ACCENTS`) |
| `icons.ts` | Turns an icon name into the URL of the real Yaru file |
| `shell/ScreenFilters.svelte` | Night Light and the brightness slider |

## Tokens: one place for every value

A **token** is a named CSS variable, like `--panel-bg`. Components never write a raw colour. They use a token.

Each token has a comment that names the variable it was copied from in the Yaru or GNOME Shell source:

```css
--panel-bg: #131313; /* $yaru_panel_bg_color */
--panel-fg: #f2f2f2; /* $yaru_panel_fg_color */
```

So if a colour looks wrong, there is one place to fix it, and a source to check it against.

The tokens are grouped by surface:

| Prefix | Surface |
| --- | --- |
| `--panel-*`, `--sys-*`, `--dock-*` | Top bar, dock, login and lock screens |
| `--pop-*` | Popover menus (top bar menus, dock menus) |
| `--qs-*`, `--slider-*` | Quick Settings |
| `--message-*`, `--cal-*` | Notifications and the date menu |
| `--win-*`, `--hb-*` | App windows and their header bars |
| `--gtk-*` | GTK3 menus (desktop right-click) |
| `--modal-*` | End-session dialogs |

## Light and dark

`tokens.css` has two blocks:

```css
:root { /* light values */ }
:root[data-style="dark"] { /* dark values */ }
```

`Desktop.svelte` sets `data-style` on the page from the **style** setting (or from the visitor's OS when it is
`system`). Every token then switches at once. No component has its own dark-mode code.

Some surfaces stay dark in **both** styles, just like Yaru: the top bar, the dock, the login and lock screens. Their
tokens live only in `:root`.

## Accent colours

Ubuntu 26.04 has 10 accents. Ubuntu's GNOME Shell uses **its own colours** for them, and they differ from upstream
GNOME's. They are not plain Ubuntu orange (`#E95420`) either. Each accent has a light and a dark value:

| Accent | Light | Dark |
| --- | --- | --- |
| blue | `#0070de` | `#0073e5` |
| teal | `#2e7e7c` | `#308280` |
| green | `#488001` | `#4b8501` |
| yellow | `#9a6800` | `#9f6c00` |
| **orange** (default) | `#cb4314` | `#d34615` |
| red | `#d82b48` | `#da3450` |
| pink | `#ae4aae` | `#b34cb3` |
| purple | `#7360d7` | `#7764d8` |
| slate | `#627766` | `#657b69` |
| brown | `#8c6c47` | `#92714a` |

`Desktop.svelte` writes the right one into `--accent`. Everything coloured by the accent (toggles, sliders, focus,
selection) reads `--accent`.

## Icons

Icons are the real **Yaru** files, downloaded by `scripts/fetch-ubuntu-assets.ts` from a pinned Yaru commit and
committed under `src/desktop/assets/icons/`.

- **Full-colour icons** (apps, folders, file types) are PNGs at 96 px (Yaru's `48x48@2x`), so they stay sharp on
  high-density screens.
- **Symbolic icons** (the small grey ones in the top bar and menus) are SVGs.

GTK recolours symbolic icons to match the text around them. The desktop does the same with CSS: the SVG is used as a
**mask** (a stencil), and the colour comes through from `currentColor`.

```svelte
<span class="sym" style:--icon={`url(${icon('go-next-symbolic')})`}></span>
```

`icon(name)` finds the file by its Yaru name. An unknown name falls back to `text-x-generic`, so a typo shows a
generic icon instead of a hole. A unit test (`ubuntu-assets`) checks that every icon name the code uses exists.

## Fonts

**Ubuntu Sans**, the default font of Ubuntu 26.04, at 11 pt, as GNOME uses. Astro's font feature downloads it at
build time from Fontsource and serves it from the site itself. No request goes to a font CDN. The homepage uses
Geist and Geist Mono the same way.

## Wallpapers

`ubuntu-light.avif` and `ubuntu-dark.avif` come from the real `ubuntu-wallpapers` 26.04 package, converted to AVIF
to keep them small. The style setting picks one.

The full image is large, so a tiny blurred version (about 80 bytes, in `placeholders.json`) is shown first, written
straight into the page. The real wallpaper fades in once it has loaded. The screen is never a flat colour while it
waits.

## Night Light and brightness

- **Night Light** puts a warm layer over the whole screen with `mix-blend-mode: multiply`. Its colour matches GNOME's
  default 2700 K. Multiply lowers green and blue the same way GNOME's colour ramp does.
- **Brightness** below 100 puts a black layer on top with some opacity. Neither layer catches clicks.

## Reduced motion

If the visitor's OS asks for reduced motion, the boot screen is skipped, and window and workspace animations are
turned off. `base.css` also cuts CSS transitions short. GNOME does the same when animations are turned off.
