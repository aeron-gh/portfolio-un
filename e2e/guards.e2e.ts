import { expect, test } from '@playwright/test';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all content is readable', async ({ page }) => {
    await page.goto('/');
    for (const id of ['now', 'oss', 'building', 'earlier', 'stack', 'contact']) {
      const opacity = await page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).opacity);
      expect(opacity, `#${id} opacity`).toBe('1');
    }
    // Blocks that start closed are open without JS.
    await expect(page.getByRole('link', { name: /propagate series set error/ })).toBeVisible();
    // Pin facts fall back to a plain list.
    await expect(page.locator('.pins-list')).toBeVisible();
    await expect(page.locator('.pin-card')).toBeHidden();
  });
});

test('no sideways scrolling on a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  // Read the ids first: clicking changes aria-expanded, which would shift a live list under the loop.
  const closed = await page.locator('.acc-head[aria-expanded="false"]').evaluateAll((els) => els.map((e) => e.id));
  for (const id of closed) await page.locator(`#${id}`).click();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test('browser tests run against the built site, not the dev server', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('script[src*="@vite/client"]').count()).toBe(0);
});

test('every section reveals even at 400% zoom', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 180 });
  await page.goto('/');
  // Open every block first, so sections are as tall as they get.
  await page.evaluate(() => {
    document.querySelectorAll<HTMLButtonElement>('.acc-head[aria-expanded="false"]').forEach((b) => b.click());
  });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 90) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(20);
  }
  const neverShown = await page.locator('.rv:not(.in)').evaluateAll((els) => els.map((e) => e.id || e.className));
  expect(neverShown).toEqual([]);
});
