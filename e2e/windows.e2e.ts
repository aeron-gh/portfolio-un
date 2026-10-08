import { expect, test, type Page } from '@playwright/test';

type W = { id: string; state: string; minimized: boolean; rect: { x: number; y: number; w: number; h: number } };
type Hooks = { ubuntu: { launch: (app: string) => Promise<string>; close: (id: string) => void; windows: () => W[] } };

async function session(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/desktop-next/?test-apps');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const launch = (page: Page, app = 'test-window') => page.evaluate((a) => (window as unknown as Hooks).ubuntu.launch(a), app);
const wins = (page: Page) => page.evaluate(() => (window as unknown as Hooks).ubuntu.windows());
const frame = (page: Page, id: string) => page.locator(`.window[data-win="${id}"]`);

async function dragBy(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

test('a launched app opens centred in the work area, focused', async ({ page }) => {
  await session(page);
  const id = await launch(page);
  const w = frame(page, id);
  await expect(w.locator('.title')).toHaveText('Test Window');
  const box = (await w.boundingBox())!;
  expect(Math.round(box.x)).toBe(66 + Math.round((1214 - 640) / 2));
  expect(Math.round(box.y)).toBe(32 + Math.round((768 - 420) / 2));
  await expect(w).not.toHaveClass(/backdrop/);
});

test('header buttons minimise, maximise, restore and close', async ({ page }) => {
  await session(page);
  const id = await launch(page);
  const w = frame(page, id);
  await w.getByRole('button', { name: 'Maximize' }).click();
  await expect.poll(async () => (await w.boundingBox())?.width).toBe(1214);
  await w.getByRole('button', { name: 'Restore' }).click();
  await expect.poll(async () => (await w.boundingBox())?.width).toBe(640);
  await w.getByRole('button', { name: 'Minimize' }).click();
  await expect(w).toHaveClass(/hidden/);
  expect((await wins(page))[0].minimized).toBe(true);
  await page.evaluate((i) => (window as unknown as Hooks).ubuntu.close(i), id);
  await expect(w).toHaveCount(0);
});

test('double-clicking the header bar maximises', async ({ page }) => {
  await session(page);
  const id = await launch(page);
  await frame(page, id).locator('.title').dblclick();
  await expect.poll(async () => (await wins(page))[0].state).toBe('maximized');
});

test('the window behind dims its header and comes forward when clicked', async ({ page }) => {
  await session(page);
  const a = await launch(page);
  const b = await launch(page);
  await expect(frame(page, a)).toHaveClass(/backdrop/);
  const box = (await frame(page, a).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + 12);
  await expect(frame(page, a)).not.toHaveClass(/backdrop/);
  await expect(frame(page, b)).toHaveClass(/backdrop/);
});

test('dragging the header bar moves the window', async ({ page }) => {
  await session(page);
  const id = await launch(page);
  const box = (await frame(page, id).boundingBox())!;
  await dragBy(page, { x: box.x + 100, y: box.y + 20 }, { x: box.x + 200, y: box.y + 70 });
  const after = (await frame(page, id).boundingBox())!;
  expect(Math.round(after.x - box.x)).toBe(100);
  expect(Math.round(after.y - box.y)).toBe(50);
});

test('dragging to the top edge maximises; grabbing it again restores the size', async ({ page }) => {
  await session(page);
  const id = await launch(page);
  const box = (await frame(page, id).boundingBox())!;
  await dragBy(page, { x: box.x + 100, y: box.y + 20 }, { x: 640, y: 5 });
  await expect.poll(async () => (await wins(page))[0].state).toBe('maximized');
  await dragBy(page, { x: 640, y: 50 }, { x: 640, y: 300 });
  const w = (await wins(page))[0];
  expect(w.state).toBe('normal');
  expect(w.rect.w).toBe(640);
});

test('dragging to the left edge tiles; the tiling popup offers the other window', async ({ page }) => {
  await session(page);
  const a = await launch(page);
  const b = await launch(page);
  const box = (await frame(page, a).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(5, 400, { steps: 8 });
  await expect(page.locator('.tile-preview')).toBeVisible();
  await page.mouse.up();
  await expect.poll(async () => (await wins(page)).find((w) => w.id === a)?.state).toBe('tiled-left');
  await page.locator(`.tiling-popup .item-box[data-id="${b}"]`).click();
  await expect.poll(async () => (await wins(page)).find((w) => w.id === b)?.state).toBe('tiled-right');
  await expect(page.locator('.tiling-popup')).toHaveCount(0);
});

test('resizing from an edge keeps the minimum size', async ({ page }) => {
  await session(page);
  const id = await launch(page);
  const e = (await frame(page, id).locator('.edge.e').boundingBox())!;
  const at = { x: e.x + e.width / 2, y: e.y + e.height / 2 };
  await dragBy(page, at, { x: at.x + 100, y: at.y });
  expect((await wins(page))[0].rect.w).toBe(740);
  const e2 = (await frame(page, id).locator('.edge.e').boundingBox())!;
  await dragBy(page, { x: e2.x + e2.width / 2, y: e2.y + e2.height / 2 }, { x: 10, y: at.y });
  expect((await wins(page))[0].rect.w).toBe(320);
});

test('a window shrunk by a smaller browser stays reachable', async ({ page }) => {
  await session(page);
  const id = await launch(page);
  const box = (await frame(page, id).boundingBox())!;
  await dragBy(page, { x: box.x + 100, y: box.y + 20 }, { x: 1270, y: 780 });
  await page.setViewportSize({ width: 900, height: 600 });
  await expect.poll(async () => (await wins(page))[0].rect.x).toBeLessThanOrEqual(900 - 40);
  const w = (await wins(page))[0];
  expect(w.rect.y).toBeLessThanOrEqual(600 - 40);
  expect(w.rect.x + w.rect.w).toBeGreaterThan(66 + 40);
});

test.describe('with animations', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('closing a window while it opens leaves no ghost', async ({ page }) => {
    await session(page);
    const id = await launch(page);
    await page.evaluate((i) => (window as unknown as Hooks).ubuntu.close(i), id);
    await expect(page.locator('.window')).toHaveCount(0);
    expect(await wins(page)).toEqual([]);
  });

  test('minimise plays GNOME\'s animation, then hides the window', async ({ page }) => {
    await session(page);
    const id = await launch(page);
    await page.waitForTimeout(200);
    await frame(page, id).getByRole('button', { name: 'Minimize' }).click();
    await expect(frame(page, id)).toHaveClass(/minimizing/);
    await expect(frame(page, id)).toHaveClass(/hidden/, { timeout: 2000 });
  });
});
