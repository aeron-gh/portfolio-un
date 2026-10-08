import { expect, test, type Page } from '@playwright/test';

type Note = { app: string; appName: string; icon: string; title: string; body: string };
type Hooks = { ubuntu: { notify: (n: Note) => string; logout: () => void } };

async function session(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/desktop/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const notify = (page: Page, app: string, title: string) =>
  page.evaluate(([app, title]) => (window as unknown as Hooks).ubuntu.notify({ app, appName: app === 'files' ? 'Files' : 'Terminal', icon: 'cog-wheel-symbolic', title, body: 'Body text' }), [app, title]);
const dateMenu = (page: Page) => page.getByRole('dialog', { name: 'Date and time' });
async function toggleDnd(page: Page) {
  await page.locator('.panel .status').click();
  await page.getByRole('dialog', { name: 'System' }).getByRole('switch', { name: /^Do Not Disturb/ }).click();
  await page.keyboard.press('Escape');
}

test.describe('a first-time visitor', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the welcome banner drops in under the top bar, leaves after 4 s and waits in the date menu, once', async ({ page }) => {
    await page.clock.install();
    await session(page);
    const banner = page.locator('.notification-banner');
    await expect(banner).toContainText('Welcome to Ubuntu 26.04 LTS');
    await expect(banner).toContainText('Start with README.md on your desktop.');
    expect((await banner.boundingBox())!.y).toBe(36);
    await page.clock.runFor(4500);
    await expect(banner).toHaveCount(0);
    await expect(page.locator('.panel .messages-indicator')).toBeHidden(); // seen as a banner
    await page.locator('.panel .clock-display').click();
    await expect(dateMenu(page).getByRole('group', { name: 'Welcome: Welcome to Ubuntu 26.04 LTS' })).toBeVisible();
    await page.reload();
    await page.locator('.gdm-user').click();
    await page.keyboard.press('Enter');
    await expect(page.locator('.session')).toBeVisible();
    await page.clock.runFor(500);
    await expect(banner).toHaveCount(0);
  });
});

test('the date menu: Today button, a six-week calendar, events and No Notifications', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 7, 10, 0) });
  await session(page);
  await page.locator('.panel .clock-display').click();
  const menu = dateMenu(page);
  await expect(page.locator('.panel .clock-display')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.panel .clock')).toHaveCSS('box-shadow', /0\.32/); // open and hovered
  await page.mouse.move(100, 700);
  await expect(page.locator('.panel .clock')).toHaveCSS('box-shadow', /0\.28/);
  await expect(menu.locator('.day-label')).toHaveText('Wednesday');
  await expect(menu.locator('.date-label')).toHaveText('October 7 2026');
  await expect(menu.locator('.month-label')).toHaveText('October');
  await expect(menu.locator('.day')).toHaveCount(42);
  await expect(menu.locator('.day').first()).toHaveText('27');
  await expect(menu.locator('.day.today')).toHaveText('07');
  await expect(menu.locator('.events-title')).toHaveText('Today');
  await expect(menu.locator('.event-placeholder')).toHaveText('No Events');
  await expect(menu).toContainText('No Notifications');
  await expect(menu.getByRole('button', { name: 'Clear all notifications' })).toHaveCount(0);
  await menu.getByRole('button', { name: /^Thursday, October 8, 2026/ }).click();
  await expect(menu.locator('.events-title')).toHaveText('Tomorrow');
  await menu.getByRole('button', { name: 'Next month' }).click();
  await expect(menu.locator('.month-label')).toHaveText('November');
  await menu.locator('.today-button').click();
  await expect(menu.locator('.month-label')).toHaveText('October');
  await expect(menu.locator('.events-title')).toHaveText('Today');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
});

test('notifications group by app; a stack expands, Esc folds it back; Clear empties the list', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ubuntu.settings.v1', JSON.stringify({ dnd: true })));
  await session(page);
  for (const [app, title] of [['files', 'F1'], ['files', 'F2'], ['files', 'F3'], ['terminal', 'T1']]) await notify(page, app, title);
  await page.locator('.panel .clock-display').click();
  const menu = dateMenu(page);
  await expect(menu.locator('.message-view > *')).toHaveCount(2);
  await expect(menu.locator('.message-view > *').first()).toContainText('T1');
  const stack = menu.locator('.group.stack');
  await expect(stack.locator('.message')).toHaveCount(1);
  await expect(stack.locator('.message')).toContainText('F3');
  await expect(stack.locator('.behind')).toHaveCount(2);
  await stack.getByRole('button', { name: 'Show 3 notifications from Files' }).click();
  const group = menu.getByRole('group', { name: 'Files', exact: true });
  await expect(group.locator('.message')).toHaveCount(3);
  await expect(group.locator('.group-title')).toHaveText('Files');
  await page.keyboard.press('Escape');
  await expect(menu.locator('.group.stack')).toHaveCount(1);
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'Clear all notifications' }).click();
  await expect(menu).toContainText('No Notifications');
});

test('Do Not Disturb: no banner, still listed; the dot shows once it is off, until the date menu is opened', async ({ page }) => {
  await session(page);
  await toggleDnd(page);
  await notify(page, 'files', 'Copied');
  expect(await page.evaluate(() => (window as unknown as { ubuntu: { notifications: () => { banner: unknown; queue: string[] } } }).ubuntu.notifications())).toMatchObject({ banner: null, queue: [] });
  await expect(page.locator('.notification-banner')).toHaveCount(0);
  await expect(page.locator('.panel .messages-indicator')).toBeHidden();
  await toggleDnd(page);
  await expect(page.locator('.panel .messages-indicator')).toBeVisible();
  await page.locator('.panel .clock-display').click();
  await expect(dateMenu(page)).toContainText('Copied');
  await page.keyboard.press('Escape');
  await expect(page.locator('.panel .messages-indicator')).toBeHidden();
});

test('banners: hovering keeps one, the next follows, a click removes it from the list', async ({ page }) => {
  await page.clock.install();
  await session(page);
  await notify(page, 'files', 'First');
  await notify(page, 'terminal', 'Second');
  const banner = page.locator('.notification-banner');
  await expect(banner).toContainText('First');
  await banner.hover();
  await page.clock.runFor(6000);
  await expect(banner).toContainText('First');
  await page.mouse.move(640, 600);
  await page.clock.runFor(300);
  await expect(banner).toContainText('Second');
  await banner.locator('.box').click();
  await expect(banner).toHaveCount(0);
  await page.locator('.panel .clock-display').click();
  await expect(dateMenu(page)).toContainText('First');
  await expect(dateMenu(page)).not.toContainText('Second');
});

test('a damaged saved file system is reported by System; logging out clears the list', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('once')) localStorage.setItem('ubuntu.fs.v1', '[not json');
    sessionStorage.setItem('once', '1');
  });
  await session(page);
  const banner = page.locator('.notification-banner');
  await expect(banner).toContainText('This computer was reset');
  await expect(banner).toContainText('System');
  await page.evaluate(() => (window as unknown as Hooks).ubuntu.logout());
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
  await page.locator('.panel .clock-display').click();
  await expect(dateMenu(page)).toContainText('No Notifications');
});
