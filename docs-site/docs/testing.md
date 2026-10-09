---
sidebar_position: 7
title: Testing
---

# Testing

There are three kinds of tests. Each one catches a different kind of mistake.

| Kind | Folder | Runs in | Count | Catches |
| --- | --- | --- | ---: | --- |
| **Unit** | `tests/unit/` | Bun, no browser, under 1 s | 222 | Wrong rules: window maths, sort orders, saved-data checks |
| **Build** | `tests/build/` | Bun, reading `dist/` | 40 | Broken HTML, missing tags, files that grew too big |
| **Browser** | `e2e/` | Playwright with real Chromium | 169 | Wrong behaviour: clicks, keys, focus, timing, looks |

```bash
bun run test        # unit
bun run test:build  # build the site, then check it
bun run test:e2e    # build the site, then run the browser tests
bun run check       # type check (astro check)
```

See [Scripts and tests](./project-structure/scripts-and-tests.md) for what each file covers.

## Why the code is split for testing

Desktop logic lives in plain `.ts` files with no Svelte in them: `windows.ts`, `dock.ts`, `shortcuts.ts`,
`settings.ts` and so on. Bun can test those directly, with no browser, in milliseconds.

The `.svelte` files only draw things and pass events to those rules. So most bugs can be pinned by a fast unit test.
Only behaviour that needs a real page (focus, pointer events, timing, layout) needs a browser test.

## Browser tests

Some setup in `playwright.config.ts` keeps the tests honest and steady:

| Setting | Why |
| --- | --- |
| Port **4399**, serving the built `dist/` | Tests run against what visitors get, never against dev code. `astro dev` uses 4321, so the two can't mix |
| `reducedMotion: 'reduce'` | Animations finish at once, so tests don't wait or race them |
| A saved `ubuntu.welcome.v1` | Every test starts as a returning visitor, so the welcome banner doesn't cover what tests click. The welcome test clears it |
| System Chromium (`/usr/bin/chromium`) locally | Uses the browser that is already installed. Set `PW_BUNDLED=1` to use Playwright's own (CI does) |
| `fullyParallel: true` | Each test gets its own page, so they can all run at once |

### Helpers the tests use

- **`?test-apps`** in the URL adds two hidden apps, "Test Window" and "Test Utility". They let tests open real windows
  before the real apps exist.
- **`window.ubuntu`** has small hooks: `launch(app)`, `windows()`, `overview()`, `panel()`, `notify(n)`, `lock()` …
  Tests use them to set up a state quickly, or to read the state behind the screen. They call the same functions a
  click would.
- **`page.clock`** is Playwright's fake clock. Tests that check timing (a 60-second countdown, a 4-second banner, a
  5-minute idle lock) move time forward in one step instead of waiting.

### Writing a browser test

Test what a visitor does and sees. Use roles and names, the way a screen reader would find things:

```ts
await page.getByRole('dialog', { name: 'System' }).getByRole('button', { name: 'Power Off Menu' }).click();
await expect(page.getByRole('alertdialog').getByRole('heading')).toHaveText('Power Off');
```

This tests the accessibility too. If a button loses its label, the test can't find it, so it fails.

**Red, then green.** For a bug, write the test first and watch it fail for the right reason. Then fix the code.
A test that never failed may not test anything. One example: a test for Shift+Tab in a menu passed even before the
fix, because with only two items, going back one is the same as going forward one. With three items, it failed as it
should.

### When a test is flaky

A test that passes and fails at random usually means the code has a real timing bug, not that the test is bad. One
example: Alt+Tab sometimes picked the wrong window when the machine was busy. The cause was that the switcher appeared
under the resting pointer and took hover as a choice. GNOME ignores the pointer for 500 ms after the switcher appears.
Copying that rule fixed the real bug and the flaky test together.

## Size budgets

Speed is a feature. So the sizes that matter have hard limits, and a test fails the build if one is crossed.

| What | Limit | Test |
| --- | --- | --- |
| Desktop JavaScript loaded at start (gzip) | **45 KB** | `tests/build/desktop-budget.test.ts` |
| Desktop page CSS (gzip) | **20 KB** | `tests/build/desktop-budget.test.ts` |
| Preloaded Ubuntu Sans font files | **60 KB** | `tests/build/desktop-budget.test.ts` |
| The file system seed written into the page (gzip) | **15 KB** | `tests/build/desktop-budget.test.ts` |
| Each surface loaded on demand (gzip) | **25 KB**, and in its own file | `e2e/desktop-budget.e2e.ts` |
| Icons downloaded during boot, login and the first session | **40 KB** | `e2e/desktop-budget.e2e.ts` |
| Homepage fonts preloaded | at most **2** files | `tests/build/shell.test.ts` |

**gzip** is the compression the server uses when it sends a file. The limits are on the compressed size, because
that is what travels over the network.

### When a budget fails

Don't raise the limit first. Ask whether the code needs to load at start. Menus, dialogs, Quick Settings, the
Overview, the date menu and the switcher are all loaded **on demand**: the first time they open, or quietly in the
background after login. That is done in `src/desktop/shell/surfaces.ts`:

```ts
export const loadQuickSettings = () => import('./QuickSettings.svelte');
```

A dynamic `import()` tells the bundler to put that component in its own file. The browser downloads it only when the
function is called. Moving the desktop's menus, popovers, switcher and dialogs behind `import()` brought the start-up
JavaScript from about 47.5 KB back under 45 KB.
