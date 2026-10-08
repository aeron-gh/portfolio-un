import { expect, test, type Page } from '@playwright/test';

type Hooks = { ubuntu: { launch: (app: string) => Promise<string>; windows: () => { id: string; state: string }[]; overview: () => { mode: string; query: string }; lock: () => void } };

async function session(page: Page, testApps = false) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/desktop-next/${testApps ? '?test-apps' : ''}`);
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const overview = (page: Page) => page.evaluate(() => (window as unknown as Hooks).ubuntu.overview());
const launch = (page: Page, app = 'test-window') => page.evaluate((a) => (window as unknown as Hooks).ubuntu.launch(a), app);

test('a dialog over the Overview keeps its keys: Space presses Cancel and nothing reaches the search', async ({ page }) => {
  await session(page);
  await page.keyboard.press('Meta');
  await expect.poll(async () => (await overview(page)).mode).toBe('windows');
  await page.locator('.panel .status').click();
  await page.getByRole('button', { name: 'Power Off Menu' }).click();
  await page.getByRole('menuitem', { name: 'Power Off…' }).click();
  await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect((await overview(page)).query).toBe('');
});

test('Esc with the date menu over the Overview closes only the menu', async ({ page }) => {
  await session(page);
  await page.keyboard.press('Meta');
  await expect.poll(async () => (await overview(page)).mode).toBe('windows');
  await page.locator('.panel .clock-display').click();
  await expect(page.getByRole('dialog', { name: 'Date and time' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Date and time' })).toHaveCount(0);
  expect((await overview(page)).mode).toBe('windows');
});

test('locking closes the tiling popup, and Enter unlocks instead of tiling a window behind the lock', async ({ page }) => {
  await session(page, true);
  await launch(page);
  await launch(page, 'test-utility');
  await page.keyboard.press('Meta+ArrowLeft');
  await expect(page.locator('.tiling-popup .item-box')).toHaveCount(1);
  await page.evaluate(() => (window as unknown as Hooks).ubuntu.lock());
  await expect(page.locator('.tiling-popup')).toHaveCount(0);
  await page.keyboard.press('a');
  await page.keyboard.press('Enter');
  await expect(page.locator('.lock')).toHaveCount(0);
  expect((await page.evaluate(() => (window as unknown as Hooks).ubuntu.windows())).map((w) => w.state)).not.toContain('tiled-right');
});

test('keyboard focus follows the focused window: after Alt+Tab, typing goes to the new window', async ({ page }) => {
  await session(page, true);
  const a = await launch(page);
  const b = await launch(page);
  await page.locator(`.window[data-win="${b}"] input`).click();
  await page.keyboard.type('x');
  await page.keyboard.press('Alt+Tab');
  await expect(page.locator(`.window[data-win="${a}"]`)).not.toHaveClass(/backdrop/);
  await page.keyboard.type('zz');
  await expect(page.locator(`.window[data-win="${b}"] input`)).toHaveValue('x');
  expect(await page.evaluate((id) => !!document.activeElement?.closest(`.window[data-win="${id}"]`), a)).toBe(true);
});
