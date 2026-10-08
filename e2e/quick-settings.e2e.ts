import { expect, test, type Locator, type Page } from '@playwright/test';

async function session(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/desktop-next/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
async function openQs(page: Page): Promise<Locator> {
  await page.locator('.panel .status').click();
  const qs = page.getByRole('dialog', { name: 'System' });
  await expect(qs).toBeVisible();
  return qs;
}
const tile = (qs: Locator, title: string) => qs.getByRole('switch', { name: new RegExp(`^${title}`) });
// The top bar's status icons, without the battery (its level depends on the machine running the tests).
const icons = async (page: Page) => (await page.locator('.panel .status .sym').evaluateAll((els) => els.map((e) => e.getAttribute('data-icon')))).slice(0, -1);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('ubuntu.settings.v1') ?? '{}'));

test('the system button opens Quick Settings: system row, sliders, the seven tiles; Esc closes it', async ({ page }) => {
  await session(page);
  const qs = await openQs(page);
  await expect(page.locator('.panel .status')).toHaveAttribute('aria-expanded', 'true');
  await expect(qs.getByRole('button', { name: 'Lock Screen' })).toBeVisible();
  await expect(qs.getByRole('button', { name: 'Power Off Menu' })).toBeVisible();
  await expect(qs.getByRole('button', { name: /Screenshot|Settings/ })).toHaveCount(0);
  await expect(qs.getByRole('slider', { name: 'Volume' })).toHaveAttribute('aria-valuenow', '70');
  await expect(qs.getByRole('slider', { name: 'Brightness' })).toHaveAttribute('aria-valuenow', '100');
  expect(await qs.locator('.tile .title').allTextContents()).toEqual(['Wi–Fi', 'Bluetooth', 'Power Mode', 'Night Light', 'Dark Style', 'Do Not Disturb', 'Airplane Mode']);
  await expect(tile(qs, 'Wi–Fi')).toHaveAttribute('aria-checked', 'true');
  await expect(tile(qs, 'Wi–Fi')).toContainText('Home');
  await expect(tile(qs, 'Power Mode')).toContainText('Balanced');
  const box = (await qs.boundingBox())!;
  expect([box.x, box.y, box.width]).toEqual([1280 - 6 - 402, 38, 402]);
  await page.keyboard.press('Escape');
  await expect(qs).toHaveCount(0);
  await expect(page.locator('.panel .status')).toBeFocused();
});

test('Night Light warms the screen, Dark Style switches the theme, Do Not Disturb shows its icon', async ({ page }) => {
  await session(page);
  const qs = await openQs(page);
  await tile(qs, 'Night Light').click();
  await expect(page.locator('.night-light')).toHaveCSS('mix-blend-mode', 'multiply');
  await tile(qs, 'Dark Style').click();
  await expect(page.locator('html')).toHaveAttribute('data-style', 'dark');
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--accent'))).toBe('#d34615');
  await tile(qs, 'Do Not Disturb').click();
  expect(await icons(page)).toEqual(['night-light-symbolic', 'network-wireless-signal-excellent-symbolic', 'notifications-disabled-symbolic', 'audio-volume-high-symbolic']);
});

test('Airplane Mode turns Wi–Fi and Bluetooth off; turning Wi–Fi on ends it', async ({ page }) => {
  await session(page);
  const qs = await openQs(page);
  await tile(qs, 'Airplane Mode').click();
  await expect(tile(qs, 'Wi–Fi')).toHaveAttribute('aria-checked', 'false');
  await expect(tile(qs, 'Bluetooth')).toHaveAttribute('aria-checked', 'false');
  expect(await icons(page)).toEqual(['airplane-mode-symbolic', 'audio-volume-high-symbolic']);
  await tile(qs, 'Wi–Fi').click();
  await expect(tile(qs, 'Airplane Mode')).toHaveAttribute('aria-checked', 'false');
  await expect(tile(qs, 'Bluetooth')).toHaveAttribute('aria-checked', 'false');
  expect(await saved(page)).toMatchObject({ wifi: true, bluetooth: false, airplane: false });
});

test('Power Mode: the tile swaps Balanced and the last profile; the menu picks one', async ({ page }) => {
  await session(page);
  const qs = await openQs(page);
  await tile(qs, 'Power Mode').click();
  await expect(tile(qs, 'Power Mode')).toContainText('Power Saver');
  expect(await icons(page)).toContain('power-profile-power-saver-symbolic');
  await qs.getByRole('button', { name: 'Open power profiles menu' }).click();
  const menu = qs.getByRole('menu', { name: 'Power Mode' });
  await expect(menu.getByRole('menuitemradio')).toHaveText(['Performance', 'Balanced', 'Power Saver']);
  await expect(menu.getByRole('menuitemradio', { name: 'Power Saver' })).toHaveAttribute('aria-checked', 'true');
  await menu.getByRole('menuitemradio', { name: 'Performance' }).click();
  await expect(tile(qs, 'Power Mode')).toContainText('Performance');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await tile(qs, 'Power Mode').click();
  await expect(tile(qs, 'Power Mode')).toContainText('Balanced');
  await tile(qs, 'Power Mode').click();
  await expect(tile(qs, 'Power Mode')).toContainText('Performance');
});

test('volume: arrows step 10%, the speaker mutes, sliding to 0 mutes and unmuting brings back 25%', async ({ page }) => {
  await session(page);
  const qs = await openQs(page);
  const volume = qs.getByRole('slider', { name: 'Volume' });
  await volume.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(volume).toHaveAttribute('aria-valuenow', '60');
  await qs.getByRole('button', { name: 'Mute' }).click();
  await expect(volume).toHaveAttribute('aria-valuenow', '0');
  expect(await icons(page)).toContain('audio-volume-muted-symbolic');
  await qs.getByRole('button', { name: 'Unmute' }).click();
  await expect(volume).toHaveAttribute('aria-valuenow', '60');
  const b = (await volume.boundingBox())!;
  await page.mouse.click(b.x + 2, b.y + b.height / 2);
  await qs.getByRole('button', { name: 'Unmute' }).click();
  await expect(volume).toHaveAttribute('aria-valuenow', '25');
});

test('brightness dims the screen but never to black', async ({ page }) => {
  await session(page);
  const qs = await openQs(page);
  const brightness = qs.getByRole('slider', { name: 'Brightness' });
  const b = (await brightness.boundingBox())!;
  await page.mouse.click(b.x + 2, b.y + b.height / 2);
  await expect(brightness).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.dim')).toHaveCSS('opacity', '0.8');
});

test('the power menu opens under the system row and dims the rest; Esc closes the menu, then the panel', async ({ page }) => {
  await session(page);
  const qs = await openQs(page);
  await qs.getByRole('button', { name: 'Power Off Menu' }).click();
  const menu = qs.getByRole('menu', { name: 'Power Off' });
  await expect(menu.getByRole('menuitem')).toHaveText(['Suspend', 'Restart…', 'Power Off…', 'Log Out…']);
  await expect(qs.locator('.qs-panel')).toHaveCSS('filter', 'brightness(0.6)');
  const row = (await qs.locator('.system').boundingBox())!;
  expect((await menu.boundingBox())!.y).toBeCloseTo(row.y + row.height + 12, 0);
  await qs.locator('.catcher').click({ position: { x: 30, y: 20 } }); // the dimmed system row, above the menu
  await expect(menu).toHaveCount(0);
  await qs.getByRole('button', { name: 'Power Off Menu' }).click();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(qs.getByRole('button', { name: 'Power Off Menu' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(qs).toHaveCount(0);
});

test('Wi–Fi lists Home; Bluetooth shows GNOME\'s empty text, on and off', async ({ page }) => {
  await session(page);
  const qs = await openQs(page);
  await qs.getByRole('button', { name: 'Open Wi–Fi menu' }).click();
  await expect(qs.getByRole('menu', { name: 'Wi–Fi' }).getByRole('menuitem', { name: 'Home' })).toBeVisible();
  await page.keyboard.press('Escape');
  await qs.getByRole('button', { name: 'Open Bluetooth menu' }).click();
  await expect(qs.getByRole('menu', { name: 'Bluetooth' })).toContainText('No available or connected devices');
  await page.keyboard.press('Escape');
  await tile(qs, 'Bluetooth').click();
  await qs.getByRole('button', { name: 'Open Bluetooth menu' }).click();
  await expect(qs.getByRole('menu', { name: 'Bluetooth' })).toContainText('Turn on Bluetooth to connect to devices');
});

test('Lock Screen locks and closes the panel; clicking outside or the button again closes it', async ({ page }) => {
  await session(page);
  let qs = await openQs(page);
  await page.locator('.panel .status').click();
  await expect(qs).toHaveCount(0);
  qs = await openQs(page);
  await page.mouse.click(600, 500);
  await expect(qs).toHaveCount(0);
  qs = await openQs(page);
  await qs.getByRole('button', { name: 'Lock Screen' }).click();
  await expect(page.locator('.lock')).toBeVisible();
  await expect(qs).toHaveCount(0);
});

test('Super+S opens it; choices survive a reload; the clock reads like GNOME\'s', async ({ page }) => {
  await session(page);
  await expect(page.locator('.panel .clock')).toHaveText(/^[A-Z][a-z]{2} \d{1,2} /);
  await page.keyboard.press('Meta+KeyS');
  const qs = page.getByRole('dialog', { name: 'System' });
  await tile(qs, 'Wi–Fi').click();
  await page.reload();
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
  expect(await icons(page)).toEqual(['audio-volume-high-symbolic']);
});
