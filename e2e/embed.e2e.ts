import { expect, test, type Page } from '@playwright/test';

// A same-origin page that embeds the desktop like the homepage does and records its messages.
const HARNESS = `<!doctype html><meta charset="utf-8">
<iframe id="d" src="/desktop/?embed=1" style="width:1200px;height:760px;border:0"></iframe>
<script>
  window.msgs = [];
  addEventListener('message', (e) => {
    if (e.origin !== location.origin) return;
    const type = e.data && e.data.type;
    msgs.push(type);
    if (type === 'desktop:ready' && !window.readyAt) window.readyAt = performance.now();
  });
</script>`;

const msgs = (page: Page) => page.evaluate(() => (window as unknown as { msgs: string[] }).msgs);
const desktop = (page: Page) => page.frameLocator('#d');

async function openHarness(page: Page) {
  await page.route('**/__harness', (r) => r.fulfill({ contentType: 'text/html', body: HARNESS }));
  await page.goto('/__harness');
  await expect.poll(() => msgs(page)).toContain('desktop:ready');
  // Click the empty desktop so keyboard events go into the iframe.
  await desktop(page).locator('#desktop-area').click({ position: { x: 700, y: 400 } });
}

test('the embedded desktop says ready quickly, with no boot screen', async ({ page }) => {
  await page.route('**/__harness', (r) => r.fulfill({ contentType: 'text/html', body: HARNESS }));
  await page.goto('/__harness');
  await expect.poll(() => msgs(page)).toContain('desktop:ready');
  // Measured inside the harness page, so a busy test machine does not count. The old boot waited 3 s.
  expect(await page.evaluate(() => (window as unknown as { readyAt: number }).readyAt)).toBeLessThan(2500);
  await expect(desktop(page).locator('#desktop')).toBeVisible();
  await expect(desktop(page).locator('#boot-screen')).toBeHidden();
});

test('Esc on a quiet desktop asks to exit', async ({ page }) => {
  await openHarness(page);
  await page.keyboard.press('Escape');
  await expect.poll(() => msgs(page)).toContain('desktop:exit');
});

test('Esc that closes the app grid does not exit', async ({ page }) => {
  await openHarness(page);
  await desktop(page).locator('#show-apps-btn').click();
  await expect(desktop(page).locator('.ubuntu-app-grid-overlay')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(desktop(page).locator('.ubuntu-app-grid-overlay')).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(await msgs(page)).not.toContain('desktop:exit');
});

test('Esc while typing in the terminal does not exit', async ({ page }) => {
  await openHarness(page);
  await desktop(page).locator('.dock-item[data-app="terminal"]').click();
  const input = desktop(page).locator('.terminal-input:not([disabled])');
  await input.click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  expect(await msgs(page)).not.toContain('desktop:exit');
});

test('Power off asks to exit instead of reloading', async ({ page }) => {
  await openHarness(page);
  await desktop(page).locator('#system-tray').click();
  await desktop(page).locator('#power-btn').click();
  await desktop(page).locator('.power-btn-option[data-action="shutdown"]').click();
  await expect.poll(() => msgs(page)).toContain('desktop:exit');
});

test('Restart also asks to exit', async ({ page }) => {
  await openHarness(page);
  await desktop(page).locator('#system-tray').click();
  await desktop(page).locator('#restart-btn').click();
  await expect.poll(() => msgs(page)).toContain('desktop:exit');
});

test('the standalone desktop boots without the old 3-second wait', async ({ page }) => {
  await page.goto('/desktop/');
  await expect(page.locator('#desktop')).toBeVisible();
  // Measured inside the page (time since its own navigation started), so a busy test machine
  // does not count. The old fake boot took at least 3000 ms.
  const shownAt = await page.evaluate(() => performance.now());
  expect(shownAt).toBeLessThan(2500);
});
