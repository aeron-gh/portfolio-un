import { expect, test } from '@playwright/test';

test('Ctrl K opens the menu, filters, and runs a command', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Command menu' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.keyboard.type('contact');
  await expect(page.getByRole('option').first()).toHaveText('Go to Contact');
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#contact')).toBeInViewport();
});

test('arrow keys move the selection', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('combobox')).toBeFocused();
  const options = page.getByRole('option');
  await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(options.nth(0)).toHaveAttribute('aria-selected', 'false');
});

test('the menu code loads only when first opened', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const before = scripts.length;
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeVisible();
  expect(scripts.length).toBeGreaterThan(before);
});

test('Escape closes the menu and gives focus back', async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('[data-cmdk]');
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('U boots the machine, but not while typing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    (window as unknown as { boots: number }).boots = 0;
    window.addEventListener('machine:boot', () => { (window as unknown as { boots: number }).boots++; });
  });
  const boots = () => page.evaluate(() => (window as unknown as { boots: number }).boots);

  // Typing in the menu first: U opens a full-screen desktop, which would take the keyboard.
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('combobox')).toBeFocused();
  await page.keyboard.type('u');
  expect(await boots()).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeHidden();

  await page.keyboard.press('u');
  expect(await boots()).toBe(1);
});

test('the boot pill and the miniature fire the boot event', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    (window as unknown as { boots: number }).boots = 0;
    window.addEventListener('machine:boot', () => { (window as unknown as { boots: number }).boots++; });
  });
  await page.locator('.boot-pill').click();
  // The pill opens the desktop over the page; close it before using the miniature.
  await expect(page.locator('[data-desk]')).toHaveClass(/\bready\b/);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-desk]')).toBeHidden();
  await page.locator('[data-mini]').click();
  expect(await page.evaluate(() => (window as unknown as { boots: number }).boots)).toBe(2);
});

test('typing right after the first Ctrl K goes into the menu, not to the page', async ({ page }) => {
  // Slow the menu code down, like a slow phone connection would.
  await page.route(/command-menu\.[\w-]+\.js$/, async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.continue();
  });
  await page.goto('/');
  await page.evaluate(() => {
    (window as unknown as { boots: number }).boots = 0;
    window.addEventListener('machine:boot', () => { (window as unknown as { boots: number }).boots++; });
  });
  await page.keyboard.press('Control+k');
  await page.keyboard.type('ubu');
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveValue('ubu');
  await expect(page.getByRole('option').first()).toHaveText(/Boot Ubuntu machine/);
  expect(await page.evaluate(() => (window as unknown as { boots: number }).boots)).toBe(0);
});

test('if the menu code fails to load, the empty box does not stay open', async ({ page }) => {
  await page.route(/command-menu\.[\w-]+\.js$/, (route) => route.abort());
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeHidden();
  // Focus must not be left on the hidden input.
  expect(await page.evaluate(() => !!document.activeElement?.closest('[data-pal]'))).toBe(false);
});

test('clicking inside the menu keeps focus there, so Tab stays and Esc still closes', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox');
  await expect(input).toBeFocused();
  await page.keyboard.type('zzz');
  await page.getByText('No results').click();
  await expect(input).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeHidden();
});

test('the page behind the open menu is inert, and comes back after closing', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('combobox')).toBeFocused();
  await expect(page.locator('main')).toHaveJSProperty('inert', true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeHidden();
  await expect(page.locator('main')).toHaveJSProperty('inert', false);
});
