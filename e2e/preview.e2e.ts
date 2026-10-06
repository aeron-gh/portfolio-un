import { expect, test } from '@playwright/test';

test('hovering an Earlier row shows its preview, leaving hides it', async ({ page }) => {
  await page.goto('/');
  await page.locator('#earlier a.row', { hasText: 'CollabCode' }).hover();
  const prev = page.locator('[data-prev]');
  await expect(prev).toHaveClass(/show/);
  await expect(prev.locator('[data-k="collab"]')).toHaveClass(/\bon\b/);
  await page.mouse.move(5, 5);
  await expect(prev).not.toHaveClass(/show/);
});

test('an open Building block shows no preview, a closed one does', async ({ page }) => {
  await page.goto('/');
  const prev = page.locator('[data-prev]');
  await page.locator('#partlore-head').hover();
  await expect(prev).not.toHaveClass(/show/);
  await page.locator('#opentrail-head').hover();
  await expect(prev).toHaveClass(/show/);
  await expect(prev.locator('[data-k="opentrail"]')).toHaveClass(/\bon\b/);
});
