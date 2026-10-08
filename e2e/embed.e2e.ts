import { expect, test, type Page } from '@playwright/test';

// A same-origin page that embeds the desktop like the homepage does and records its messages.
const HARNESS = `<!doctype html><meta charset="utf-8">
<iframe id="d" src="/desktop-next/?embed=1" style="width:1200px;height:760px;border:0"></iframe>
<script>
  window.msgs = [];
  addEventListener('message', (e) => {
    if (e.origin !== location.origin) return;
    msgs.push(e.data && e.data.type);
  });
</script>`;

const msgs = (page: Page) => page.evaluate(() => (window as unknown as { msgs: string[] }).msgs);
const desktop = (page: Page) => page.frameLocator('#d');

async function openHarness(page: Page) {
  await page.route('**/__harness', (r) => r.fulfill({ contentType: 'text/html', body: HARNESS }));
  await page.goto('/__harness');
  await expect.poll(() => msgs(page)).toContain('desktop:ready');
  await desktop(page).locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(desktop(page).locator('.session')).toBeVisible();
  // Click the empty desktop so keyboard events go into the iframe.
  await desktop(page).locator('.session').click({ position: { x: 600, y: 400 } });
}

test('the embedded desktop says it is ready', async ({ page }) => {
  await page.route('**/__harness', (r) => r.fulfill({ contentType: 'text/html', body: HARNESS }));
  await page.goto('/__harness');
  await expect.poll(() => msgs(page)).toContain('desktop:ready');
  await expect(desktop(page).locator('.gdm-user')).toBeVisible();
});

test('Esc on the login screen goes back to the page; on the password step it first returns to the user list', async ({ page }) => {
  await page.route('**/__harness', (r) => r.fulfill({ contentType: 'text/html', body: HARNESS }));
  await page.goto('/__harness');
  await expect.poll(() => msgs(page)).toContain('desktop:ready');
  await desktop(page).locator('.gdm-user').click();
  await expect(desktop(page).locator('.gdm-prompt input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(desktop(page).locator('.gdm-user')).toBeFocused();
  expect(await msgs(page)).not.toContain('desktop:exit');
  await page.keyboard.press('Escape');
  await expect.poll(() => msgs(page)).toContain('desktop:exit');
});

test('Esc on a quiet desktop asks to exit', async ({ page }) => {
  await openHarness(page);
  await page.keyboard.press('Escape');
  await expect.poll(() => msgs(page)).toContain('desktop:exit');
});

test('Esc that closes the app grid does not exit', async ({ page }) => {
  await openHarness(page);
  await desktop(page).getByRole('button', { name: 'Show Apps' }).click();
  await expect(desktop(page).locator('.app-grid')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(desktop(page).locator('.app-grid')).toHaveCount(0);
  expect(await msgs(page)).not.toContain('desktop:exit');
});

test('Power Off asks to exit; Restart boots back to the login screen instead', async ({ page }) => {
  await openHarness(page);
  const power = async (item: string, confirm: string) => {
    await desktop(page).locator('.panel .status').click();
    await desktop(page).getByRole('button', { name: 'Power Off Menu' }).click();
    await desktop(page).getByRole('menuitem', { name: item }).click();
    await desktop(page).getByRole('alertdialog').getByRole('button', { name: confirm }).click();
  };
  await power('Restart…', 'Restart');
  await expect(desktop(page).locator('.gdm-user')).toBeVisible();
  expect(await msgs(page)).not.toContain('desktop:exit');
  await desktop(page).locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(desktop(page).locator('.session')).toBeVisible();
  await power('Power Off…', 'Power Off');
  await expect.poll(() => msgs(page)).toContain('desktop:exit');
});
