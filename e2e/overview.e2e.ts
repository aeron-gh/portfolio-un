import { expect, test, type Page } from '@playwright/test';

type W = { id: string; app: string; workspace: number };
type Hooks = { ubuntu: { launch: (app: string) => Promise<string>; windows: () => W[]; overview: () => { mode: string; query: string } } };

async function session(page: Page, testApps = true) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/desktop/${testApps ? '?test-apps' : ''}`);
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const launch = (page: Page, app = 'test-window') => page.evaluate((a) => (window as unknown as Hooks).ubuntu.launch(a), app);
const wins = (page: Page) => page.evaluate(() => (window as unknown as Hooks).ubuntu.windows());
const state = (page: Page) => page.evaluate(() => (window as unknown as Hooks).ubuntu.overview());
const activities = (page: Page) => page.getByRole('button', { name: 'Activities' });

/** Holds the Overview's code at the network until release(), as on a slow connection. */
async function holdOverview(page: Page): Promise<() => void> {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route(/\/_astro\/Overview\.[\w-]+\.js$/, async (route) => {
    await gate;
    await route.continue();
  });
  return release;
}

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

test('a visitor\'s search has no settings results until Settings exists', async ({ page }) => {
  await session(page, false);
  await activities(page).click();
  await page.keyboard.type('appearance');
  await expect(page.locator('.search-statustext')).toHaveText('No results');
});

test('Files answers a search, under its own icon; a result opens with its default app', async ({ page }) => {
  await session(page, false);
  await activities(page).click();
  await page.keyboard.type('readme');
  const section = page.locator('.search-section-content[aria-label="Files"]');
  await expect(section).toContainText('README.md');
  await expect(section.locator('.provider img')).toHaveAttribute('src', /org\.gnome\.Nautilus/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'README.md (~/Desktop) - Text Editor' })).toBeVisible();
  await expect(page.locator('input.search-entry')).toHaveCount(0);
});

test('clicking a folder in the results opens it in Files', async ({ page }) => {
  await session(page, false);
  await activities(page).click();
  await page.keyboard.type('Wallpapers');
  await page.locator('.search-section-content[aria-label="Files"]').getByRole('button', { name: /Wallpapers/ }).click();
  await expect(page.getByRole('dialog', { name: 'Wallpapers' })).toBeVisible();
});

test('with the providers on, files and settings answer', async ({ page }) => {
  await session(page);
  await activities(page).click();
  await page.keyboard.type('readme');
  await expect(page.locator('.search-section-content[aria-label="Files"]')).toContainText('README.md');
  await page.locator('input.search-entry').fill('wallpaper');
  await expect(page.locator('.search-section-content[aria-label="Settings"]')).toContainText('Appearance');
});

test('keys typed while the Overview is still loading go into the search', async ({ page }) => {
  const release = await holdOverview(page);
  await session(page);
  await activities(page).click();
  await page.keyboard.type('test w');
  await expect.poll(() => state(page)).toMatchObject({ mode: 'windows', query: 'test w' });
  release();
  await expect(page.locator('input.search-entry')).toHaveValue('test w');
  await page.keyboard.type('i'); // the caret is at the end, as if the visitor had typed into the entry all along
  await expect(page.locator('input.search-entry')).toHaveValue('test wi');
  await expect(page.locator('.grid-results .overview-tile')).toHaveCount(1);
});

test('Esc while the Overview is still loading clears the search, then closes the Overview', async ({ page }) => {
  const release = await holdOverview(page);
  await session(page, false);
  await activities(page).click();
  await page.keyboard.type('ab');
  await page.keyboard.press('Escape');
  await expect.poll(() => state(page)).toMatchObject({ mode: 'windows', query: '' });
  await page.keyboard.press('Escape');
  await expect.poll(() => state(page)).toMatchObject({ mode: 'hidden' });
  release();
  await expect(page.locator('.ov-back')).toHaveCount(0);
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
  await expect(page.locator('.app-grid .overview-tile')).toHaveCount(4);
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
  await expect.poll(ids).toEqual(['files', 'test-window', 'text-editor', 'Utilities']); // by name, as GNOME's grid starts
  await page.locator('[data-tile="Utilities"]').dragTo(page.locator('[data-tile="files"]'));
  await expect.poll(ids).toEqual(['Utilities', 'files', 'test-window', 'text-editor']);
  await page.reload();
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Show Apps' }).click();
  await expect.poll(ids).toEqual(['Utilities', 'files', 'test-window', 'text-editor']);
});

test('a visitor\'s app grid shows the workspace and the built apps', async ({ page }) => {
  await session(page, false);
  await page.getByRole('button', { name: 'Show Apps' }).click();
  await expect(page.locator('.app-grid .ws-preview')).toHaveCount(1);
  await expect(page.locator('.app-grid .overview-tile')).toHaveCount(2);
  await expect(page.locator('.app-grid .overview-tile[data-tile="files"]')).toContainText('Files');
  await expect(page.locator('.app-grid .overview-tile[data-tile="text-editor"]')).toContainText('Text Editor');
});

test('the active workspace dot is the wide one', async ({ page }) => {
  await session(page);
  await launch(page);
  const dots = page.locator('.ws .dot');
  await expect(dots).toHaveCount(2);
  const [first, second] = [(await dots.nth(0).boundingBox())!, (await dots.nth(1).boundingBox())!];
  expect(first.width).toBeGreaterThan(second.width * 3);
});
