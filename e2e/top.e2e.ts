import { expect, test } from '@playwright/test';

test('header gains a border and the progress line moves after scrolling', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('[data-header]');
  await expect(header).not.toHaveClass(/scrolled/);
  await page.mouse.wheel(0, 600);
  await expect(header).toHaveClass(/scrolled/);
  const transform = await page.locator('[data-progress]').evaluate((el) => (el as HTMLElement).style.transform);
  expect(transform).toMatch(/^scaleX\((0\.\d+|1)\)$/);
});

test('the miniature terminal shows its commands', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-term]')).toContainText('whoami');
});

test('clocks are filled in', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-clock]').first()).toHaveText(/^\d{2}:\d{2}$/);
});

test('the miniature top bar sits at the top edge', async ({ page }) => {
  await page.goto('/');
  const mini = await page.locator('[data-mini]').boundingBox();
  const bar = await page.locator('.m-tb').boundingBox();
  expect(Math.abs(bar!.y - mini!.y)).toBeLessThan(1);
});

test('the miniature terminal keeps its newest line visible on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const box = await page.locator('.m-term').boundingBox();
  const text = await page.locator('[data-term]').boundingBox();
  expect(text!.y + text!.height).toBeLessThanOrEqual(box!.y + box!.height + 0.5);
});
