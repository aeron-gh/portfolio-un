import { expect, test, type Page } from '@playwright/test';

async function session(page: Page) {
  await page.goto('/desktop/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}

test('Home and the README are on the desktop, Home bottom-right', async ({ page }) => {
  await session(page);
  const home = page.locator('.desktop-icon[data-path="/home/ubuntu"]');
  await expect(home).toContainText('Home');
  await expect(page.locator('.desktop-icon[data-path="/home/ubuntu/Desktop/README.md"]')).toBeVisible();
  const box = (await home.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.x + box.width).toBeGreaterThan(vp.width - 120);
  expect(box.y + box.height).toBeGreaterThan(vp.height - 130);
});

/** A file of a type nothing opens, on the desktop. */
const UNKNOWN = '/home/ubuntu/Desktop/data.bin';
const withUnknownFile = (page: Page) =>
  page.addInitScript((path) => {
    localStorage.setItem('ubuntu.fs.v1', JSON.stringify({ [path]: { name: 'data.bin', kind: 'file', mime: 'application/octet-stream', content: '', size: 0, mtime: '2026-01-01T00:00:00.000Z' } }));
  }, UNKNOWN);

test('click selects; double-click on something no app opens shows the Nautilus no-app dialog', async ({ page }) => {
  await withUnknownFile(page);
  await session(page);
  const file = page.locator(`.desktop-icon[data-path="${UNKNOWN}"]`);
  await file.click();
  await expect(file).toHaveAttribute('aria-selected', 'true');
  await file.dblclick();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Could Not Display “data.bin”');
  await expect(dialog).toContainText('The file is of an unknown type');
  await expect(dialog.getByRole('button', { name: 'Select App' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'OK' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('Enter on a focused icon opens the no-app dialog and it stays open', async ({ page }) => {
  await withUnknownFile(page);
  await session(page);
  await page.locator(`.desktop-icon[data-path="${UNKNOWN}"]`).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(300);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'OK' })).toBeFocused();
});

test('dragging one icon leaves the others where they are', async ({ page }) => {
  await session(page);
  const readme = page.locator('.desktop-icon[data-path="/home/ubuntu/Desktop/README.md"]');
  const home = (await page.locator('.desktop-icon[data-path="/home/ubuntu"]').boundingBox())!;
  const before = (await readme.boundingBox())!;
  await page.mouse.move(home.x + 48, home.y + 40);
  await page.mouse.down();
  await page.mouse.move(home.x - 400, home.y - 300, { steps: 8 });
  await page.mouse.up();
  expect(await readme.boundingBox()).toEqual(before);
});

test('dragging an icon moves it, and it stays after reload', async ({ page }) => {
  await session(page);
  const readme = page.locator('.desktop-icon[data-path="/home/ubuntu/Desktop/README.md"]');
  const before = (await readme.boundingBox())!;
  await page.mouse.move(before.x + 48, before.y + 40);
  await page.mouse.down();
  await page.mouse.move(before.x - 300, before.y - 200, { steps: 8 });
  await page.mouse.up();
  const after = (await readme.boundingBox())!;
  expect(after.x).toBeLessThan(before.x - 150);
  await session(page);
  const reloaded = (await page.locator('.desktop-icon[data-path="/home/ubuntu/Desktop/README.md"]').boundingBox())!;
  expect(Math.round(reloaded.x)).toBe(Math.round(after.x));
});

test('icons stay on screen in a 1024x640 window', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await session(page);
  await expect(page.locator('.desktop-icon')).toHaveCount(2); // Home + README; an empty loop would prove nothing
  for (const icon of await page.locator('.desktop-icon').all()) {
    const b = (await icon.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(32);
    expect(b.x + b.width).toBeLessThanOrEqual(1024);
    expect(b.y + b.height).toBeLessThanOrEqual(640);
  }
});

test('embedded: Esc with the dialog open closes only the dialog', async ({ page }) => {
  await withUnknownFile(page);
  const HARNESS = `<!doctype html><meta charset="utf-8"><iframe id="d" src="/desktop/?embed=1" style="width:1200px;height:760px;border:0"></iframe><script>window.msgs=[];addEventListener('message',(e)=>{if(e.origin===location.origin)msgs.push(e.data&&e.data.type)});</script>`;
  await page.route('**/__harness', (r) => r.fulfill({ contentType: 'text/html', body: HARNESS }));
  await page.goto('/__harness');
  const d = page.frameLocator('#d');
  await d.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await d.locator(`.desktop-icon[data-path="${UNKNOWN}"]`).dblclick();
  await expect(d.getByRole('alertdialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(d.getByRole('alertdialog')).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as unknown as { msgs: string[] }).msgs)).not.toContain('desktop:exit');
});
