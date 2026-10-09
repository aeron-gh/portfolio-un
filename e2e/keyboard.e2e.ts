import { expect, test, type Page } from '@playwright/test';

type W = { id: string; app: string; state: string; minimized: boolean; workspace: number };
type Hooks = { ubuntu: { launch: (app: string) => Promise<string>; windows: () => W[]; overview: () => { mode: string }; panel: () => { open: string | null } } };

async function session(page: Page, testApps = true) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/desktop/${testApps ? '?test-apps' : ''}`);
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const launch = (page: Page, app = 'test-window') => page.evaluate((a) => (window as unknown as Hooks).ubuntu.launch(a), app);
const wins = (page: Page) => page.evaluate(() => (window as unknown as Hooks).ubuntu.windows());
const mode = (page: Page) => page.evaluate(() => (window as unknown as Hooks).ubuntu.overview().mode);
const focusedId = (page: Page) => page.evaluate(() => document.querySelector('.window:not(.backdrop):not(.hidden)')?.getAttribute('data-win'));

/** The desktop inside an iframe, as on the homepage; `msgs` records what it tells the page. */
async function embedded(page: Page, query = '') {
  const HARNESS = `<!doctype html><meta charset="utf-8"><iframe id="d" src="/desktop/?embed=1${query}" style="width:1200px;height:760px;border:0"></iframe><script>window.msgs=[];addEventListener('message',(e)=>{if(e.origin===location.origin)msgs.push(e.data&&e.data.type)});</script>`;
  await page.route('**/__harness', (r) => r.fulfill({ contentType: 'text/html', body: HARNESS }));
  await page.goto('/__harness');
  const d = page.frameLocator('#d');
  await d.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(d.locator('.session')).toBeVisible();
  const frame = page.frame({ url: /\/desktop\// })!;
  const msgs = () => page.evaluate(() => (window as unknown as { msgs: string[] }).msgs);
  return { d, frame, msgs };
}

test('Super alone toggles the Overview; Super+A opens the app grid; Super+S Quick Settings', async ({ page }) => {
  await session(page, false);
  await page.keyboard.press('Meta');
  expect(await mode(page)).toBe('windows');
  await page.keyboard.press('Meta');
  expect(await mode(page)).toBe('hidden');
  await page.keyboard.press('Meta+KeyA');
  expect(await mode(page)).toBe('apps');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Meta+KeyS');
  expect(await page.evaluate(() => (window as unknown as Hooks).ubuntu.panel().open)).toBe('quick-settings');
});

test('Super+Up, Super+Down, Super+H, Alt+F4 act on the focused window', async ({ page }) => {
  await session(page);
  await launch(page);
  await page.keyboard.press('Meta+ArrowUp');
  expect((await wins(page))[0].state).toBe('maximized');
  await page.keyboard.press('Meta+ArrowDown');
  expect((await wins(page))[0].state).toBe('normal');
  await page.keyboard.press('Meta+KeyH');
  expect((await wins(page))[0].minimized).toBe(true);
  await page.locator('nav.dock .tile[data-app="test-window"]').click();
  await page.keyboard.press('Alt+F4');
  await expect.poll(async () => (await wins(page)).length).toBe(0);
});

test('Super+Left tiles and offers the other window', async ({ page }) => {
  await session(page);
  await launch(page);
  await launch(page, 'test-utility');
  await page.keyboard.press('Meta+ArrowLeft');
  expect((await wins(page)).find((w) => w.app === 'test-utility')?.state).toBe('tiled-left');
  await expect(page.locator('.tiling-popup .item-box')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.tiling-popup')).toHaveCount(0);
});

test('Alt+Tab: a quick press switches to the previous window', async ({ page }) => {
  await session(page);
  const a = await launch(page);
  const b = await launch(page);
  expect(await focusedId(page)).toBe(b);
  await page.keyboard.press('Alt+Tab');
  await expect.poll(() => focusedId(page)).toBe(a);
});

test('Alt+Tab held shows the switcher; Tab moves; releasing Alt picks', async ({ page }) => {
  await session(page);
  const a = await launch(page);
  await launch(page, 'test-utility');
  const c = await launch(page);
  await page.keyboard.down('Alt');
  await page.keyboard.press('Tab');
  await expect(page.locator('.switcher-popup .item-box')).toHaveCount(3);
  await page.keyboard.press('Tab');
  await expect(page.locator('.switcher-popup .item-box[aria-selected="true"]')).toHaveAttribute('data-id', a);
  await page.keyboard.up('Alt');
  await expect(page.locator('.switcher-popup')).toHaveCount(0);
  await expect.poll(() => focusedId(page)).toBe(a);
  expect(c).not.toBe(a);
});

test('the switcher ignores the pointer for 500ms after it appears, then follows it', async ({ page }) => {
  await page.clock.install();
  await session(page);
  const a = await launch(page);
  const u = await launch(page, 'test-utility');
  await launch(page);
  await page.clock.pauseAt(Date.now() + 1000);
  await page.keyboard.down('Alt');
  await page.keyboard.press('Tab');
  await page.clock.runFor(150);
  const items = page.locator('.switcher-popup .item-box');
  await expect(items).toHaveCount(3);
  const selected = page.locator('.switcher-popup .item-box[aria-selected="true"]');
  const last = (await items.nth(2).boundingBox())!;
  await page.mouse.move(last.x + 10, last.y + 10);
  await page.mouse.move(last.x + 20, last.y + 20);
  await expect(selected).toHaveAttribute('data-id', u);
  await page.clock.runFor(500);
  await page.mouse.move(last.x + 25, last.y + 25);
  await expect(selected).toHaveAttribute('data-id', a);
  await page.keyboard.up('Alt');
});

test('Super+Tab switches apps; Alt+` cycles the app\'s own windows', async ({ page }) => {
  await session(page);
  const a = await launch(page);
  const u = await launch(page, 'test-utility');
  await page.keyboard.press('Meta+Tab');
  await expect.poll(() => focusedId(page)).toBe(a);
  const a2 = await launch(page);
  await page.keyboard.press('Alt+Backquote');
  await expect.poll(() => focusedId(page)).toBe(a);
  expect([u, a2].length).toBe(2);
});

test('Super+D shows the desktop and brings the windows back', async ({ page }) => {
  await session(page);
  await launch(page);
  await launch(page);
  await page.keyboard.press('Meta+KeyD');
  expect((await wins(page)).every((w) => w.minimized)).toBe(true);
  await page.keyboard.press('Meta+KeyD');
  expect((await wins(page)).every((w) => !w.minimized)).toBe(true);
});

test('Super+1 focuses the first dock app; Super+Shift+PageDown takes the window to the next workspace', async ({ page }) => {
  await session(page);
  const a = await launch(page);
  await launch(page, 'test-utility');
  await page.keyboard.press('Meta+Digit1');
  await expect.poll(() => focusedId(page)).toBe(a);
  await page.keyboard.press('Meta+Shift+PageDown');
  const w = (await wins(page)).find((x) => x.id === a)!;
  expect(w.workspace).toBe(1);
  await page.keyboard.press('Meta+PageUp');
  await expect.poll(() => focusedId(page)).not.toBe(a);
});

test('embedded: Esc while the Overview is still loading closes the Overview, not the desktop', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route(/\/_astro\/Overview\.[\w-]+\.js$/, async (route) => {
    await gate;
    await route.continue();
  });
  const { d, frame, msgs } = await embedded(page);
  await d.getByRole('button', { name: 'Activities' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(() => frame.evaluate(() => (window as unknown as Hooks).ubuntu.overview().mode)).toBe('hidden');
  release();
  // A second Esc on the quiet desktop hands control back; only that one may say so.
  await page.keyboard.press('Escape');
  await expect.poll(msgs).toContain('desktop:exit');
  expect((await msgs()).filter((m) => m === 'desktop:exit')).toHaveLength(1);
});

test('Esc closes the topmost layer first', async ({ page }) => {
  const { d, msgs } = await embedded(page);
  await d.getByRole('button', { name: 'Activities' }).click();
  await page.keyboard.type('abc');
  await page.keyboard.press('Escape');
  await expect(d.locator('input.search-entry')).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(d.locator('.ov-back')).toHaveCount(0);
  expect(await msgs()).not.toContain('desktop:exit');
  await d.locator('.session').click({ position: { x: 600, y: 400 } });
  await page.keyboard.press('Escape');
  await expect.poll(msgs).toContain('desktop:exit');
});

test('Esc in a quick Alt+Tab cancels the switch and stays on the desktop', async ({ page }) => {
  const { frame, msgs } = await embedded(page, '&test-apps');
  const launchIn = () => frame.evaluate(() => (window as unknown as Hooks).ubuntu.launch('test-window'));
  await launchIn();
  const b = await launchIn();
  await page.keyboard.down('Alt');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape'); // before the popup shows (150ms)
  await page.keyboard.up('Alt');
  await expect.poll(() => frame.evaluate(() => document.querySelector('.window:not(.backdrop)')?.getAttribute('data-win'))).toBe(b);
  expect(await msgs()).not.toContain('desktop:exit');
});

test('the login gear picks the full-screen session and remembers it', async ({ page }) => {
  await page.goto('/desktop/');
  await page.locator('.gdm-user').click();
  await page.getByRole('button', { name: 'Choose Session' }).click();
  const menu = page.getByRole('menu', { name: 'Choose Session' });
  await menu.getByRole('menuitem', { name: 'Ubuntu (full screen)' }).click();
  expect(await page.evaluate(() => localStorage.getItem('ubuntu.session.v1'))).toBe('fullscreen');
  await expect(page.locator('.gdm-prompt input')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
});

test('lock screen: Shift leaves the curtain down, the next key lands in the password field, shortcuts stay off', async ({ page }) => {
  await session(page);
  await launch(page);
  await page.evaluate(() => (window as unknown as { ubuntu: { lock: () => void } }).ubuntu.lock());
  await page.keyboard.press('Shift');
  await expect(page.locator('.lock-clock')).toBeVisible();
  await page.keyboard.press('a');
  await expect(page.locator('.lock input')).toHaveValue('a');
  await page.keyboard.press('Meta+KeyD');
  await page.keyboard.press('Meta');
  expect((await wins(page))[0].minimized).toBe(false);
  expect(await mode(page)).toBe('hidden');
});

test('arrow keys move between desktop icons; Plymouth is hidden from screen readers after boot', async ({ page }) => {
  await session(page, false);
  await expect(page.locator('#plymouth')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('.desktop-icon[data-path="/home/ubuntu/Desktop/README.md"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.desktop-icon[data-path="/home/ubuntu"]')).toBeFocused();
});
