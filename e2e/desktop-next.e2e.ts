import { expect, test } from '@playwright/test';

test('desktop-next boots without script errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/desktop-next/');
  await expect(page.locator('#plymouth')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-desktop', 'mounted');
  expect(errors).toEqual([]);
});
