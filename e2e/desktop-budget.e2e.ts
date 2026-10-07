import { expect, test } from '@playwright/test';

test('icons downloaded by boot, login and session are at most 40 KB', async ({ page }) => {
  const sizes = new Map<string, number>();
  const pending: Promise<void>[] = [];
  page.on('response', (res) => {
    if (!/\/_astro\/.+\.(svg|png)$/.test(new URL(res.url()).pathname)) return;
    pending.push(res.body().then((b) => void sizes.set(res.url(), b.length)));
  });
  await page.goto('/desktop-next/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.desktop-icon').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await Promise.all(pending);
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
  expect(total).toBeLessThanOrEqual(40 * 1024);
});
