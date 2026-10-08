import { expect, test, type Page } from '@playwright/test';

type Hooks = { ubuntu: { launch: (app: string) => Promise<string | null>; windows: () => { id: string }[]; overview: () => { mode: string }; logout: () => void } };

async function session(page: Page, testApps = false) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/desktop/${testApps ? '?test-apps' : ''}`);
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const hooks = <T>(page: Page, fn: (u: Hooks['ubuntu']) => T) => page.evaluate(fn as never) as Promise<T>;

test('Esc still cancels the end-session dialog after a click on its dark background', async ({ page }) => {
  await session(page);
  await page.keyboard.press('Control+Alt+Delete');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.mouse.click(20, 780);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('two quick launches while the app code downloads open one window', async ({ page }) => {
  await page.route(/TestWindow\.[\w-]+\.js$/, async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.continue();
  });
  await session(page, true);
  await page.evaluate(() => Promise.all([0, 1].map(() => (window as unknown as Hooks).ubuntu.launch('test-window'))));
  expect(await page.evaluate(() => (window as unknown as Hooks).ubuntu.windows().length)).toBe(1);
});

test('logging out of the full-screen session leaves full screen', async ({ page }) => {
  await page.goto('/desktop/');
  await page.locator('.gdm-user').click();
  await page.getByRole('button', { name: 'Choose Session' }).click();
  await page.getByRole('menuitem', { name: 'Ubuntu (full screen)' }).click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.evaluate(() => (window as unknown as Hooks).ubuntu.logout());
  await expect(page.locator('.gdm')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
});

test('window ids keep counting after logging out', async ({ page }) => {
  await session(page, true);
  const first = await page.evaluate(() => (window as unknown as Hooks).ubuntu.launch('test-window'));
  await page.evaluate(() => (window as unknown as Hooks).ubuntu.logout());
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
  const second = await page.evaluate(() => (window as unknown as Hooks).ubuntu.launch('test-window'));
  expect(second).not.toBe(first);
});

test('if the Overview code cannot be downloaded, the desktop does not get stuck', async ({ page }) => {
  await page.route(/\/Overview\.[\w-]+\.js$/, (route) => route.abort());
  await session(page);
  await page.keyboard.press('Meta');
  await expect.poll(() => page.evaluate(() => (window as unknown as Hooks).ubuntu.overview().mode)).toBe('hidden');
});

test('tiling popup: Tab and Shift+Tab move both ways', async ({ page }) => {
  await session(page, true);
  for (let i = 0; i < 4; i++) await page.evaluate(() => (window as unknown as Hooks).ubuntu.launch('test-window'));
  await page.keyboard.press('Meta+ArrowLeft');
  const items = page.locator('.tiling-popup .item-box');
  await expect(items).toHaveCount(3);
  const selected = page.locator('.tiling-popup .item-box[aria-selected="true"]');
  const firstId = await selected.getAttribute('data-id');
  await page.keyboard.press('Tab');
  await expect(selected).not.toHaveAttribute('data-id', firstId!);
  await page.keyboard.press('Shift+Tab');
  await expect(selected).toHaveAttribute('data-id', firstId!);
});
