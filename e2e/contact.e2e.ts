import { expect, test } from '@playwright/test';

test('clicking the email copies it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const btn = page.locator('[data-copy]');
  await btn.click();
  await expect(btn).toHaveClass(/copied/);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('agab0323@gmail.com');
});

test('the footer toggle cycles theme and remembers it', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.locator('[data-theme-toggle]');
  await expect(html).toHaveAttribute('data-theme', 'system');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toContainText('Light');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(16, 16, 16)');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('[data-theme-toggle]')).toContainText('Dark');
});

test('page still works when localStorage is blocked', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('blocked', 'SecurityError'); },
    });
  });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveClass(/\bjs\b/);
  await expect(html).toHaveAttribute('data-theme', 'system');
  await page.locator('[data-theme-toggle]').click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});
