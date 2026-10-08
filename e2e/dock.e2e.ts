import { expect, test, type Page } from '@playwright/test';

type Hooks = { ubuntu: { launch: (app: string) => Promise<string>; windows: () => { id: string; app: string }[]; overview: () => { mode: string; spread: string | null } } };

async function session(page: Page, testApps = true) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/desktop-next/${testApps ? '?test-apps' : ''}`);
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const launch = (page: Page, app = 'test-window') => page.evaluate((a) => (window as unknown as Hooks).ubuntu.launch(a), app);
const wins = (page: Page) => page.evaluate(() => (window as unknown as Hooks).ubuntu.windows());
const ov = (page: Page) => page.evaluate(() => (window as unknown as Hooks).ubuntu.overview());
const tile = (page: Page, app = 'test-window') => page.locator(`.dock .tile[data-app="${app}"]`);

test('a visitor sees the dock with only Show Apps while no app is built', async ({ page }) => {
  await session(page, false);
  const dock = page.locator('nav.dock');
  await expect(dock).toBeVisible();
  const box = (await dock.boundingBox())!;
  expect(box.width).toBe(66);
  expect(box.y).toBe(32);
  await expect(dock.locator('.tile')).toHaveCount(1);
  await expect(dock.getByRole('button', { name: 'Show Apps' })).toBeVisible();
});

test('Show Apps opens the app grid, and a second click goes back to the desktop', async ({ page }) => {
  await session(page, false);
  const showApps = page.getByRole('button', { name: 'Show Apps' });
  await showApps.click();
  await expect(showApps).toHaveAttribute('aria-pressed', 'true');
  expect((await ov(page)).mode).toBe('apps');
  await showApps.click();
  expect((await ov(page)).mode).toBe('hidden');
});

test('a running app appears with one dot per window', async ({ page }) => {
  await session(page);
  await launch(page);
  await expect(tile(page).locator('.dots i')).toHaveCount(1);
  await launch(page);
  await expect(tile(page).locator('.dots i')).toHaveCount(2);
  await expect(tile(page)).toHaveClass(/focused/);
});

test('click: focus the app, or spread its windows when it is focused with two', async ({ page }) => {
  await session(page);
  await launch(page);
  const u = await launch(page, 'test-utility');
  await tile(page).click();
  const focusedApp = await page.evaluate(() => document.querySelector('.window:not(.backdrop)')?.getAttribute('data-app'));
  expect(focusedApp).toBe('test-window');
  await launch(page);
  await tile(page).click();
  expect(await ov(page)).toEqual(expect.objectContaining({ mode: 'windows', spread: 'test-window' }));
  await tile(page).click();
  expect((await ov(page)).mode).toBe('hidden');
  expect((await wins(page)).some((w) => w.id === u)).toBe(true);
});

test('middle-click opens another window', async ({ page }) => {
  await session(page);
  await launch(page);
  await tile(page).click({ button: 'middle' });
  await expect.poll(async () => (await wins(page)).length).toBe(2);
});

test('the tooltip names the app after a short hover', async ({ page }) => {
  await session(page);
  await launch(page);
  await tile(page).hover();
  await expect(page.locator('.dash-label')).toHaveText('Test Window');
});

test('right-click menu: windows, New Window, Pin to Dock, Quit', async ({ page }) => {
  await session(page);
  await launch(page);
  await launch(page);
  await tile(page).click({ button: 'right' });
  const menu = page.getByRole('menu', { name: 'Test Window' });
  await expect(menu).toContainText('Open Windows');
  await expect(menu.getByRole('menuitem', { name: 'Quit 2 Windows' })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Pin to Dock' }).click();
  await expect(menu).toHaveCount(0);
  await tile(page).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Quit 2 Windows' }).click();
  await expect.poll(async () => (await wins(page)).length).toBe(0);
  await expect(tile(page)).toBeVisible(); // pinned: stays without windows
  await expect(tile(page).locator('.dots i')).toHaveCount(0);
  await page.reload();
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(tile(page)).toBeVisible(); // the pin was saved
});

test('the menu works from the keyboard and Esc closes only the menu', async ({ page }) => {
  await session(page);
  await launch(page);
  await tile(page).click({ button: 'right' });
  await expect(page.locator('.popup-menu')).toBeFocused(); // the menu code loads on first use
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.popup-menu .item.active')).toHaveText('Test Window');
  await page.keyboard.press('Escape');
  await expect(page.locator('.popup-menu')).toHaveCount(0);
  expect((await wins(page)).length).toBe(1);
});

test('desktop icons now start right of the dock', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await session(page, false);
  for (const icon of await page.locator('.desktop-icon').all()) {
    const b = (await icon.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(66);
  }
});
