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
    await page.goto('/desktop/');
    await expect(page.locator('.gdm-user')).toBeVisible();
    await expect(page).toHaveScreenshot(`login-${style}.png`);
  });

  test(`session desktop (${style})`, async ({ page }) => {
    await prepare(page, style);
    await page.goto('/desktop/');
    await page.locator('.gdm-user').click();
    await page.keyboard.press('Enter');
    await expect(page.locator('.wall.real.show')).toBeVisible();
    await expect(page).toHaveScreenshot(`session-${style}.png`);
  });

  test(`shell surfaces (${style})`, async ({ page }) => {
    test.setTimeout(60_000); // nine screenshots: on a busy machine this passes 30s
    await prepare(page, style);
    await page.goto('/desktop/?test-apps');
    await page.locator('.gdm-user').click();
    await page.keyboard.press('Enter');
    await expect(page.locator('.wall.real.show')).toBeVisible();
    const shot = async (name: string) => {
      await page.mouse.move(1270, 790);
      await expect(page).toHaveScreenshot(`${name}-${style}.png`);
      await page.keyboard.press('Escape');
    };
    await page.locator('.panel .status').click();
    await shot('quick-settings');
    await page.locator('.panel .clock-display').click();
    await shot('date-menu');
    await page.mouse.click(700, 300, { button: 'right' });
    await shot('desktop-menu');
    await page.locator('.panel .ws').click();
    await shot('overview');
    await page.keyboard.press('Meta+KeyA');
    await expect(page.locator('.app-grid')).toBeVisible();
    await shot('app-grid');
    await page.evaluate(() => (window as unknown as { ubuntu: { launch: (a: string) => Promise<string> } }).ubuntu.launch('test-window'));
    await page.mouse.move(1270, 790);
    await expect(page).toHaveScreenshot(`window-${style}.png`);
    await page.locator('nav.dock .tile[data-app="test-window"]').click({ button: 'right' });
    await shot('dock-menu');
    await page.locator('.panel .status').click();
    await page.getByRole('dialog', { name: 'System' }).getByRole('button', { name: 'Power Off Menu' }).click();
    await page.getByRole('menuitem', { name: 'Power Off…' }).click();
    await shot('power-off');
  });

  test(`text editor (${style})`, async ({ page }) => {
    await prepare(page, style);
    await page.goto('/desktop/');
    await page.locator('.gdm-user').click();
    await page.keyboard.press('Enter');
    await expect(page.locator('.wall.real.show')).toBeVisible();
    await page.locator('.desktop-icon[data-path="/home/ubuntu/Desktop/README.md"]').dblclick();
    const win = page.locator('.window[data-app="text-editor"]');
    await expect(win.getByRole('textbox')).toBeFocused();
    await page.mouse.move(1270, 790);
    await expect(page).toHaveScreenshot(`text-editor-${style}.png`);
    await win.getByRole('button', { name: 'Main Menu' }).click();
    await page.mouse.move(1270, 790);
    await expect(page).toHaveScreenshot(`text-editor-menu-${style}.png`);
    await page.keyboard.press('Escape'); // focus goes back to the menu button, as in GTK
    await win.getByRole('textbox').focus();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('x');
    await win.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.mouse.move(1270, 790);
    await expect(page).toHaveScreenshot(`text-editor-save-${style}.png`);
  });

  test(`files (${style})`, async ({ page }) => {
    test.setTimeout(60_000);
    await prepare(page, style);
    await page.goto('/desktop/');
    await page.locator('.gdm-user').click();
    await page.keyboard.press('Enter');
    await expect(page.locator('.wall.real.show')).toBeVisible();
    await page.getByRole('button', { name: 'Files', exact: true }).click();
    const win = page.locator('.window[data-app="files"]');
    const item = (name: string) => win.getByRole('listbox', { name: 'Content' }).getByRole('option', { name, exact: true });
    await expect(item('Documents')).toBeVisible();
    await page.mouse.move(1270, 790);
    await expect(page).toHaveScreenshot(`files-${style}.png`);
    await item('Documents').click({ button: 'right' });
    await page.mouse.move(1270, 790);
    await expect(page).toHaveScreenshot(`files-menu-${style}.png`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(3100); // Esc moved the focus: GTK's ring stays 3 seconds, and would show on the next menu
    await win.getByRole('button', { name: 'View Options' }).click();
    await page.mouse.move(1270, 790);
    await expect(page).toHaveScreenshot(`files-view-options-${style}.png`);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Shift+N');
    await page.keyboard.type('Reports');
    await page.mouse.move(1270, 790);
    await expect(page).toHaveScreenshot(`files-new-folder-${style}.png`);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+1');
    await page.mouse.move(1270, 790);
    // The dates are relative to today, so they are left out of the picture.
    await expect(page).toHaveScreenshot(`files-list-${style}.png`, { mask: [win.locator('.date')] });
  });

  test(`lock screen (${style})`, async ({ page }) => {
    await prepare(page, style);
    await page.goto('/desktop/');
    await page.locator('.gdm-user').click();
    await page.keyboard.press('Enter');
    await expect(page.locator('.wall.real.show')).toBeVisible();
    await page.evaluate(() => (window as unknown as { ubuntu: { lock: () => void } }).ubuntu.lock());
    await expect(page.locator('.lock-time')).toBeVisible();
    await expect(page).toHaveScreenshot(`lock-${style}.png`);
  });
}
