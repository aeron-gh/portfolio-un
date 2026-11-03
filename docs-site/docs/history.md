---
sidebar_position: 9
title: How it was built
---

# How it was built

## Timeline

| When | What changed |
| --- | --- |
| **March 2026** | First version: one `index.html` with plain CSS and JavaScript (`js/desktop.js`, `window-manager.js`, `terminal.js`, `file-manager.js`). An Ubuntu-style desktop was the whole site. Hosted on GitHub Pages with a custom domain. |
| **7 Oct 2026** | Rebuilt with **Astro**. The homepage became a fast, mostly static résumé page. The old desktop stayed, behind a "boot" button, and was sped up. |
| **7 Oct 2026** | Started the new **Svelte 5** desktop at `/desktop-next/`, next to the old one: boot screen, login, lock, power off, top bar, desktop icons, the settings store, the file system and the real Ubuntu assets. |
| **8 Oct 2026** | The interactive desktop: windows (move, resize, snap, tile), the dock, the Overview with search and the app grid, Alt+Tab, Quick Settings, keyboard shortcuts, end-session dialogs, notifications and the date menu, desktop right-click menus. The old desktop was deleted. |
| **8 Oct 2026** | Moved hosting from GitHub Pages to Cloudflare Workers. Moved the desktop to `/desktop/`. Fixed layering, focus and loading edge cases. |
| **9 Oct 2026** | Added CI (GitHub Actions) and these docs. Changes now reach `master` only through pull requests. |
| **12–17 Oct 2026** | The first app, **Text Editor**, and the shared libadwaita kit for the apps that follow. |
| **Nov 2026** | **Files**: browsing and managing files, in three parts. Overlay scrollbars for every app. |

## Why rebuild?

The first version worked, but it had limits:

- **Heavy files.** Large wallpapers and audio files were part of the site.
- **No tests.** Every change had to be checked by hand.
- **Ubuntu-like, not Ubuntu.** The new goal is stricter: someone who uses Ubuntu should not be able to tell it apart.

The new version fixes each one: [size budgets](./testing.md#size-budgets) for speed, pure `.ts` rules with unit
tests, and [values copied from Ubuntu's sources](./fidelity.md).

## Building the new next to the old

The new desktop was built at `/desktop-next/` while the old one stayed live at its usual place. Visitors never saw a
half-built desktop. When the new one did everything the old one did, the homepage switched to it in one commit, and
the old code was deleted. Then it moved to `/desktop/`.

This is a common way to replace a working system: build the new one beside it, switch over once, then remove the old.

## How each piece was made

Every part of the desktop went through the same steps:

1. **Read the source.** Find the GNOME Shell, Yaru, ubuntu-dock or DING code for that part. Write down the exact
   sizes, colours, timings, labels and rules.
2. **Write the rule as plain TypeScript** in a `.ts` file, with unit tests. For example, `dock.ts` decides what a
   click on a dock icon does. It doesn't draw anything.
3. **Draw it in Svelte.** The `.svelte` file shows the state and passes events to the rule.
4. **Test it in a browser.** A Playwright test does what a visitor would do.
5. **Take a screenshot baseline** for parts that have a fixed look.
6. **Review it.** A second, careful pass over the code, looking for edge cases: slow networks, keys pressed during
   animations, two menus open at once, saved data that is damaged.

## Moving the hosting without downtime

The move from GitHub Pages to Cloudflare followed an order where the site was never down:

1. Save the old site on a `legacy-site` branch.
2. Merge the new site into `master`.
3. Set up the Cloudflare Worker and let it build `master`.
4. Point the domain's DNS at Cloudflare.
5. Only then turn off GitHub Pages.

At each step, the previous step still worked. If any step failed, the site was still up.

## Lessons learned

Each of these was a real bug. Each one now has a test.

| Bug | Cause | Fix |
| --- | --- | --- |
| A quick click outside a new menu sometimes didn't close it | The "click outside closes it" listener was added a moment later, with a timer. Chromium can handle the next click before the timer runs | Add the listener at once. The opening click has already finished by then |
| Alt+Tab picked the wrong window on a busy machine | The switcher appeared under the resting pointer, which counted as a hover | GNOME's rule: ignore the pointer for 500 ms after the switcher appears |
| Quick Settings tiles had the wrong padding | A rule written only for left-to-right text (`:ltr`) was missed in the theme CSS | Check direction-specific rules too |
| The accent colour was a little off | The Ubuntu brand orange (`#E95420`) was used | Ubuntu's GNOME Shell uses its own accent colours: copied from there |
| The start-up JavaScript went over budget | Menus, dialogs and the switcher were loaded at start | Load them when first needed. See [Testing](./testing.md#size-budgets) |
| On a slow connection, keys pressed right after opening the Overview were lost, and in the embedded desktop Esc left the whole desktop | The Overview's code loads on demand. Until it arrived, nothing was listening for its keys | Until it arrives, a placeholder layer keeps the typing for the search and handles Esc. Found by CI, whose machines are slower |
| On a slow connection, Esc right after opening the homepage menu was ignored | The box shows at once, but its key handling came with the code | Esc before the code arrives closes the box and cancels the opening |
| A dialog came out 26 px too narrow | GTK's `min-width` sizes the content, inside the padding; here it includes the padding | Add the padding. See [GTK sizes](./desktop/apps.md#gtk-sizes-are-content-sizes) |
| An icon from libadwaita was invisible | GTK's newer SVG format leaves out the SVG namespace; a browser then draws nothing | Fix the file when fetching it, and a unit test for every SVG |
| A menu opened off the bottom of the window | The popover always opened below its button | Open above when there is no room below, as GTK does |
| Text typed right after opening a file was lost in tests | The keys came before the editor had focus | Real GNOME behaves the same; the tests wait for focus first |
| A rename or a delete did nothing after its dialog closed | `{@const r = renaming}` is live: clearing `renaming` emptied `r` too, before the next line used it | Copy the value first, then clear |
| Clicking a window's header stopped its shortcuts working | A browser moves focus to the nearest focusable parent, here the window, outside the app's key handler. GTK headers never take focus | `keepFocus` on the app's root |
| A new app's dock icon was a blank page | Yaru stores some icons as symlinks, so a raw download saved a line of text. The app's icon had also never been fetched | `downloadIcon` follows links; a unit test checks every built app has a real PNG |
| A focus ring showed on a menu opened with the mouse | The browser's `:focus-visible` guesses after a script moves focus | [GTK's own rule](./desktop/apps.md#focus-rings-are-not-focus-visible) |
| An app's empty page swallowed Backspace | With no items there was nothing to focus, so focus fell out of the window | The page itself can hold focus |
| Esc closed two things at once | Every open menu listened to the same key | A [layer stack](./desktop/architecture.md#overlays-and-the-keyboard): only the top layer acts |
