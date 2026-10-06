import { expect, test, type Page } from '@playwright/test';

const desk = (page: Page) => page.locator('[data-desk]');

async function bootAndWait(page: Page) {
  await page.goto('/');
  await page.keyboard.press('u');
  await expect(desk(page)).toHaveClass(/\bready\b/);
}

test('U boots the desktop and gives it focus', async ({ page }) => {
  await bootAndWait(page);
  await expect(page.frameLocator('.desk-frame').locator('#desktop')).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.classList.contains('desk-frame'))).toBe(true);
});

test('the page behind is locked while the desktop is open', async ({ page }) => {
  await bootAndWait(page);
  await expect(page.locator('main')).toHaveJSProperty('inert', true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
});

test('Esc inside the desktop shuts it down and gives the page back', async ({ page }) => {
  await bootAndWait(page);
  await page.frameLocator('.desk-frame').locator('#desktop-area').click({ position: { x: 600, y: 300 } });
  await page.keyboard.press('Escape');
  await expect(desk(page)).toBeHidden();
  await expect(page.locator('.desk-frame')).toHaveCount(0);
  await expect(page.locator('main')).toHaveJSProperty('inert', false);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeVisible();
});

test('focus returns to the miniature after shutdown', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mini]').click();
  await expect(desk(page)).toHaveClass(/\bready\b/);
  await page.keyboard.press('Escape');
  await expect(desk(page)).toBeHidden();
  await expect(page.locator('[data-mini]')).toBeFocused();
});

test('the power button inside the desktop also returns to the page', async ({ page }) => {
  await bootAndWait(page);
  const frame = page.frameLocator('.desk-frame');
  await frame.locator('#system-tray').click();
  await frame.locator('#power-btn').click();
  await frame.locator('.power-btn-option[data-action="shutdown"]').click();
  await expect(desk(page)).toBeHidden();
});

test('booting twice quickly opens one desktop', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('u');
  await page.keyboard.press('u');
  await page.locator('[data-mini]').dispatchEvent('click');
  await expect(desk(page)).toHaveClass(/\bready\b/);
  await expect(page.locator('.desk-frame')).toHaveCount(1);
});

test('Ctrl K does nothing while the desktop is open', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('u');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeHidden();
});

test('if the desktop never starts, an error offers Retry and Close', async ({ page }) => {
  await page.clock.install();
  await page.route('**/desktop/**', (r) => r.abort());
  await page.goto('/');
  await page.keyboard.press('u');
  await page.clock.runFor(8100);
  await expect(page.locator('[data-desk-error]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeFocused();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(desk(page)).toBeHidden();
});

test('a hint says how to come back', async ({ page }) => {
  await bootAndWait(page);
  await expect(page.locator('.desk-hint')).toHaveText('Press Esc to come back to the page');
  await expect(desk(page)).toHaveClass(/\bhint\b/);
});

test('hovering the boot pill prefetches the desktop', async ({ page }) => {
  await page.goto('/');
  await page.locator('.boot-pill').hover();
  await expect(page.locator('link[rel="prefetch"][href="/desktop/app.js"]')).toHaveCount(1);
});

test.describe('with motion on', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the grow and shrink animations still finish', async ({ page }) => {
    await bootAndWait(page);
    await page.frameLocator('.desk-frame').locator('#desktop-area').click({ position: { x: 600, y: 300 } });
    await page.keyboard.press('Escape');
    await expect(desk(page)).toBeHidden();
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('tapping the miniature shows a hint instead of booting', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-mini]').tap();
    await expect(page.locator('#toast')).toContainText('Boot it on a laptop');
    await expect(desk(page)).toBeHidden();
    await expect(page.locator('.desk-frame')).toHaveCount(0);
  });

  test('the desktop is never prefetched', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.clock.runFor(4000);
    await expect(page.locator('link[rel="prefetch"]')).toHaveCount(0);
  });
});
