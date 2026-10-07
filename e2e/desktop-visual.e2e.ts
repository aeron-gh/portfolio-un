import { expect, test, type Page } from '@playwright/test';

// Fixed time and no Battery API, so screenshots are identical on every run.
async function prepare(page: Page, style: 'light' | 'dark') {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.clock.setFixedTime(new Date('2026-04-14T14:16:00'));
  await page.addInitScript((s) => {
    localStorage.setItem('ubuntu.settings.v1', JSON.stringify({ style: s, clock24: true }));
    delete (Navigator.prototype as unknown as Record<string, unknown>).getBattery;
  }, style);
}

for (const style of ['light', 'dark'] as const) {
  test(`login screen (${style})`, async ({ page }) => {
    await prepare(page, style);
    await page.goto('/desktop-next/');
    await expect(page.locator('.gdm-user')).toBeVisible();
    await expect(page).toHaveScreenshot(`login-${style}.png`);
  });

  test(`session desktop (${style})`, async ({ page }) => {
    await prepare(page, style);
    await page.goto('/desktop-next/');
    await page.locator('.gdm-user').click();
    await page.keyboard.press('Enter');
    await expect(page.locator('.wall.real.show')).toBeVisible();
    await expect(page).toHaveScreenshot(`session-${style}.png`);
  });

  test(`lock screen (${style})`, async ({ page }) => {
    await prepare(page, style);
    await page.goto('/desktop-next/');
    await page.locator('.gdm-user').click();
    await page.keyboard.press('Enter');
    await expect(page.locator('.wall.real.show')).toBeVisible();
    await page.evaluate(() => (window as unknown as { ubuntu: { lock: () => void } }).ubuntu.lock());
    await expect(page.locator('.lock-time')).toBeVisible();
    await expect(page).toHaveScreenshot(`lock-${style}.png`);
  });
}
