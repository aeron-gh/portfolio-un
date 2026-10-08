import { expect, test, type Page } from '@playwright/test';

type W = { id: string; app: string; workspace: number };
type Hooks = { ubuntu: { launch: (app: string) => Promise<string>; windows: () => W[] } };

async function session(page: Page, testApps = true) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/desktop-next/${testApps ? '?test-apps' : ''}`);
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const launch = (page: Page, app = 'test-window') => page.evaluate((a) => (window as unknown as Hooks).ubuntu.launch(a), app);
const wins = (page: Page) => page.evaluate(() => (window as unknown as Hooks).ubuntu.windows());
const activities = (page: Page) => page.getByRole('button', { name: 'Activities' });

test('the workspace pill opens the overview with the mouse', async ({ page }) => {
  await session(page, false);
  await activities(page).click();
  await expect(page.locator('.ov-back')).toBeVisible();
  await expect(page.locator('input.search-entry')).toBeFocused();
  await expect(activities(page)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('.ov-back')).toHaveCount(0);
});

test('the window picker shows live windows; clicking one focuses it and leaves', async ({ page }) => {
  await session(page);
  const a = await launch(page);
  await launch(page, 'test-utility');
  await activities(page).click();
  await expect(page.locator('.preview')).toHaveCount(2);
  const slot = (await page.locator(`.preview[data-preview="${a}"]`).boundingBox())!;
  const win = (await page.locator(`.window[data-win="${a}"]`).boundingBox())!;
  expect(Math.abs(slot.x - win.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(slot.width - win.width)).toBeLessThanOrEqual(2);
  await page.locator(`.preview[data-preview="${a}"]`).click();
  await expect(page.locator('.ov-back')).toHaveCount(0);
  await expect(page.locator(`.window[data-win="${a}"]`)).not.toHaveClass(/backdrop/);
});

test('a preview\'s close button closes the window', async ({ page }) => {
  await session(page);
  const a = await launch(page);
  await activities(page).click();
  await page.locator(`.preview[data-preview="${a}"]`).hover();
  await page.locator(`.preview[data-preview="${a}"]`).getByRole('button', { name: 'Close' }).click();
  await expect.poll(async () => (await wins(page)).length).toBe(0);
});

test('Esc clears the search first, then closes the overview', async ({ page }) => {
  await session(page, false);
  await activities(page).click();
  await page.keyboard.type('xyz');
  await expect(page.locator('.search-statustext')).toHaveText('No results');
  await page.keyboard.press('Escape');
  await expect(page.locator('input.search-entry')).toHaveValue('');
  await expect(page.locator('.ov-back')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ov-back')).toHaveCount(0);
});

test('typing finds an app and Enter launches it', async ({ page }) => {
  await session(page);
  await activities(page).click();
  await page.keyboard.type('test w');
  await expect(page.locator('.grid-results .overview-tile')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await wins(page)).map((w) => w.app)).toEqual(['test-window']);
  await expect(page.locator('.ov-back')).toHaveCount(0);
});

test('a visitor\'s search has no file or settings results until those apps exist', async ({ page }) => {
  await session(page, false);
  await activities(page).click();
  await page.keyboard.type('readme');
  await expect(page.locator('.search-statustext')).toHaveText('No results');
});

test('with the providers on, files and settings answer', async ({ page }) => {
  await session(page);
  await activities(page).click();
  await page.keyboard.type('readme');
  await expect(page.locator('.search-section-content[aria-label="Files"]')).toContainText('README.md');
  await page.locator('input.search-entry').fill('wallpaper');
  await expect(page.locator('.search-section-content[aria-label="Settings"]')).toContainText('Appearance');
});

test('dropping a window on the next workspace moves it; thumbnails show with three workspaces', async ({ page }) => {
  await session(page);
  const a = await launch(page);
  await launch(page);
  await activities(page).click();
  await page.locator(`.preview[data-preview="${a}"]`).dragTo(page.locator('.ws-card.sliver.next'), { targetPosition: { x: 8, y: 100 } });
  await expect.poll(async () => (await wins(page)).find((w) => w.id === a)?.workspace).toBe(1);
  await expect(page.locator('.ws-thumbs .ws-thumb')).toHaveCount(3);
  await expect(page.locator('.ws .dot')).toHaveCount(3);
});

test('the app grid shows apps and folders; a folder opens and Esc closes it first', async ({ page }) => {
  await session(page);
  await page.getByRole('button', { name: 'Show Apps' }).click();
  await expect(page.locator('.app-grid .overview-tile')).toHaveCount(2);
  await page.locator('.overview-tile[data-tile="Utilities"]').click();
  const folder = page.getByRole('dialog', { name: 'Utilities' });
  await expect(folder).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(folder).toHaveCount(0);
  await expect(page.locator('.app-grid')).toBeVisible();
  await page.locator('.overview-tile[data-tile="Utilities"]').click();
  await folder.getByRole('button', { name: 'Test Utility' }).click();
  await expect.poll(async () => (await wins(page)).map((w) => w.app)).toEqual(['test-utility']);
});

test('dragging a tile reorders the grid and the order is kept', async ({ page }) => {
  await session(page);
  await page.getByRole('button', { name: 'Show Apps' }).click();
  const ids = () => page.locator('.app-grid .overview-tile').evaluateAll((els) => els.map((e) => e.getAttribute('data-tile')));
  expect(await ids()).toEqual(['test-window', 'Utilities']);
  await page.locator('[data-tile="Utilities"]').dragTo(page.locator('[data-tile="test-window"]'));
  expect(await ids()).toEqual(['Utilities', 'test-window']);
  await page.reload();
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Show Apps' }).click();
  expect(await ids()).toEqual(['Utilities', 'test-window']);
});

test('a visitor\'s app grid shows the workspace and no apps yet', async ({ page }) => {
  await session(page, false);
  await page.getByRole('button', { name: 'Show Apps' }).click();
  await expect(page.locator('.app-grid .ws-preview')).toHaveCount(1);
  await expect(page.locator('.app-grid .overview-tile')).toHaveCount(0);
});

test('the active workspace dot is the wide one', async ({ page }) => {
  await session(page);
  await launch(page);
  const dots = page.locator('.ws .dot');
  await expect(dots).toHaveCount(2);
  const [first, second] = [(await dots.nth(0).boundingBox())!, (await dots.nth(1).boundingBox())!];
  expect(first.width).toBeGreaterThan(second.width * 3);
});
