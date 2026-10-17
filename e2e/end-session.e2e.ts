import { expect, test, type Page } from '@playwright/test';

type Hooks = { ubuntu: { launch: (app: string) => Promise<string>; windows: () => unknown[]; overview: () => { mode: string } } };

async function session(page: Page, testApps = false) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/desktop/${testApps ? '?test-apps' : ''}`);
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
async function powerMenu(page: Page, item: string) {
  await page.locator('.panel .status').click();
  const qs = page.getByRole('dialog', { name: 'System' });
  await qs.getByRole('button', { name: 'Power Off Menu' }).click();
  await qs.getByRole('menuitem', { name: item }).click();
}
const inside = (page: Page) => page.evaluate(() => !!document.activeElement?.closest('[role="alertdialog"]'));

test('Power Off… asks first: title, the 60-second text, Cancel then Power Off; Esc cancels', async ({ page }) => {
  await session(page);
  await powerMenu(page, 'Power Off…');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('heading')).toHaveText('Power Off');
  await expect(dialog).toContainText('The system will power off automatically in 60 seconds');
  await expect(dialog.getByRole('button')).toHaveText(['Cancel', 'Power Off']);
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await expect(page.locator('.lightbox')).toHaveCSS('background-image', /radial-gradient/);
  await expect(page.getByRole('dialog', { name: 'System' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.session')).toBeVisible();
});

test('the countdown shows tens, then seconds, then powers off by itself', async ({ page }) => {
  await page.clock.install();
  await session(page);
  await page.clock.pauseAt(Date.now() + 2000);
  await powerMenu(page, 'Power Off…');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('in 60 seconds');
  await page.clock.runFor(10_000);
  await expect(dialog).toContainText('in 50 seconds');
  await page.clock.runFor(41_000);
  await expect(dialog).toContainText('in 9 seconds');
  await page.clock.runFor(8_000);
  await expect(dialog).toContainText('in 1 second');
  await page.clock.runFor(1_000);
  await expect(page.locator('.poweroff')).toBeVisible();
});

test('Log Out… names the user and logs out; the next login starts with no windows', async ({ page }) => {
  await session(page, true);
  await page.evaluate(() => (window as unknown as Hooks).ubuntu.launch('test-window'));
  await powerMenu(page, 'Log Out…');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('heading')).toHaveText('Log Out Abhishek Agarwal');
  await expect(dialog).toContainText('Abhishek Agarwal will be logged out automatically in 60 seconds');
  await dialog.getByRole('button', { name: 'Log Out' }).click();
  await expect(page.locator('.gdm')).toBeVisible();
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Hooks).ubuntu.windows().length)).toBe(0);
});

test('Restart… restarts to the login screen', async ({ page }) => {
  await session(page);
  await powerMenu(page, 'Restart…');
  await expect(page.getByRole('alertdialog')).toContainText('The system will restart automatically in 60 seconds');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Restart' }).click();
  await expect(page.locator('.gdm')).toBeVisible();
});

test('the end-session dialog keeps focus inside; Ctrl+Alt+Delete opens it and focus comes back', async ({ page }) => {
  await session(page);
  const home = page.locator('.desktop-icon[data-path="/home/ubuntu"]');
  await home.focus();
  await page.keyboard.press('Control+Alt+Delete');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('heading')).toHaveText('Log Out Abhishek Agarwal');
  for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    expect(await inside(page)).toBe(true);
  }
  await page.keyboard.press('Meta');
  expect(await page.evaluate(() => (window as unknown as Hooks).ubuntu.overview().mode)).toBe('hidden');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(home).toBeFocused();
});

test('Suspend darkens the screen; the key or click that wakes it shows the lock screen and does nothing else', async ({ page }) => {
  await session(page);
  await powerMenu(page, 'Suspend');
  await expect(page.locator('.suspended')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await page.keyboard.press('a');
  await expect(page.locator('.suspended')).toHaveCount(0);
  await expect(page.locator('.lock-clock')).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.locator('.lock')).toHaveCount(0);
  await powerMenu(page, 'Suspend');
  await page.mouse.click(600, 400);
  await expect(page.locator('.suspended')).toHaveCount(0);
  await expect(page.locator('.lock-clock')).toBeVisible();
});

test('embedded: Esc cancels the dialog and stays on the desktop', async ({ page }) => {
  const HARNESS = `<!doctype html><meta charset="utf-8"><iframe id="d" src="/desktop/?embed=1" style="width:1200px;height:760px;border:0"></iframe><script>window.msgs=[];addEventListener('message',(e)=>{if(e.origin===location.origin)msgs.push(e.data&&e.data.type)});</script>`;
  await page.route('**/__harness', (r) => r.fulfill({ contentType: 'text/html', body: HARNESS }));
  await page.goto('/__harness');
  const d = page.frameLocator('#d');
  await d.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(d.locator('.session')).toBeVisible();
  await page.keyboard.press('Control+Alt+Delete');
  await expect(d.getByRole('alertdialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(d.getByRole('alertdialog')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { msgs: string[] }).msgs)).not.toContain('desktop:exit');
});

test('the "no app" dialog keeps focus inside and gives it back to the icon', async ({ page }) => {
  await session(page);
  const home = page.locator('.desktop-icon[data-path="/home/ubuntu"]'); // a folder: Files is not built yet
  await home.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab');
    expect(await inside(page)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(home).toBeFocused();
});
