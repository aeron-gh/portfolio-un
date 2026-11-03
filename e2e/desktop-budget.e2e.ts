import { expect, test } from '@playwright/test';

test('icons downloaded by boot, login and session are at most 40 KB', async ({ page }) => {
  const sizes = new Map<string, number>();
  const pending: Promise<void>[] = [];
  page.on('response', (res) => {
    if (!/\/_astro\/.+\.(svg|png)$/.test(new URL(res.url()).pathname)) return;
    pending.push(res.body().then((b) => void sizes.set(res.url(), b.length)));
  });
  await page.goto('/desktop/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.desktop-icon').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await Promise.all(pending);
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
  expect(total).toBeLessThanOrEqual(40 * 1024);
});

test('each code-split surface is its own file, at most 25 KB gzipped', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { gzipSync } = await import('node:zlib');
  const dir = 'dist/_astro';
  const files = readdirSync(dir);
  // Each of these loads only when first used; if one became part of the first download, its file would be missing.
  // Apps too: each app is its own file, and the shared header bar loads with the first app, not at start.
  const surfaces = ['Overview', 'QuickSettings', 'DateMenu', 'Banner', 'EndSessionDialog', 'PopupMenu', 'GtkMenu', 'RenamePopover', 'Switcher', 'TilingPopup', 'Dialog', 'PowerOff', 'desktop-menu', 'TextEditor', 'HeaderBar', 'Files'];
  for (const name of surfaces) {
    const file = files.find((f) => f.startsWith(`${name}.`) && f.endsWith('.js'));
    expect(file, name).toBeDefined();
    expect(gzipSync(readFileSync(`${dir}/${file}`)).length, name).toBeLessThanOrEqual(25 * 1024);
  }
});
