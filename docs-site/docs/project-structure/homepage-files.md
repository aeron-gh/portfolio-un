---
sidebar_position: 2
title: Homepage files
---

# Homepage files

The homepage is an Astro page. It ships plain HTML and CSS, plus a handful of small scripts that each do one job.

## `src/pages/`

| File | Route | What it is |
| --- | --- | --- |
| `index.astro` | `/` | The homepage. Loads the GitHub data at build time, then renders the sections in order. |
| `desktop/index.astro` | `/desktop/` | The Ubuntu desktop page. Builds the file system seed and mounts the Svelte `Desktop` component. |

## `src/components/` (homepage sections)

The homepage renders these in order: `Header`, `Hero`, `Machine`, `Now`, `OpenSource`, `Experience`, `Building`,
`Earlier`, `Education`, `Stack`, `Contact`, `Footer`, followed by three overlays: `Previews`, `CommandMenu`, `Desk`.

| Component | What it shows |
| --- | --- |
| `Header.astro` | The sticky header: name, navigation, theme toggle, the hairline that appears on scroll. |
| `Hero.astro` | The opening: name, role, the short "lede" with live numbers (`{since}`, `{total}`). |
| `Machine.astro` | The miniature Ubuntu machine and the **boot pill**: the entry point to the desktop. |
| `Now.astro` | What is happening this month. |
| `OpenSource.astro` | Merged pull requests grouped by project, with the activity graph. |
| `ActivityGraph.astro` | The contribution graph (weeks × days), with a tooltip. |
| `Experience.astro` | Work experience (only rendered when the profile has entries). |
| `Building.astro` | Current projects (Partlore, Opentrail), each as a `ProjectBlock`. |
| `ProjectBlock.astro` | One project: title, text, links, optional demo. |
| `PinDemo.astro` | The Partlore pin demo (ESP32 pins with their gotchas and sources). |
| `Earlier.astro` | Earlier projects in an accordion. |
| `Education.astro` | Education (only rendered when the profile has entries). |
| `Stack.astro` | Tools and languages. |
| `Contact.astro` | Email (copy button), links, the latest merged work. |
| `Footer.astro` | Footer links and the build date. |
| `Previews.astro` | Hover preview cards for links. |
| `CommandMenu.astro` | The **Ctrl K** command menu. |
| `Desk.astro` | The full-screen "desk" that hosts the booted desktop in an iframe. |
| `Rich.astro` | Renders rich text tokens (bold, links) from the profile. |

## `src/scripts/` (homepage browser code)

| Script | Job |
| --- | --- |
| `machine.ts` | The homepage side of the Ubuntu machine: grow from the miniature, boot the desktop in an iframe, shrink back on exit, error and retry, prefetch, phone fallback. See [The Ubuntu machine](../homepage/the-ubuntu-machine.md). |
| `shortcuts.ts` | Always-loaded keys: **Ctrl K** (command menu) and **U** (boot). Loads the command menu on first use. |
| `command-menu.ts` | The command menu itself: fuzzy search over commands (boot, copy email, go to a section, theme, links). |
| `theme.ts`, `theme-toggle.ts` | System / light / dark theme, saved in `localStorage` (`theme`), with a circular reveal. |
| `header.ts` | Header border after 8px of scroll and a reading-progress line. |
| `reveal.ts` | Fades sections in the first time they scroll into view. |
| `accordion.ts` | Opens and closes `[data-acc]` blocks; closed bodies are `inert`. |
| `graph.ts` | The activity graph tooltip, kept inside the graph at the edges. |
| `preview.ts` | Preview cards that follow the cursor with a soft lag and a slight tilt. |
| `pins.ts` | The pin demo: hover, focus or tap a pin to see its gotcha. |
| `terminal.ts` | The miniature's terminal typing loop; pauses off screen, static under reduced motion. |
| `clock.ts` | Fills `[data-clock]` elements with the time in a given time zone. |
| `copy.ts`, `copy-text.ts` | The email copy button; falls back to selecting the text when the clipboard is blocked. |
| `toast.ts` | Small temporary messages ("Email copied"). |

## `src/lib/` (pure helpers, unit-tested)

| File | Job |
| --- | --- |
| `github.ts` | Shapes merged pull requests into the data the page shows: totals, groups, the activity graph. |
| `github-fetch.ts` | Fetches merged pull requests from the GitHub search API, with a timeout and a snapshot fallback. |
| `site-data.ts` | `loadGithub()` (live or snapshot) and `hasResume()`. |
| `rich.ts` | Parses `**bold**`, `[text](url)` and `{variables}` in profile text into tokens. |
| `fuzzy.ts` | Fuzzy matching and ranking for the command menu. |
| `split.ts` | Splits text into words and visible characters (so emoji are never cut in half). |
| `desktop-assets.ts` | The URL the homepage embeds: `/desktop/?embed=1`. |
| `spotify.ts` | Turns a Spotify share link into an embed link (for the coming Music app). |

## Other folders

| Folder | Contents |
| --- | --- |
| `src/content/profile.ts` | **All homepage text** in one typed object: name, lede, links, projects, experience, education. Text may use `**bold**`, links, `{since}` and `{total}`. |
| `src/data/github.snapshot.json` | Saved GitHub data, used by dev, tests and as a fallback. Refresh with `bun run github:snapshot`. |
| `src/layouts/Base.astro` | The HTML shell: `<head>`, fonts, theme bootstrap, skip link. |
| `src/styles/` | `tokens.css` (colours, spacing), `base.css` (reset and type), `blocks.css` (shared section blocks). |
| `public/` | Copied as is: `favicon.svg`. |
