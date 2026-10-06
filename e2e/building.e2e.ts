import { expect, test } from '@playwright/test';

test('hovering a pin shows its gotcha', async ({ page }) => {
  await page.goto('/');
  const pin = page.locator('.pin', { hasText: 'GPIO12' });
  await pin.hover();
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-pin-fact]')).toContainText('flash supply to 1.8 V');
  await expect(page.locator('[data-pin-label]')).toHaveText('GPIO12');
});

test('pins work from the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.locator('.pin', { hasText: 'GPIO34–39' }).focus();
  await expect(page.locator('[data-pin-fact]')).toContainText('Input only');
});

test('each pin links its own source', async ({ page }) => {
  await page.goto('/');
  await page.locator('.pin', { hasText: 'ADC2' }).hover();
  const src = page.locator('[data-pin-src]');
  await expect(page.locator('[data-pin-fact]')).toContainText("Can't be read while Wi-Fi is on");
  await expect(src).toHaveText('Source: ESP-IDF GPIO docs');
  await expect(src).toHaveAttribute('href', /docs\.espressif\.com\/projects\/esp-idf\/.*\/peripherals\/gpio\.html/);
});
