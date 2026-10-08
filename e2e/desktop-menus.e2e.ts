import { expect, test, type Page } from '@playwright/test';

async function session(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/desktop/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const icon = (page: Page, name: string) => page.locator(`.desktop-icon[data-path="/home/ubuntu${name ? `/Desktop/${name}` : ''}"]`);
const menuItems = (page: Page, label: string) => page.getByRole('menu', { name: label }).locator('.menuitem, .separator');
const texts = async (page: Page, label: string) => {
  await expect(page.getByRole('menu', { name: label })).toBeVisible(); // the menu code loads on first use
  return menuItems(page, label).evaluateAll((els) => els.map((e) => (e.classList.contains('separator') ? '|' : `${e.textContent!.trim()}${e.getAttribute('aria-disabled') ? '(x)' : ''}`)));
};

test('right-click on the desktop opens Desktop Icons NG\'s menu; Esc closes it', async ({ page }) => {
  await session(page);
  await page.mouse.click(500, 400, { button: 'right' });
  expect(await texts(page, 'Desktop menu')).toEqual([
    'New Folder', '|', 'Paste(x)', '|', 'Select All', '|', 'Arrange Icons', 'Arrange By...', '|',
    'Show Desktop in Files(x)', 'Open in Terminal(x)', '|', 'Change Background…(x)', '|', 'Desktop Icons Settings(x)', 'Display Settings(x)',
  ]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Desktop menu' })).toHaveCount(0);
});

test('New Folder asks for a name beside the icon; F2 renames, Rename stays off until the name changes', async ({ page }) => {
  await session(page);
  await page.mouse.click(500, 400, { button: 'right' });
  await page.getByRole('menuitem', { name: 'New Folder' }).click();
  const box = page.locator('.gtk-popover');
  await expect(box).toContainText('Folder name');
  await expect(box.locator('input')).toHaveValue('New Folder');
  await box.getByRole('button', { name: 'OK' }).click();
  await expect(icon(page, 'New Folder')).toBeVisible();
  await icon(page, 'New Folder').click();
  await page.keyboard.press('F2');
  await expect(box.getByRole('button', { name: 'Rename' })).toBeDisabled();
  await box.locator('input').fill('Work');
  await page.keyboard.press('Enter');
  await expect(icon(page, 'Work')).toBeVisible();
  await expect(icon(page, 'New Folder')).toHaveCount(0);
});

test('Copy and Paste make "README (Copy).md"; Move to Trash removes it', async ({ page }) => {
  await session(page);
  await icon(page, 'README.md').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Copy' }).click();
  await page.mouse.click(500, 400, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Paste' }).click();
  await expect(icon(page, 'README (Copy).md')).toBeVisible();
  await icon(page, 'README (Copy).md').click();
  await page.keyboard.press('Control+KeyC');
  await page.keyboard.press('Control+KeyV');
  await expect(icon(page, 'README (Copy 2).md')).toBeVisible();
  await icon(page, 'README (Copy).md').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Move to Trash' }).click();
  await expect(icon(page, 'README (Copy).md')).toHaveCount(0);
  await icon(page, 'README (Copy 2).md').click();
  await page.keyboard.press('Delete');
  await expect(icon(page, 'README (Copy 2).md')).toHaveCount(0);
});

test('Home cannot be cut, copied or trashed; two icons get the "All" wording', async ({ page }) => {
  await session(page);
  await icon(page, '').click({ button: 'right' });
  expect(await texts(page, 'Icon menu')).toEqual(['Open', 'Open With Other Application(x)', '|', 'Cut(x)', 'Copy(x)', '|', 'Move to Trash(x)', '|', 'Properties(x)', '|', 'Show in Files(x)', 'Open in Terminal(x)']);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+KeyA');
  await icon(page, 'README.md').click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Open All...' })).toBeVisible();
});

test('Arrange By: the sort order is checked and remembered', async ({ page }) => {
  await session(page);
  await page.mouse.click(500, 400, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Arrange By...' }).hover();
  await expect(page.getByRole('menuitemradio', { name: 'Sort by Name Descending' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('menuitemradio', { name: 'Sort by Name', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ubuntu.desktop-arrange.v1')!).order)).toBe('NAME');
  await page.mouse.click(500, 400, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Arrange By...' }).hover();
  await expect(page.getByRole('menuitemradio', { name: 'Sort by Name', exact: true })).toHaveAttribute('aria-checked', 'true');
});
