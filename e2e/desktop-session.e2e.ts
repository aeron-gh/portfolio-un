import { expect, test, type Page } from '@playwright/test';

async function loginToSession(page: Page) {
  await page.goto('/desktop-next/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}

test('boots through Plymouth to the login screen', async ({ page }) => {
  await page.goto('/desktop-next/');
  await expect(page.locator('.gdm')).toBeVisible();
  await expect(page.locator('#plymouth')).toHaveClass(/\bdone\b/);
  await expect(page.locator('.gdm-user')).toContainText('Abhishek Agarwal');
});

test('Enter, Enter logs in from the keyboard', async ({ page }) => {
  await page.goto('/desktop-next/');
  await expect(page.locator('.gdm-user')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.gdm-prompt input')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
  await expect(page.locator('.panel .clock')).toHaveText(/[A-Z][a-z]{2} \d{1,2}\s*\d{1,2}:\d{2}/);
});

test('Esc in the password field goes back to the user list', async ({ page }) => {
  await page.goto('/desktop-next/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.gdm-user')).toBeVisible();
});

test('lock and unlock', async ({ page }) => {
  await loginToSession(page);
  await page.evaluate(() => (window as unknown as { ubuntu: { lock: () => void } }).ubuntu.lock());
  await expect(page.locator('.lock-time')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('.lock input')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.lock')).toHaveCount(0);
  await expect(page.locator('.session')).toBeVisible();
});

test('log out returns to the login screen', async ({ page }) => {
  await loginToSession(page);
  await page.evaluate(() => (window as unknown as { ubuntu: { logout: () => void } }).ubuntu.logout());
  await expect(page.locator('.gdm')).toBeVisible();
});

test('standalone power off shows a black screen; click powers back on', async ({ page }) => {
  await loginToSession(page);
  await page.evaluate(() => (window as unknown as { ubuntu: { powerOff: () => void } }).ubuntu.powerOff());
  await expect(page.locator('.poweroff')).toBeVisible();
  await page.locator('.poweroff').click();
  await expect(page.locator('.gdm')).toBeVisible();
});

test('boots and logs in when localStorage is blocked', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await loginToSession(page);
  expect(errors).toEqual([]);
});

test('a saved file system without ~/Desktop still logs in', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('ubuntu.fs.v1', JSON.stringify({ '/home/ubuntu/Desktop': null })));
  await loginToSession(page);
  await expect(page.locator('.desktop-icon[data-path="/home/ubuntu"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a corrupt saved file system is replaced by the seed', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ubuntu.fs.v1', '[not json'));
  await loginToSession(page);
  expect(await page.evaluate(() => localStorage.getItem('ubuntu.fs.v1'))).toBe('{}');
});

test('Tab cannot reach the desktop behind the lock screen', async ({ page }) => {
  await loginToSession(page);
  await page.evaluate(() => (window as unknown as { ubuntu: { lock: () => void } }).ubuntu.lock());
  await page.keyboard.press('Space');
  await expect(page.locator('.lock input')).toBeFocused();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('.session'))).toBe(false);
  }
});

test('saved dark style and accent are applied', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ubuntu.settings.v1', JSON.stringify({ style: 'dark', accent: 'viridian' })));
  await loginToSession(page);
  await expect(page.locator('html')).toHaveAttribute('data-style', 'dark');
  await expect(page.locator('.wall.real')).toHaveAttribute('style', /ubuntu-dark/);
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--accent'))).toBe('#03875B');
});

test('the top bar uses the Yaru colours', async ({ page }) => {
  await loginToSession(page);
  await expect(page.locator('.panel')).toHaveCSS('background-color', 'rgb(19, 19, 19)');
  await expect(page.locator('.panel')).toHaveCSS('color', 'rgb(242, 242, 242)');
});

test('locks after 5 minutes without input', async ({ page }) => {
  await page.clock.install();
  await loginToSession(page);
  await page.clock.fastForward('04:00');
  await expect(page.locator('.lock')).toHaveCount(0);
  await page.mouse.move(10, 300);
  await page.clock.fastForward('04:00');
  await expect(page.locator('.lock')).toHaveCount(0);
  await page.clock.fastForward('01:30');
  await expect(page.locator('.lock-time')).toBeVisible();
});

test.describe('embedded in the homepage', () => {
  const HARNESS = `<!doctype html><meta charset="utf-8">
<iframe id="d" src="/desktop-next/?embed=1" style="width:1200px;height:760px;border:0"></iframe>
<script>window.msgs=[];addEventListener('message',(e)=>{if(e.origin===location.origin)msgs.push(e.data&&e.data.type)});</script>`;
  const msgs = (page: Page) => page.evaluate(() => (window as unknown as { msgs: string[] }).msgs);

  test.beforeEach(async ({ page }) => {
    await page.route('**/__harness', (r) => r.fulfill({ contentType: 'text/html', body: HARNESS }));
    await page.goto('/__harness');
    await expect.poll(() => msgs(page)).toContain('desktop:ready');
  });

  test('Esc in the password field never exits', async ({ page }) => {
    const d = page.frameLocator('#d');
    await d.locator('.gdm-user').click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect(await msgs(page)).not.toContain('desktop:exit');
  });

  test('Esc on a quiet session exits', async ({ page }) => {
    const d = page.frameLocator('#d');
    await d.locator('.gdm-user').click();
    await page.keyboard.press('Enter');
    await expect(d.locator('.session')).toBeVisible();
    await d.locator('.session').click({ position: { x: 600, y: 400 } });
    await page.keyboard.press('Escape');
    await expect.poll(() => msgs(page)).toContain('desktop:exit');
  });

  test('power off exits', async ({ page }) => {
    const d = page.frameLocator('#d');
    await d.locator('.gdm-user').click();
    await page.keyboard.press('Enter');
    await expect(d.locator('.session')).toBeVisible();
    await page.frames()[1].evaluate(() => (window as unknown as { ubuntu: { powerOff: () => void } }).ubuntu.powerOff());
    await expect.poll(() => msgs(page)).toContain('desktop:exit');
  });
});
