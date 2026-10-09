---
sidebar_position: 11
title: Conventions
---

# Conventions

The rules the code follows. New code should look like the code around it.

## Three kinds of files

| Ending | Holds | Example |
| --- | --- | --- |
| `.ts` | Pure rules: data in, data out. No Svelte, no DOM. Unit-tested | `shell/dock.ts`, `wm/windows.ts` |
| `.svelte.ts` | Shared reactive state (a "store"), using Svelte runes outside a component | `system/settings.svelte.ts`, `wm/wm.svelte.ts` |
| `.svelte` | Components: they draw state and pass events on | `shell/Dock.svelte` |

A **rune** is Svelte 5's way to mark reactive values, such as `$state(...)` and `$derived(...)`. A file must end in
`.svelte.ts` to use runes outside a component.

Pure TypeScript files use `kebab-case.ts`. Components use `PascalCase.svelte`.

## Comments

- Say **why**, not what. The code already says what.
- When a value or rule comes from Ubuntu, name the source file or variable:
  `/* $yaru_panel_bg_color */`, `// switcherPopup.js: the pointer is ignored for 500ms …`.
- Keep comments about the code. A comment must still make sense to someone who has only the code in front of them.

## Values

- No raw colours or sizes in components. Use a [token](./desktop/theming.md) from `theme/tokens.css`.
- If Ubuntu has the value, copy it from the source. Don't guess. See [Matching real Ubuntu](./fidelity.md).

## Saved data

- Keys look like `ubuntu.<name>.v1`. Change the version when the shape changes in a way old data can't fit.
- Check every field when loading. A bad field falls back to its default, and the other fields stay.
- Wrap every save in `try … catch`. Blocked storage must never break the desktop.

See [Settings and saved data](./desktop/settings-and-storage.md).

## Loading code

- Anything not needed for the first screen loads on demand, through `shell/surfaces.ts`.
- Every `import()` has a `.catch`. A file that fails to download (a bad network, a new deploy that removed the old
  file) must not crash the desktop. It tries again the next time it is needed.
- Keep the [size budgets](./testing.md#size-budgets) green.

## Keys and focus

- Anything that takes keys while it is open (a menu, popup or dialog) opens a **layer** with `openLayer()`. It handles
  keys only while `layer.top()` is true, and calls `layer.close()` when it goes away.
- When a menu or dialog closes, focus goes back to whatever opened it.
- Dialogs keep Tab and Shift+Tab inside themselves (`shell/focus-trap.ts`).
- Give every control a role and a name: `role="menuitem"`, `aria-label="Power Off Menu"`. Screen readers use these, and
  the tests do too.

## Tests

- New rule: unit test. New behaviour: browser test. New fixed look: a screenshot.
- For a bug, write a failing test first.
- In browser tests, find things by role and name (`getByRole('button', { name: 'Cancel' })`), not by CSS class,
  where you can.

## Git

- **One short line** per commit message. If it doesn't fit on one line, the commit is too big: split it.
- Every change goes through a pull request from a short-lived branch. `master` can't be pushed to directly.
- A pull request is merged only when CI is green. GitHub blocks the merge until then.
- Pull requests are squash-merged, so each one becomes one commit on `master`. Its title is the commit message: keep
  it to one short line. Every merge to `master` deploys.

See [CI and deployment](./ci-and-deployment.md#how-a-change-reaches-the-site).

## TypeScript

The project uses Astro's `strict` TypeScript settings, and `bun run check` must report 0 errors. Type checking needs
TypeScript 6 for now, because `astro check` does not support TypeScript 7 yet.
