import { expect, test, type Locator, type Page } from '@playwright/test';

const HOME = '/home/ubuntu';

async function session(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/desktop/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const files = (page: Page) => page.locator('.window[data-app="files"]');
const homeIcon = (page: Page) => page.locator(`.desktop-icon[data-path="${HOME}"]`);
const sidebar = (page: Page) => files(page).getByRole('listbox', { name: 'Places' });
const place = (page: Page, name: string) => sidebar(page).getByRole('option', { name, exact: true });
const content = (page: Page) => files(page).getByRole('listbox', { name: 'Content' });
const item = (page: Page, name: string) => content(page).getByRole('option', { name, exact: true });
const path = (page: Page) => files(page).getByRole('navigation', { name: 'Location' });

async function openHome(page: Page) {
  await session(page);
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await expect(item(page, 'Documents')).toBeVisible();
}

test('the dock opens Files at Home, at its real size, with the sidebar in Ubuntu\'s order', async ({ page }) => {
  await session(page);
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  const win = page.getByRole('dialog', { name: 'Home' });
  await expect(win).toBeVisible();
  const box = (await win.boundingBox())!;
  expect([box.width, box.height]).toEqual([890, 550]); // window-state initial-size
  await expect(sidebar(page).getByRole('option')).toHaveText(['Home', 'Recent', 'Starred', 'Network', 'Trash', 'Documents', 'Music', 'Pictures', 'Videos', 'Downloads']);
  await expect(place(page, 'Home')).toHaveAttribute('aria-selected', 'true');
  // AdwOverlaySplitView: 20% of 890 is below its 180px minimum.
  expect((await sidebar(page).boundingBox())!.width).toBe(180);
  await expect(files(page).locator('.sidebar .headerbar')).toContainText('Files');
  await expect(path(page).getByRole('button')).toHaveText(['Home']);
});

test('only the content side has the window buttons', async ({ page }) => {
  await openHome(page);
  await expect(files(page).locator('.sidebar .headerbar').getByRole('button', { name: 'Close' })).toHaveCount(0);
  await expect(files(page).locator('.content .headerbar').getByRole('button', { name: 'Close' })).toBeVisible();
});

test('Home: folders first, hidden files stay hidden, icons are 48px as Ubuntu sets them', async ({ page }) => {
  await openHome(page);
  const names = await content(page).getByRole('option').allTextContents();
  expect(names.map((n) => n.trim())).toEqual(['Desktop', 'Documents', 'Downloads', 'Music', 'Open-Source', 'Pictures', 'Projects', 'Public', 'snap', 'Templates', 'Videos']);
  const img = (await item(page, 'Documents').locator('img').boundingBox())!;
  expect([img.width, img.height]).toEqual([48, 48]);
});

test('special folders have their own icons', async ({ page }) => {
  await openHome(page);
  await expect(item(page, 'Documents').locator('img')).toHaveAttribute('src', /folder-documents/);
  await expect(item(page, 'Downloads').locator('img')).toHaveAttribute('src', /folder-download/);
  await expect(item(page, 'Projects').locator('img')).toHaveAttribute('src', /\/folder[.-]/);
});

test('double-click opens a folder; the path bar, title, Back and Forward follow', async ({ page }) => {
  await openHome(page);
  await expect(files(page).getByRole('button', { name: 'Back' })).toBeDisabled();
  await item(page, 'Documents').dblclick();
  await expect(item(page, 'about.md')).toBeVisible();
  await expect(files(page)).toHaveAttribute('aria-label', 'Documents');
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Documents']);
  await expect(files(page).getByRole('button', { name: 'Forward' })).toBeDisabled();

  await files(page).getByRole('button', { name: 'Back' }).click();
  await expect(item(page, 'Documents')).toBeVisible();
  await expect(files(page)).toHaveAttribute('aria-label', 'Home');

  await files(page).getByRole('button', { name: 'Forward' }).click();
  await expect(item(page, 'about.md')).toBeVisible();
});

test('the path bar goes back up; the current folder comes last', async ({ page }) => {
  await openHome(page);
  await item(page, 'Pictures').dblclick();
  await item(page, 'Wallpapers').dblclick();
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Pictures', 'Wallpapers']);
  await path(page).getByRole('button', { name: 'Pictures' }).click();
  await expect(item(page, 'Wallpapers')).toBeVisible();
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Pictures']);
});

test('Backspace and Alt+Up go up and select the folder you came from; Alt+Left and Alt+Right walk the history', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').dblclick();
  await expect(item(page, 'about.md')).toBeVisible();
  await page.keyboard.press('Backspace'); // Ubuntu's own patch
  await expect(item(page, 'Documents')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(item(page, 'about.md')).toBeVisible();
  await page.keyboard.press('Alt+ArrowRight');
  await expect(item(page, 'Documents')).toBeVisible();
  await item(page, 'Music').dblclick();
  await expect(files(page).getByRole('heading', { name: 'Folder is Empty' })).toBeVisible();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(item(page, 'Music')).toHaveAttribute('aria-selected', 'true');
});

test('the sidebar goes to a place and shows which one; a folder with no row selects none', async ({ page }) => {
  await openHome(page);
  await place(page, 'Pictures').click();
  await expect(item(page, 'Wallpapers')).toBeVisible();
  await expect(place(page, 'Pictures')).toHaveAttribute('aria-selected', 'true');
  await expect(place(page, 'Home')).toHaveAttribute('aria-selected', 'false');
  await expect(files(page)).toHaveAttribute('aria-label', 'Pictures');
  await item(page, 'Wallpapers').dblclick();
  await expect(sidebar(page).locator('[aria-selected="true"]')).toHaveCount(0);
});

test('the empty pages say what the real ones say', async ({ page }) => {
  await openHome(page);
  for (const [row, heading] of [
    ['Music', 'Folder is Empty'],
    ['Recent', 'No Recent Files'],
    ['Starred', 'No Starred Files'],
    ['Network', 'No Known Connections'],
    ['Trash', 'Trash is Empty'],
  ]) {
    await place(page, row).click();
    await expect(files(page).getByRole('heading', { name: heading })).toBeVisible();
    await expect(files(page)).toHaveAttribute('aria-label', row);
  }
});

test('double-clicking a text file opens it in Text Editor', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').dblclick();
  await expect(page.getByRole('dialog', { name: 'about.md (~/Documents) - Text Editor' })).toBeVisible();
});

test('the Home icon on the desktop opens Files there, and reuses a window already showing it', async ({ page }) => {
  await session(page);
  await homeIcon(page).dblclick();
  await expect(item(page, 'Documents')).toBeVisible();
  await homeIcon(page).dblclick();
  await expect(files(page)).toHaveCount(1); // NAUTILUS_OPEN_FLAG_REUSE_EXISTING
  await place(page, 'Documents').click();
  await expect(item(page, 'about.md')).toBeVisible();
  await homeIcon(page).dblclick();
  await expect(files(page)).toHaveCount(2); // nothing shows Home now
});

const viewOptions = (page: Page) => files(page).getByRole('button', { name: 'View Options' });
const viewMenu = (page: Page) => page.getByRole('menu', { name: 'View Options' });

test('the split button shows the view it switches to; the choice is remembered', async ({ page }) => {
  await openHome(page);
  await expect(files(page).locator('.view.grid')).toBeVisible();
  await files(page).getByRole('button', { name: 'List View' }).click();
  await expect(files(page).locator('.view.list')).toBeVisible();
  await expect(files(page).getByRole('columnheader')).toHaveText(['Name', 'Size', 'Modified', '']);
  await files(page).getByRole('button', { name: 'Grid View' }).click();
  await expect(files(page).locator('.view.grid')).toBeVisible();
  await page.keyboard.press('Control+1');
  await expect(files(page).locator('.view.list')).toBeVisible();
  await page.reload();
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await expect(files(page).locator('.view.list')).toBeVisible();
  await page.keyboard.press('Control+2');
  await expect(files(page).locator('.view.grid')).toBeVisible();
});

test('the list: 32px icons, item counts, sizes and dates', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  const docs = item(page, 'Documents');
  await expect(docs).toContainText('3 items');
  const img = (await docs.locator('img').boundingBox())!;
  expect([img.width, img.height]).toEqual([32, 32]);
  await docs.dblclick();
  const about = item(page, 'about.md');
  await expect(about.locator('.size')).toHaveText(/^\d+(\.\d)? (bytes|kB)$/);
  await expect(about.locator('.date')).toHaveText(/ago$|^Today, \d|^Yesterday, \d|^Last /); // the seed's date, in words
  await expect(about.locator('.date')).toHaveCSS('text-align', 'right');
  await expect(about.locator('.date')).toHaveCSS('font-variant-numeric', 'tabular-nums');
});

test('a column header sorts; again reverses; folders stay first', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  const name = files(page).getByRole('columnheader', { name: 'Name' });
  await expect(name).toHaveAttribute('aria-sort', 'ascending');
  await name.click();
  await expect(name).toHaveAttribute('aria-sort', 'descending');
  await expect(content(page).getByRole('option').first()).toContainText('Videos');
  await place(page, 'Documents').click();
  await expect(files(page).getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'ascending'); // each folder keeps its own
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(files(page).getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'descending');
  const size = files(page).getByRole('columnheader', { name: 'Size' });
  await size.click();
  await expect(size).toHaveAttribute('aria-sort', 'ascending');
  await expect(files(page).getByRole('columnheader', { name: 'Name' })).not.toHaveAttribute('aria-sort', /./);
});

test('View Options: the real sections, in order', async ({ page }) => {
  await openHome(page);
  await viewOptions(page).click();
  const menu = viewMenu(page);
  await expect(menu).toContainText('Icon Size');
  await expect(menu.getByRole('menuitemradio')).toHaveText(['A-Z', 'Z-A', 'Last Modified', 'First Modified', 'Size', 'Type']);
  await expect(menu.getByRole('menuitemradio', { name: 'A-Z' })).toHaveAttribute('aria-checked', 'true');
  await expect(menu).toContainText('Sort');
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Show Hidden Files' })).toHaveAttribute('aria-checked', 'false');
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Show Hidden Files' })).toContainText('Ctrl+H');
  await expect(menu.getByRole('menuitem', { name: 'Captions…' })).toBeVisible(); // the grid has captions; the list has columns
  await expect(menu.getByRole('menuitem', { name: 'Visible Columns…' })).toHaveCount(0);
  // Every label lines up past the marks, even an item with no mark of its own (GTK's indicators size group).
  const left = async (name: string) => (await menu.getByRole('menuitem', { name }).or(menu.getByRole('menuitemradio', { name })).locator('.label').boundingBox())!.x;
  expect(await left('Captions…')).toBe(await left('A-Z'));
});

test('View Options: choosing a sort reorders this folder', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await expect(item(page, 'about.md')).toBeVisible();
  await viewOptions(page).click();
  await viewMenu(page).getByRole('menuitemradio', { name: 'Z-A' }).click();
  await expect(viewMenu(page)).toHaveCount(0);
  await expect(content(page).getByRole('option').first()).toContainText('skills.md');
  await viewOptions(page).click();
  await expect(viewMenu(page).getByRole('menuitemradio', { name: 'Z-A' })).toHaveAttribute('aria-checked', 'true');
});

test('hidden files: the menu and Ctrl+H show them, faded, sorted last', async ({ page }) => {
  await openHome(page);
  await expect(item(page, '.bashrc')).toHaveCount(0);
  await page.keyboard.press('Control+h');
  await expect(item(page, '.bashrc')).toBeVisible();
  await expect(item(page, '.bashrc').locator('.icon')).toHaveCSS('opacity', '0.55'); // the icon only (nautilus-grid-cell.c)
  await expect(item(page, '.bashrc').locator('.label')).toHaveCSS('opacity', '1');
  const names = (await content(page).getByRole('option').allTextContents()).map((n) => n.trim());
  expect(names.at(-1)).toBe('.profile');
  await viewOptions(page).click();
  await viewMenu(page).getByRole('menuitemcheckbox', { name: 'Show Hidden Files' }).click();
  await expect(item(page, '.bashrc')).toHaveCount(0);
});

test('zoom: 48, then 64; the ends turn off; Ctrl+0 is the standard 96', async ({ page }) => {
  await openHome(page);
  const size = async () => (await item(page, 'Documents').locator('img').boundingBox())!.width;
  await viewOptions(page).click();
  await expect(viewMenu(page).getByRole('button', { name: 'Zoom Out' })).toBeDisabled();
  await viewMenu(page).getByRole('button', { name: 'Zoom In' }).click();
  await expect(viewMenu(page)).toBeVisible(); // the buttons leave the menu open
  await expect.poll(size).toBe(64);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+-');
  await expect.poll(size).toBe(48);
  await page.keyboard.press('Control+0');
  await expect.poll(size).toBe(96);
  await page.keyboard.press('Control+=');
  await page.keyboard.press('Control+=');
  await page.keyboard.press('Control+=');
  await expect.poll(size).toBe(256);
  await viewOptions(page).click();
  await expect(viewMenu(page).getByRole('button', { name: 'Zoom In' })).toBeDisabled();
});

const bar = (page: Page) => files(page).getByRole('status');

test('selecting shows what is selected in the floating bar; clicking the background clears it', async ({ page }) => {
  await openHome(page);
  await expect(bar(page)).toHaveCount(0);
  await item(page, 'Documents').click();
  await expect(item(page, 'Documents')).toHaveAttribute('aria-selected', 'true');
  await expect(bar(page)).toHaveText(/^“Documents” selected\s*\(containing 3 items\)$/);
  await files(page).locator('.view').click({ position: { x: 300, y: 400 } });
  await expect(item(page, 'Documents')).toHaveAttribute('aria-selected', 'false');
  await expect(bar(page)).toHaveCount(0);
});

test('Ctrl and Shift clicks, and the bar counts them', async ({ page }) => {
  await openHome(page);
  await item(page, 'Desktop').click();
  await item(page, 'Downloads').click({ modifiers: ['Shift'] });
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(3);
  await expect(bar(page)).toContainText('3 folders selected');
  await item(page, 'Documents').click({ modifiers: ['Control'] });
  await expect(item(page, 'Documents')).toHaveAttribute('aria-selected', 'false');
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(2);
  // A plain click on something already selected keeps the rest until the button comes up, in case it is a drag.
  const desktop = (await item(page, 'Desktop').boundingBox())!;
  await page.mouse.move(desktop.x + 20, desktop.y + 20);
  await page.mouse.down();
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(2);
  await page.mouse.up();
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(1);
});

test('selected items are grey, not the accent colour', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').click();
  await page.mouse.move(5, 5);
  await expect(item(page, 'Documents')).toHaveCSS('background-color', 'color(srgb 0.584314 0.584314 0.584314 / 0.25)');
});

test('the focus ring shows when a key moves the focus, and goes after 3 seconds (gtkwindow.c)', async ({ page }) => {
  await openHome(page);
  const ring = (name: string) => item(page, name).evaluate((el) => getComputedStyle(el).outlineStyle);
  await item(page, 'Desktop').click();
  expect(await ring('Desktop')).toBe('none'); // a click shows none
  await page.keyboard.press('ArrowRight');
  await expect(item(page, 'Documents')).toBeFocused();
  expect(await ring('Documents')).toBe('solid');
  await expect.poll(() => ring('Documents'), { timeout: 5000 }).toBe('none');
  // A key that does not move the focus shows none either.
  await page.keyboard.press('Control+h');
  await page.keyboard.press('Control+h');
  expect(await ring('Documents')).toBe('none');
});

test('the keyboard: arrows, Shift, select all and none, Enter; Esc is not one of them', async ({ page }) => {
  await openHome(page);
  await item(page, 'Desktop').click();
  await page.keyboard.press('ArrowRight');
  await expect(item(page, 'Documents')).toHaveAttribute('aria-selected', 'true');
  await expect(item(page, 'Desktop')).toHaveAttribute('aria-selected', 'false');
  await expect(item(page, 'Documents')).toBeFocused();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(2);
  await page.keyboard.press('Control+a');
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(11);
  await page.keyboard.press('Control+Shift+I');
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape'); // GtkListBase binds nothing to it
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(1);
  await page.keyboard.press('Control+\\');
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(0);
  await page.keyboard.press('Control+/');
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(11);
  await page.keyboard.press('Control+Shift+A');
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(0);
  await item(page, 'Documents').click();
  await page.keyboard.press('Enter');
  await expect(item(page, 'about.md')).toBeVisible();
});

test('dragging on the background draws a band and selects what it touches; Ctrl adds to the selection', async ({ page }) => {
  await openHome(page);
  const view = (await content(page).locator('..').boundingBox())!;
  const b = (await item(page, 'Downloads').boundingBox())!;
  await page.mouse.move(view.x + 4, view.y + 4);
  await page.mouse.down();
  await page.mouse.move(b.x + 10, b.y + 10, { steps: 4 });
  const band = files(page).locator('.rubberband');
  await expect(band).toBeVisible();
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(3); // Desktop, Documents, Downloads
  await page.mouse.up();
  await expect(band).toHaveCount(0);
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(3);

  const v = (await item(page, 'Videos').boundingBox())!;
  await page.keyboard.down('Control');
  await page.mouse.move(v.x + v.width + 3, v.y + v.height + 3);
  await page.mouse.down();
  await page.mouse.move(v.x + v.width - 10, v.y + v.height - 10, { steps: 3 });
  await page.mouse.up();
  await page.keyboard.up('Control');
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(4);
});

test('the floating bar hides while the pointer is over it, so it never covers a file', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').click();
  await expect(bar(page)).toBeVisible();
  const box = (await bar(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(bar(page)).toBeHidden();
  await page.mouse.move(box.x - 60, box.y - 60);
  await expect(bar(page)).toBeVisible();
});

// ---- changing files --------------------------------------------------------

/** By its label alone: a row's accessible name also holds its shortcut. */
const menuItem = (page: Page, name: string) =>
  page.locator('.popover .modelbutton').filter({ has: page.locator('.label').getByText(name, { exact: true }) });
const labels = async (page: Page) => (await page.locator('.popover .modelbutton .label').allTextContents()).map((t) => t.trim());
const undoRow = (page: Page) => page.locator('.popover').getByRole('menuitem', { name: /^Undo/ });
const toast = (page: Page) => files(page).locator('.toast');

test('right-clicking a file: its real menu, at the pointer', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click({ button: 'right' });
  await expect(item(page, 'about.md')).toHaveAttribute('aria-selected', 'true');
  expect(await labels(page)).toEqual(['Open With Text Editor', 'Open With…', 'Cut', 'Copy', 'Move to…', 'Copy to…', 'Rename…', 'Compress…', 'Move to Trash', 'Properties']);
  await expect(menuItem(page, 'Move to…')).toBeDisabled();
  await menuItem(page, 'Open With Text Editor').click();
  await expect(page.getByRole('dialog', { name: 'about.md (~/Documents) - Text Editor' })).toBeVisible();
});

test('right-clicking a folder: Open is a submenu that slides in, with a way back', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').click({ button: 'right' });
  await menuItem(page, 'Open').click();
  expect(await labels(page)).toEqual(['Open', 'Open', 'Open in New Tab', 'Open in New Window', 'Open With…', 'Open in Terminal']);
  await page.locator('.popover .modelbutton.title').click();
  expect((await labels(page))[0]).toBe('Open');
  expect(await labels(page)).toContain('Move to Trash');
  await menuItem(page, 'Open').click();
  await menuItem(page, 'Open in New Window').click();
  await expect(files(page)).toHaveCount(2);
  await expect(page.getByRole('dialog', { name: 'Documents' })).toBeVisible();
});

test('right-clicking the background clears the selection and shows its menu', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').click();
  await files(page).locator('.view').click({ button: 'right', position: { x: 300, y: 400 } });
  await expect(item(page, 'Documents')).toHaveAttribute('aria-selected', 'false');
  expect(await labels(page)).toEqual(['New Folder…', 'Open With…', 'Open in Terminal', 'Paste', 'Select All', 'Captions…', 'Properties']);
  await expect(menuItem(page, 'Paste')).toBeDisabled();
  await menuItem(page, 'Select All').click();
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(11);
});

test('New Folder: the real dialog; a clash is refused; the new folder is selected', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+Shift+N');
  const dialog = page.getByRole('dialog', { name: 'New Folder' });
  await expect(dialog).toBeVisible();
  const entry = dialog.getByRole('textbox', { name: 'Folder Name' });
  await expect(entry).toBeFocused();
  const create = dialog.getByRole('button', { name: 'Create' });
  await expect(create).toBeDisabled();
  await page.keyboard.type('Documents');
  await expect(dialog).toContainText('A folder with that name already exists');
  await expect(create).toBeDisabled();
  await entry.fill('a/b');
  await expect(dialog).toContainText('Folder names cannot contain “/”');
  await entry.fill('Reports');
  await expect(create).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(item(page, 'Reports')).toHaveAttribute('aria-selected', 'true');
  await expect(item(page, 'Reports')).toBeFocused();
});

test('New Folder: Esc and the close button leave things as they were', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+Shift+N');
  const dialog = page.getByRole('dialog', { name: 'New Folder' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await files(page).locator('.view').click({ button: 'right', position: { x: 300, y: 400 } });
  await menuItem(page, 'New Folder…').click();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(content(page).getByRole('option')).toHaveCount(11);
});

test('Rename: F2 selects the name up to its extension; Enter renames and keeps it selected', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('F2');
  const pop = page.getByRole('dialog', { name: 'Rename File' });
  await expect(pop.getByRole('heading', { name: 'Rename File' })).toBeVisible();
  const entry = pop.getByRole('textbox', { name: 'New Filename' });
  await expect(entry).toBeFocused();
  await expect(entry).toHaveValue('about.md');
  expect(await entry.evaluate((e: HTMLInputElement) => [e.selectionStart, e.selectionEnd])).toEqual([0, 5]);
  await page.keyboard.type('skills');
  await expect(pop).toContainText('A file with that name already exists', { timeout: 2000 }).catch(() => {}); // skills.md is taken, skills is not
  await page.keyboard.type('2');
  await page.keyboard.press('Enter');
  await expect(pop).toHaveCount(0);
  await expect(item(page, 'skills2.md')).toHaveAttribute('aria-selected', 'true');
});

test('Rename: a folder is "Rename Folder" and all of its name is selected; Esc cancels', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').click({ button: 'right' });
  await menuItem(page, 'Rename…').click();
  const pop = page.getByRole('dialog', { name: 'Rename Folder' });
  const entry = pop.getByRole('textbox', { name: 'New Filename' });
  expect(await entry.evaluate((e: HTMLInputElement) => [e.selectionStart, e.selectionEnd])).toEqual([0, 9]);
  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);
  await expect(item(page, 'Documents')).toBeFocused();
});

test('copy and paste between folders; the new item is selected', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Control+c');
  await place(page, 'Downloads').click();
  await expect(files(page).getByRole('heading', { name: 'Folder is Empty' })).toBeVisible();
  await files(page).getByRole('heading', { name: 'Folder is Empty' }).click({ button: 'right' });
  await menuItem(page, 'Paste').click();
  await expect(item(page, 'about.md')).toHaveAttribute('aria-selected', 'true');
  await place(page, 'Documents').click();
  await expect(item(page, 'about.md')).toBeVisible(); // a copy: still here
});

test('cut: the icon becomes a dashed outline with scissors; pasting moves it', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Control+x');
  await expect(item(page, 'about.md').locator('.cut-mark')).toBeVisible();
  await expect(item(page, 'about.md').locator('img')).toHaveCount(0);
  await place(page, 'Downloads').click();
  await page.keyboard.press('Control+v');
  await expect(item(page, 'about.md')).toBeVisible();
  await place(page, 'Documents').click();
  await expect(item(page, 'skills.md')).toBeVisible();
  await expect(item(page, 'about.md')).toHaveCount(0);
});

test('one clipboard: copied on the desktop, pasted in Files', async ({ page }) => {
  await session(page);
  const readme = page.locator(`.desktop-icon[data-path="${HOME}/Desktop/README.md"]`);
  await readme.click();
  await page.keyboard.press('Control+c');
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await place(page, 'Downloads').click();
  await expect(files(page).getByRole('heading', { name: 'Folder is Empty' })).toBeVisible();
  await page.keyboard.press('Control+v');
  await expect(item(page, 'README.md')).toBeVisible();
});

test('Paste Into Folder', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Control+c');
  await place(page, 'Home').click();
  await item(page, 'Downloads').click({ button: 'right' });
  await menuItem(page, 'Paste Into Folder').click();
  await item(page, 'Downloads').dblclick();
  await expect(item(page, 'about.md')).toBeVisible();
});

test('Delete moves to the Trash with a toast; its Undo brings it back', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Delete');
  await expect(item(page, 'about.md')).toHaveCount(0);
  await expect(toast(page)).toContainText('“about.md” moved to trash');
  await expect(place(page, 'Trash').locator('.sym')).toHaveAttribute('style', /user-trash-full/);
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(item(page, 'about.md')).toBeVisible();
  await expect(toast(page)).toHaveCount(0);
  await expect(place(page, 'Trash').locator('.sym')).not.toHaveAttribute('style', /user-trash-full/);
});

test('several files: the toast counts them; it goes away by itself or when dismissed', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await item(page, 'skills.md').click({ modifiers: ['Control'] });
  await page.keyboard.press('Delete');
  await expect(toast(page)).toContainText('2 files moved to trash');
  await toast(page).getByRole('button', { name: 'Dismiss' }).click();
  await expect(toast(page)).toHaveCount(0);
});

test('the Trash: Restore puts it back; Delete and Empty Trash ask first', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  for (const name of ['about.md', 'skills.md', 'contact.md']) {
    await item(page, name).click();
    await page.keyboard.press('Delete');
    await expect(item(page, name)).toHaveCount(0);
  }
  await place(page, 'Trash').click();
  await expect(content(page).getByRole('option')).toHaveCount(3);

  await item(page, 'about.md').click({ button: 'right' });
  expect(await labels(page)).toEqual(['Open With Text Editor', 'Open With…', 'Cut', 'Copy', 'Move to…', 'Copy to…', 'Rename…', 'Delete From Trash…', 'Restore From Trash', 'Properties']);
  await menuItem(page, 'Restore From Trash').click();
  await expect(item(page, 'about.md')).toHaveCount(0);

  await item(page, 'skills.md').click();
  await page.keyboard.press('Delete');
  const ask = page.getByRole('alertdialog', { name: 'Permanently Delete “skills.md”?' });
  await expect(ask).toContainText('Permanently deleted items can not be restored');
  await expect(ask.getByRole('button')).toHaveText(['Cancel', 'Delete']);
  await page.keyboard.press('Escape');
  await expect(item(page, 'skills.md')).toBeVisible();
  await page.keyboard.press('Delete');
  await ask.getByRole('button', { name: 'Delete' }).click();
  await expect(item(page, 'skills.md')).toHaveCount(0);

  await files(page).locator('.view').click({ button: 'right', position: { x: 300, y: 300 } });
  await menuItem(page, 'Empty Trash…').click();
  const empty = page.getByRole('alertdialog', { name: 'Empty Trash?' });
  await expect(empty).toContainText('All items in the Trash will be permanently deleted');
  await empty.getByRole('button', { name: 'Empty Trash' }).click();
  await expect(files(page).getByRole('heading', { name: 'Trash is Empty' })).toBeVisible();

  await place(page, 'Documents').click();
  await expect(item(page, 'about.md')).toBeVisible();
  await expect(item(page, 'skills.md')).toHaveCount(0);
});

test('the Trash list: Trashed On, newest first; two of the same name both show their own name', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Control+c');
  await place(page, 'Downloads').click();
  await page.keyboard.press('Control+v');
  await expect(item(page, 'about.md')).toBeVisible();
  await page.keyboard.press('Delete');
  await expect(item(page, 'about.md')).toHaveCount(0);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Delete');
  await expect(item(page, 'about.md')).toHaveCount(0);
  await place(page, 'Trash').click();
  await expect(files(page).getByRole('columnheader')).toHaveText(['Name', 'Size', 'Trashed On']);
  await expect(files(page).getByRole('columnheader', { name: 'Trashed On' })).toHaveAttribute('aria-sort', 'descending');
  await expect(item(page, 'about.md')).toHaveCount(2);
  await expect(item(page, 'about.md').first().locator('.date')).toHaveText(/^Today, /);
  await viewOptions(page).click();
  await expect(viewMenu(page).getByRole('menuitemradio', { name: 'Last Trashed' })).toHaveAttribute('aria-checked', 'true');
});

test('the Main Menu: New Window at the same place; Undo and Redo name what they do', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Delete');
  await expect(item(page, 'about.md')).toHaveCount(0);
  const main = files(page).getByRole('button', { name: 'Main Menu' });
  await main.click();
  expect(await labels(page)).toEqual(['New Window', 'New Tab', 'Undo Trash', 'Redo', 'Preferences', 'Keyboard Shortcuts', 'Help', 'About Files']);
  await expect(menuItem(page, 'Redo')).toBeDisabled();
  await undoRow(page).click();
  await expect(item(page, 'about.md')).toBeVisible();
  await main.click();
  await expect(undoRow(page)).toHaveText(/^Undo/);
  await expect(undoRow(page)).toBeDisabled();
  await menuItem(page, 'Redo Trash').click();
  await expect(item(page, 'about.md')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(item(page, 'about.md')).toBeVisible();
  await page.keyboard.press('Control+Shift+Z');
  await expect(item(page, 'about.md')).toHaveCount(0);
  await main.click();
  await menuItem(page, 'New Window').click();
  await expect(files(page)).toHaveCount(2);
  await expect(page.getByRole('dialog', { name: 'Documents' })).toHaveCount(2);
});

test('the path bar\'s menu', async ({ page }) => {
  await openHome(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await place(page, 'Documents').click();
  await files(page).getByRole('button', { name: 'Current Folder Menu' }).click();
  expect(await labels(page)).toEqual(['New Folder…', 'Open With…', 'Open in Terminal', 'Reload', 'Remove from Bookmarks', 'Star Folder', 'Copy Location', 'Paste', 'Select All', 'Properties']);
  await menuItem(page, 'Copy Location').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${HOME}/Documents`);
  await files(page).getByRole('button', { name: 'Current Folder Menu' }).click();
  await menuItem(page, 'New Folder…').click();
  await expect(page.getByRole('dialog', { name: 'New Folder' })).toBeVisible();
});

test('a read-only folder: nothing can be made or moved there, but things can be copied from it', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Alt+ArrowUp');
  await page.keyboard.press('Alt+ArrowUp');
  await expect(path(page).getByRole('button')).toHaveText(['Ubuntu']);
  await item(page, 'etc').dblclick();
  await expect(path(page).getByRole('button')).toHaveText(['Ubuntu', 'etc']);
  await files(page).locator('.view').click({ button: 'right', position: { x: 600, y: 440 } });
  await expect(menuItem(page, 'New Folder…')).toBeDisabled();
  await page.keyboard.press('Escape');
  await item(page, 'hostname').click({ button: 'right' });
  await expect(menuItem(page, 'Cut')).toBeDisabled();
  await expect(menuItem(page, 'Copy')).toBeEnabled();
  await expect(menuItem(page, 'Rename…')).toBeDisabled();
  await expect(menuItem(page, 'Move to Trash')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Delete');
  await expect(item(page, 'hostname')).toBeVisible();
});

test('a folder you may not open: the real error, and you stay where you were', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Alt+ArrowUp');
  await page.keyboard.press('Alt+ArrowUp');
  await item(page, 'root').dblclick();
  const dialog = page.getByRole('alertdialog', { name: 'Oops! Something went wrong.' });
  await expect(dialog).toContainText('Don’t have permission to access the requested location.');
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(path(page).getByRole('button')).toHaveText(['Ubuntu']);
});

test('a file with no installed app shows the real dialog', async ({ page }) => {
  await openHome(page);
  await place(page, 'Pictures').click();
  await item(page, 'abhishek.avif').dblclick();
  const dialog = page.getByRole('alertdialog', { name: 'Could Not Display “abhishek.avif”' });
  await expect(dialog).toContainText('There is no app installed for “AVIF image” files');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('a window whose folder is deleted moves up to what is left', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').dblclick();
  await expect(item(page, 'about.md')).toBeVisible();
  await files(page).getByRole('button', { name: 'Main Menu' }).click();
  await menuItem(page, 'New Window').click();
  await expect(files(page)).toHaveCount(2);
  const second = files(page).nth(1);
  await second.getByRole('option', { name: 'Home', exact: true }).click();
  await second.getByRole('option', { name: 'Documents', exact: true }).nth(1).click();
  await page.keyboard.press('Delete');
  await expect(page.getByRole('dialog', { name: 'Documents' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Home' })).toHaveCount(2);
});

// ---- the rest of the window -------------------------------------------------

test('selected text in an entry is tinted with the accent, not the browser\'s blue', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+Shift+N');
  const bg = await page.getByRole('textbox', { name: 'Folder Name' }).evaluate((e) => getComputedStyle(e, '::selection').backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(bg).toContain('/ 0.3');
});

test('New Folder sits 24px below its header, as a preferences page does', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+Shift+N');
  const dialog = page.getByRole('dialog', { name: 'New Folder' });
  const head = (await dialog.locator('.hb').boundingBox())!;
  const row = (await dialog.locator('label.row').boundingBox())!;
  expect(row.y - (head.y + head.height)).toBe(24);
  expect((await dialog.boundingBox())!.width).toBe(450);
});

test('narrow: below 682px the sidebar hides, and Back, Forward and the view button move to a bar at the bottom', async ({ page }) => {
  await openHome(page);
  await page.setViewportSize({ width: 660, height: 800 });
  await expect(sidebar(page)).toBeHidden();
  const bottom = files(page).locator('.action-bar');
  await expect(bottom.getByRole('button', { name: 'Back' })).toBeVisible();
  await expect(bottom.getByRole('button', { name: 'Forward' })).toBeVisible();
  await expect(bottom.getByRole('button', { name: 'View Options' })).toBeVisible();
  await expect(files(page).locator('.content .headerbar').getByRole('button', { name: 'Back' })).toHaveCount(0);
  await expect(files(page).locator('.content .headerbar').getByRole('button', { name: 'View Options' })).toHaveCount(0);

  const toggle = files(page).getByRole('button', { name: 'Show Sidebar' });
  const before = (await content(page).getByRole('option').first().boundingBox())!;
  await toggle.click();
  await expect(sidebar(page)).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect((await content(page).getByRole('option').first().boundingBox())!.x).toBe(before.x); // it floats over the content
  await place(page, 'Documents').click();
  await expect(item(page, 'about.md')).toBeVisible();
  await expect(sidebar(page)).toBeVisible(); // choosing a place leaves it open
  await page.mouse.click(600, 500); // anywhere over the content
  await expect(sidebar(page)).toBeHidden();
  await page.keyboard.press('F9');
  await expect(sidebar(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sidebar(page)).toBeHidden();
  await page.keyboard.press('F9');
  await expect(sidebar(page)).toBeVisible();
  await page.mouse.click(600, 500); // anywhere over the content
  await expect(sidebar(page)).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 800 });
  await files(page).getByRole('button', { name: 'Maximize' }).click();
  await expect(files(page).locator('.action-bar')).toHaveCount(0);
  await expect(sidebar(page)).toBeVisible();
});

test('wide: F9 does nothing, the action is only on when narrow', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('F9');
  await expect(sidebar(page)).toBeVisible();
});

test('right-clicking a sidebar row: its real menu', async ({ page }) => {
  await openHome(page);
  await place(page, 'Trash').click({ button: 'right' });
  expect(await labels(page)).toEqual(['Open', 'Open in New Tab', 'Open in New Window', 'Trash Settings…', 'Empty Trash…']);
  await expect(menuItem(page, 'Empty Trash…')).toBeDisabled(); // nothing in it yet
  await page.keyboard.press('Escape');
  await place(page, 'Recent').click({ button: 'right' });
  expect(await labels(page)).toEqual(['Open', 'Open in New Tab', 'Open in New Window', 'File History Settings…']);
  await page.keyboard.press('Escape');
  await place(page, 'Documents').click({ button: 'right' });
  expect(await labels(page)).toEqual(['Open', 'Open in New Tab', 'Open in New Window', 'Remove from Bookmarks', 'Rename', 'Properties']);
  await menuItem(page, 'Open in New Window').click();
  await expect(files(page)).toHaveCount(2);
  await expect(page.getByRole('dialog', { name: 'Documents' })).toBeVisible();
});

test('right-clicking Back lists where it can go; choosing one jumps there', async ({ page }) => {
  await openHome(page);
  await item(page, 'Pictures').dblclick();
  await item(page, 'Wallpapers').dblclick();
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Pictures', 'Wallpapers']);
  await files(page).getByRole('button', { name: 'Back' }).click({ button: 'right' });
  expect(await labels(page)).toEqual(['Pictures', 'Home']);
  await menuItem(page, 'Home').click();
  await expect(path(page).getByRole('button')).toHaveText(['Home']);
  await files(page).getByRole('button', { name: 'Forward' }).click({ button: 'right' });
  expect(await labels(page)).toEqual(['Pictures', 'Wallpapers']);
  await menuItem(page, 'Wallpapers').click();
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Pictures', 'Wallpapers']);
});

test('scrolling: an overlay bar over the content, thin until hovered, gone after 2 seconds; a shade under the header', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await page.keyboard.press('Control+=');
  const view = files(page).locator('.view');
  expect(await view.evaluate((v: HTMLElement) => v.offsetWidth - v.clientWidth)).toBe(0); // the browser's own bar takes no room
  const shade = files(page).locator('.undershoot');
  await expect(shade).toBeHidden();
  const bar = files(page).locator('.page .scrollbar');
  await expect(bar).toHaveCount(1);
  await view.evaluate((v) => v.scrollTo(0, 120));
  await expect(shade).toBeVisible();
  const slider = bar.locator('.slider');
  await expect(slider).toBeVisible();
  expect((await slider.evaluate((s) => s.getBoundingClientRect().width))).toBe(3);
  const b = (await bar.boundingBox())!;
  await page.mouse.move(b.x + b.width - 4, b.y + 100);
  await expect.poll(() => slider.evaluate((s) => s.getBoundingClientRect().width)).toBe(8);
  await page.mouse.move(300, 300);
  await expect(bar).toHaveClass(/faded/, { timeout: 5000 });
});

test('a long name is cut in the middle, with the whole name as its tooltip', async ({ page }) => {
  const LONG = 'a-very-long-file-name-that-goes-on-and-on-and-on-and-on-and-on-and-on-and-on.md';
  await page.addInitScript(([p, n]) => {
    localStorage.setItem('ubuntu.fs.v1', JSON.stringify({ [p]: { name: n, kind: 'file', mime: 'text/markdown', content: 'x', size: 1, mtime: '2026-01-01T00:00:00.000Z' } }));
  }, [`${HOME}/Documents/${LONG}`, LONG]);
  await openHome(page);
  await place(page, 'Documents').click();
  const row = item(page, LONG);
  const label = row.locator('.label');
  await expect(label).toContainText('…');
  await expect(label).toContainText('.md');
  await expect(label).toHaveAttribute('title', LONG);
  await expect(item(page, 'about.md').locator('.label')).not.toHaveAttribute('title', /./);
  await page.keyboard.press('Control+1'); // one line in the list, still cut in the middle
  await expect(row.locator('.label')).toContainText('…');
  await expect(row.locator('.label')).toContainText('.md');
  await expect(item(page, 'about.md').locator('.label')).toHaveText('about.md');
});

test('a folder you cannot read shows the emblem saying so', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Alt+ArrowUp');
  await page.keyboard.press('Alt+ArrowUp');
  await expect(item(page, 'root').locator('.emblem')).toHaveAttribute('src', /emblem-unreadable/);
  await expect(item(page, 'etc').locator('.emblem')).toHaveCount(0);
});

test('clicking something that cannot take the keyboard leaves it where it was', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').click();
  await files(page).locator('.content .headerbar').click({ position: { x: 90, y: 10 } });
  await expect(item(page, 'Documents')).toBeFocused();
  await place(page, 'Music').hover();
  await page.keyboard.press('Control+h');
  await expect(item(page, '.bashrc')).toBeVisible();
  await files(page).locator('.sidebar .headerbar .title').click();
  await expect(item(page, 'Documents')).toBeFocused();
});

test('Ctrl or Shift with a double-click only selects', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').dblclick({ modifiers: ['Control'] });
  await expect(path(page).getByRole('button')).toHaveText(['Home']);
  await item(page, 'Documents').dblclick({ modifiers: ['Shift'] });
  await expect(path(page).getByRole('button')).toHaveText(['Home']);
  await expect(item(page, 'Documents')).toHaveAttribute('aria-selected', 'true');
});

test('image previews need a 32px icon or larger', async ({ page }) => {
  await openHome(page);
  await place(page, 'Pictures').click();
  await page.keyboard.press('Control+1');
  await expect(item(page, 'abhishek.avif').locator('img.thumbnail')).toBeVisible();
  await page.keyboard.press('Control+-');
  await expect(item(page, 'abhishek.avif').locator('img.thumbnail')).toHaveCount(0);
  await expect(item(page, 'abhishek.avif').locator('img')).toHaveAttribute('src', /image-x-generic/);
});

test('the Trash has nowhere above it, and nothing inside it can be changed', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').click();
  await page.keyboard.press('Delete');
  await place(page, 'Trash').click();
  await item(page, 'Documents').dblclick();
  await expect(path(page).getByRole('button')).toHaveText(['Trash', 'Documents']);
  await item(page, 'about.md').click({ button: 'right' });
  await expect(menuItem(page, 'Move to Trash')).toHaveCount(0);
  await expect(menuItem(page, 'Cut')).toBeDisabled();
  await expect(menuItem(page, 'Rename…')).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Delete');
  await expect(item(page, 'about.md')).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await files(page).locator('.view').click({ button: 'right', position: { x: 300, y: 300 } });
  await expect(menuItem(page, 'New Folder…')).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Backspace');
  await expect(path(page).getByRole('button')).toHaveText(['Trash']);
  await page.keyboard.press('Backspace');
  await expect(path(page).getByRole('button')).toHaveText(['Trash']); // trash:/// has no parent
});

test('Open in New Window on a folder you may not read shows the error, and no window', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openHome(page);
  await page.keyboard.press('Alt+ArrowUp');
  await page.keyboard.press('Alt+ArrowUp');
  await item(page, 'root').click({ button: 'right' });
  await menuItem(page, 'Open').click();
  await menuItem(page, 'Open in New Window').click();
  await expect(page.getByRole('alertdialog', { name: 'Oops! Something went wrong.' })).toBeVisible();
  await expect(files(page)).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('Undo after the file has been deleted for good does nothing, and forgets it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Delete');
  await place(page, 'Trash').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Delete');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(files(page).getByRole('heading', { name: 'Trash is Empty' })).toBeVisible();
  await page.keyboard.press('Control+z');
  await expect(files(page).getByRole('heading', { name: 'Trash is Empty' })).toBeVisible();
  await files(page).getByRole('button', { name: 'Main Menu' }).click();
  await expect(menuItem(page, 'Undo')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('Tab reaches the view even with nothing selected', async ({ page }) => {
  await openHome(page);
  await expect(item(page, 'Desktop')).toHaveAttribute('tabindex', '0');
  await expect(item(page, 'Documents')).toHaveAttribute('tabindex', '-1');
});

// ---- tabs ------------------------------------------------------------------

const tabs = (page: Page) => files(page).getByRole('tab');
const tab = (page: Page, name: string) => files(page).getByRole('tab', { name, exact: true });

test('Ctrl+T: a new tab at the same place; the bar shows only with two or more; Ctrl+W closes, and the last closes the window', async ({ page }) => {
  await openHome(page);
  await expect(tabs(page)).toHaveCount(0);
  await page.keyboard.press('Control+t');
  await expect(tabs(page)).toHaveText(['Home', 'Home']);
  await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs(page).nth(0)).toHaveAttribute('title', HOME);
  await expect(item(page, 'Documents')).toBeVisible();
  await page.keyboard.press('Control+w');
  await expect(tabs(page)).toHaveCount(0);
  await expect(item(page, 'Documents')).toBeVisible();
  await page.keyboard.press('Control+w');
  await expect(files(page)).toHaveCount(0);
});

test('a tab keeps where it had scrolled to, even when left before the scroll is reported', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await page.keyboard.press('Control+=');
  // Scroll and Ctrl+T at once: the scroll event, which comes a frame later, cannot have arrived.
  await files(page).locator('.view').evaluate((v) => {
    v.scrollTo(0, 80);
    v.dispatchEvent(new KeyboardEvent('keydown', { key: 't', ctrlKey: true, bubbles: true }));
  });
  await expect(tabs(page)).toHaveCount(2);
  await files(page).locator('.view').evaluate((v) => v.scrollTo(0, 40));
  await tabs(page).nth(0).click();
  await expect.poll(() => files(page).locator('.view').evaluate((v) => v.scrollTop)).toBe(80);
  await tabs(page).nth(1).click();
  await expect.poll(() => files(page).locator('.view').evaluate((v) => v.scrollTop)).toBe(40);
});

test('the Main Menu opens a tab too', async ({ page }) => {
  await openHome(page);
  await files(page).getByRole('button', { name: 'Main Menu' }).click();
  await menuItem(page, 'New Tab').click();
  await expect(tabs(page)).toHaveCount(2);
});

test('each tab has its own place, history, selection and scroll; the window takes the title of the tab in front', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await page.keyboard.press('Control+=');
  await item(page, 'Pictures').click();
  await files(page).locator('.view').evaluate((v) => v.scrollTo(0, 80));
  await page.keyboard.press('Control+t');
  await expect(tabs(page)).toHaveCount(2);
  await place(page, 'Documents').click();
  await expect(tab(page, 'Documents')).toHaveAttribute('aria-selected', 'true');
  await expect(files(page)).toHaveAttribute('aria-label', 'Documents');
  await item(page, 'about.md').click();
  await tab(page, 'Home').click();
  await expect(files(page)).toHaveAttribute('aria-label', 'Home');
  await expect(item(page, 'Pictures')).toHaveAttribute('aria-selected', 'true');
  await expect(files(page).getByRole('button', { name: 'Back' })).toBeDisabled();
  await expect.poll(() => files(page).locator('.view').evaluate((v) => v.scrollTop)).toBe(80);
  await tab(page, 'Documents').click();
  await expect(item(page, 'about.md')).toHaveAttribute('aria-selected', 'true');
  await expect(files(page).getByRole('button', { name: 'Back' })).toBeEnabled();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(tabs(page)).toHaveText(['Home', 'Home']);
});

test('Open in New Tab opens behind, after the tabs already opened from that one', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+t');
  await tabs(page).nth(0).click();
  await item(page, 'Documents').click({ button: 'right' });
  await menuItem(page, 'Open').click();
  await menuItem(page, 'Open in New Tab').click();
  await expect(tabs(page)).toHaveText(['Home', 'Home', 'Documents']); // after what the first tab has already opened
  await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(files(page)).toHaveAttribute('aria-label', 'Home');
});

test('a middle-click on a folder opens it in a new tab behind', async ({ page }) => {
  await openHome(page);
  await item(page, 'Pictures').click({ button: 'middle' });
  await expect(tabs(page)).toHaveText(['Home', 'Pictures']);
  await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
});

test('the sidebar and the path bar open tabs too', async ({ page }) => {
  await openHome(page);
  await place(page, 'Music').click({ button: 'right' });
  await menuItem(page, 'Open in New Tab').click();
  await expect(tabs(page)).toHaveText(['Home', 'Music']);
  await tab(page, 'Music').click();
  await path(page).getByRole('button', { name: 'Home' }).click({ button: 'right' });
  expect(await labels(page)).toEqual(['Open in New Window', 'Open in New Tab', 'Properties']);
  await menuItem(page, 'Open in New Tab').click();
  await expect(tabs(page)).toHaveText(['Home', 'Music', 'Home']);
  await path(page).getByRole('button', { name: 'Home' }).click({ button: 'middle' });
  await expect(tabs(page)).toHaveCount(4);
});

test('closing the tab in front brings back the one it came from', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+t');
  await page.keyboard.press('Control+t');
  await expect(tabs(page)).toHaveCount(3);
  await tabs(page).nth(2).getByRole('button', { name: 'Close' }).click();
  await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
});

test('the tab menu: move, close others, and bring a closed tab back with its history', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+t');
  await place(page, 'Documents').click();
  await page.keyboard.press('Control+t');
  await place(page, 'Music').click();
  await expect(tabs(page)).toHaveText(['Home', 'Documents', 'Music']);

  await tab(page, 'Documents').click({ button: 'right' });
  expect(await labels(page)).toEqual(['New Tab', 'Restore Closed Tab', 'Move Tab to New Window', 'Move Tab Left', 'Move Tab Right', 'Close Tab', 'Close Other Tabs']);
  await expect(menuItem(page, 'Restore Closed Tab')).toBeDisabled();
  await menuItem(page, 'Move Tab Left').click();
  await expect(tabs(page)).toHaveText(['Documents', 'Home', 'Music']);

  await tab(page, 'Documents').click({ button: 'right' });
  await expect(menuItem(page, 'Move Tab Left')).toBeDisabled();
  await menuItem(page, 'Close Other Tabs').click();
  await expect(tabs(page)).toHaveCount(0);
  await expect(files(page)).toHaveAttribute('aria-label', 'Documents');

  // Closing others goes from the last tab backwards, and Restore takes the last one closed.
  await page.keyboard.press('Control+Shift+T');
  await expect(tabs(page)).toHaveText(['Documents', 'Home']);
  await expect(files(page).getByRole('button', { name: 'Back' })).toBeDisabled();
  await page.keyboard.press('Control+Shift+T');
  await expect(tab(page, 'Music')).toHaveAttribute('aria-selected', 'true');
  await expect(files(page).getByRole('button', { name: 'Back' })).toBeEnabled(); // it had come from Home
});

test('Move Tab to New Window takes its history along', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+t');
  await place(page, 'Documents').click();
  await tab(page, 'Documents').click({ button: 'right' });
  await menuItem(page, 'Move Tab to New Window').click();
  await expect(files(page)).toHaveCount(2);
  const moved = page.getByRole('dialog', { name: 'Documents' });
  await expect(moved).toBeVisible();
  await expect(moved.getByRole('tab')).toHaveCount(0);
  await expect(moved.getByRole('button', { name: 'Back' })).toBeEnabled();
  await expect(page.getByRole('dialog', { name: 'Home' }).getByRole('tab')).toHaveCount(0);
});

test('the tab keys', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+t');
  await place(page, 'Documents').click();
  await page.keyboard.press('Control+t');
  await place(page, 'Music').click();
  const front = () => files(page).getAttribute('aria-label');
  await page.keyboard.press('Alt+1');
  await expect.poll(front).toBe('Home');
  await page.keyboard.press('Alt+3');
  await expect.poll(front).toBe('Music');
  await page.keyboard.press('Control+PageDown');
  await expect.poll(front).toBe('Home');
  await page.keyboard.press('Control+PageUp');
  await expect.poll(front).toBe('Music');
  await page.keyboard.press('Control+Shift+PageUp');
  await expect(tabs(page)).toHaveText(['Home', 'Music', 'Documents']);
});

test('opening a folder from outside finds it in a background tab', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+t');
  await place(page, 'Documents').click();
  await expect(tab(page, 'Documents')).toHaveAttribute('aria-selected', 'true');
  await homeIcon(page).dblclick();
  await expect(files(page)).toHaveCount(1);
  await expect(files(page)).toHaveAttribute('aria-label', 'Home');
  await expect(tab(page, 'Home')).toHaveAttribute('aria-selected', 'true');
});

test('going back up scrolls to the folder it selects', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await page.keyboard.press('Control+=');
  await item(page, 'Videos').dblclick();
  await expect(files(page).getByRole('heading', { name: 'Folder is Empty' })).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(item(page, 'Videos')).toHaveAttribute('aria-selected', 'true');
  await expect(item(page, 'Videos')).toBeInViewport();
});

// ---- typing a path ---------------------------------------------------------

const locationEntry = (page: Page) => files(page).getByRole('textbox', { name: 'Location' });
/** A file opens in a window on top of Files; a person closes it to get back. */
const closeEditor = (page: Page) => page.locator('.window[data-app="text-editor"]').getByRole('button', { name: 'Close', exact: true }).first().click();

test('Ctrl+L swaps the path bar for an entry with the whole path selected; Esc puts it back', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').click();
  await page.keyboard.press('Control+l');
  await expect(locationEntry(page)).toBeFocused();
  await expect(locationEntry(page)).toHaveValue(HOME);
  expect(await locationEntry(page).evaluate((e: HTMLInputElement) => [e.selectionStart, e.selectionEnd])).toEqual([0, HOME.length]);
  await expect(path(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(path(page)).toBeVisible();
  await expect(item(page, 'Documents')).toBeFocused();
});

test('clicking the current folder in the path bar opens the entry; Enter goes there', async ({ page }) => {
  await openHome(page);
  await path(page).getByRole('button', { name: 'Home' }).click();
  await expect(locationEntry(page)).toBeFocused();
  await page.keyboard.type('/etc');
  await page.keyboard.press('Enter');
  await expect(path(page).getByRole('button')).toHaveText(['Ubuntu', 'etc']);
  await expect(item(page, 'hostname')).toBeVisible();
  await expect(locationEntry(page)).toHaveCount(0);
});

test('typing / or ~ in the view starts a path with it', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('/');
  await expect(locationEntry(page)).toBeFocused();
  await expect(locationEntry(page)).toHaveValue('/');
  await page.keyboard.press('Escape');
  await page.keyboard.press('~');
  await expect(locationEntry(page)).toHaveValue('~/');
  await page.keyboard.type('Documents');
  await page.keyboard.press('Enter');
  await expect(item(page, 'about.md')).toBeVisible();
});

test('a path that does not exist, or is a file, says so, and you stay where you were', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+l');
  await page.keyboard.type('/nowhere');
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog', { name: 'Oops! Something went wrong.' });
  await expect(dialog).toContainText('Unable to find “/nowhere”. Please check the spelling and try again.');
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(path(page).getByRole('button')).toHaveText(['Home']);
  await page.keyboard.press('Control+l');
  await page.keyboard.type('/etc/hostname');
  await page.keyboard.press('Enter');
  await expect(dialog).toContainText('This location doesn’t appear to be a folder.');
});

test('completions: a list under the entry; the shared start is filled in, and Tab accepts it', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('~');
  await page.keyboard.type('Do');
  const rows = files(page).getByRole('listbox', { name: 'Completions' }).getByRole('option');
  await expect(rows).toHaveText(['~/Documents/', '~/Downloads/']);
  await page.keyboard.type('c');
  await expect(rows).toHaveText(['~/Documents/']);
  await expect(locationEntry(page)).toHaveValue('~/Documents/'); // the rest is filled in and selected
  expect(await locationEntry(page).evaluate((e: HTMLInputElement) => [e.selectionStart, e.selectionEnd])).toEqual([5, 12]);
  await page.keyboard.press('Tab');
  await expect(locationEntry(page)).toBeFocused();
  expect(await locationEntry(page).evaluate((e: HTMLInputElement) => [e.selectionStart, e.selectionEnd])).toEqual([12, 12]);
  await page.keyboard.press('Enter');
  await expect(item(page, 'about.md')).toBeVisible();
});

test('completions: choosing one with the mouse', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('/');
  await page.keyboard.type('e');
  await files(page).getByRole('listbox', { name: 'Completions' }).getByRole('option', { name: '/etc/' }).click();
  await expect(locationEntry(page)).toHaveValue('/etc/');
  await expect(locationEntry(page)).toBeFocused();
});

test('the entry\'s buttons: Clear while it shows where you are, Go once it does not; Cancel closes', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+l');
  await files(page).getByRole('button', { name: 'Clear Entry' }).click();
  await expect(locationEntry(page)).toHaveValue('');
  await page.keyboard.type('~/Music');
  await files(page).getByRole('button', { name: 'Go to Location' }).click();
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Music']);
  await page.keyboard.press('Control+l');
  await files(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(path(page)).toBeVisible();
});

test('clicking away closes the entry', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+l');
  await files(page).locator('.view').click({ position: { x: 300, y: 400 } });
  await expect(locationEntry(page)).toHaveCount(0);
  await expect(path(page)).toBeVisible();
});

// ---- bookmarks, Starred and Recent ------------------------------------------

test('Ctrl+D and the path bar\'s menu bookmark a folder; it joins the sidebar, and is remembered', async ({ page }) => {
  await openHome(page);
  await item(page, 'Projects').dblclick();
  await page.keyboard.press('Control+d');
  await expect(place(page, 'Projects')).toHaveAttribute('aria-selected', 'true');
  await expect(sidebar(page).getByRole('option').last()).toHaveText('Projects');
  await page.reload();
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await expect(place(page, 'Projects')).toBeVisible();
  await place(page, 'Projects').click();
  await files(page).getByRole('button', { name: 'Current Folder Menu' }).click();
  await menuItem(page, 'Remove from Bookmarks').click();
  await expect(place(page, 'Projects')).toHaveCount(0);
  await files(page).getByRole('button', { name: 'Current Folder Menu' }).click();
  await menuItem(page, 'Add to Bookmarks').click();
  await expect(place(page, 'Projects')).toBeVisible();
});

test('Home cannot be bookmarked or starred, so its menu offers neither', async ({ page }) => {
  await openHome(page);
  await files(page).getByRole('button', { name: 'Current Folder Menu' }).click();
  const list = await labels(page);
  for (const label of ['Add to Bookmarks', 'Remove from Bookmarks', 'Star Folder', 'Unstar Folder']) expect(list).not.toContain(label);
});

test('a bookmark can be renamed and removed from its row', async ({ page }) => {
  await openHome(page);
  await place(page, 'Music').click({ button: 'right' });
  await menuItem(page, 'Rename').click();
  const pop = page.getByRole('dialog', { name: 'Rename' });
  const entry = pop.getByRole('textbox');
  await expect(entry).toHaveValue('Music');
  await entry.fill('Pictures');
  await expect(pop.getByRole('button', { name: 'Rename' })).toBeDisabled(); // another bookmark has that name
  await entry.fill('Songs');
  await page.keyboard.press('Enter');
  await expect(place(page, 'Songs')).toBeVisible();
  await place(page, 'Songs').click();
  await expect(item(page, 'Songs')).toHaveCount(0);
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Music']); // the folder keeps its own name
  await place(page, 'Songs').click({ button: 'right' });
  await menuItem(page, 'Remove from Bookmarks').click();
  await expect(place(page, 'Songs')).toHaveCount(0);
});

test('the list\'s star: click to star, and it is on the Starred page with where it is', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  const star = item(page, 'about.md').getByRole('button', { name: 'Star', exact: true });
  await star.click();
  await expect(item(page, 'about.md').getByRole('button', { name: 'Unstar', exact: true })).toBeVisible();
  await expect(item(page, 'about.md')).toHaveAttribute('aria-selected', 'false'); // the star does not select
  await place(page, 'Starred').click();
  await expect(item(page, 'about.md')).toBeVisible();
  await expect(item(page, 'about.md').locator('.path')).toHaveText('Documents/');
  await expect(files(page).getByRole('columnheader')).toHaveText(['Name', 'Size', 'Modified', '']);
});

test('Unstar on the Starred page, with a toast whose Undo brings it back', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await item(page, 'about.md').getByRole('button', { name: 'Star', exact: true }).click();
  await place(page, 'Starred').click();
  await item(page, 'about.md').click({ button: 'right' });
  await menuItem(page, 'Unstar').click();
  await expect(item(page, 'about.md')).toHaveCount(0);
  await expect(files(page).getByRole('heading', { name: 'No Starred Files' })).toBeVisible();
  await expect(toast(page)).toContainText('“about.md” unstarred');
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(item(page, 'about.md')).toBeVisible();
});

test('a starred item shows its star in the grid; a folder can be starred from the path bar', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await files(page).getByRole('button', { name: 'Current Folder Menu' }).click();
  await menuItem(page, 'Star Folder').click();
  await place(page, 'Home').click();
  await expect(item(page, 'Documents').locator('.emblem-star')).toBeVisible();
  await expect(item(page, 'Downloads').locator('.emblem-star')).toHaveCount(0);
  await place(page, 'Starred').click();
  await item(page, 'Documents').dblclick();
  await expect(item(page, 'about.md')).toBeVisible();
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Documents']);
});

test('outside Home there is no star column', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await expect(files(page).getByRole('columnheader')).toHaveCount(4);
  await page.keyboard.press('Control+l');
  await page.keyboard.type('/etc');
  await page.keyboard.press('Enter');
  await expect(files(page).getByRole('columnheader')).toHaveText(['Name', 'Size', 'Modified']);
  await expect(item(page, 'hostname').getByRole('button', { name: 'Star' })).toHaveCount(0);
});

test('opening a file from Files puts it on the Recent page, last used first', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').dblclick();
  await expect(page.getByRole('dialog', { name: 'about.md (~/Documents) - Text Editor' })).toBeVisible();
  await closeEditor(page);
  await place(page, 'Documents').click();
  await item(page, 'skills.md').dblclick();
  await closeEditor(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Recent').click();
  await expect(content(page).getByRole('option').first()).toHaveAttribute('aria-label', 'skills.md');
  await expect(content(page).getByRole('option')).toHaveCount(2);
  await expect(files(page).getByRole('columnheader')).toHaveText(['Name', 'Size', 'Recency']);
  await expect(files(page).getByRole('columnheader', { name: 'Recency' })).toHaveAttribute('aria-sort', 'descending');
  await expect(item(page, 'about.md').locator('.path')).toHaveText('Documents/');
  await expect(item(page, 'about.md').locator('.date')).toHaveText(/^Today, /);
});

test('Recent: Open Item Location goes there with it selected; Remove From Recent takes it off the list only', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').dblclick();
  await expect(page.getByRole('dialog', { name: 'about.md (~/Documents) - Text Editor' })).toBeVisible();
  await closeEditor(page);
  await place(page, 'Recent').click();
  await item(page, 'about.md').click({ button: 'right' });
  expect(await labels(page)).toEqual(['Open With Text Editor', 'Open With…', 'Open Item Location', 'Cut', 'Copy', 'Move to…', 'Copy to…', 'Rename…', 'Remove From Recent', 'Properties']);
  await menuItem(page, 'Open Item Location').click();
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Documents']);
  await expect(item(page, 'about.md')).toHaveAttribute('aria-selected', 'true');
  await place(page, 'Recent').click();
  await item(page, 'about.md').click({ button: 'right' });
  await menuItem(page, 'Remove From Recent').click();
  await expect(files(page).getByRole('heading', { name: 'No Recent Files' })).toBeVisible();
  await place(page, 'Documents').click();
  await expect(item(page, 'about.md')).toBeVisible();
});

test('a file deleted for good leaves Recent and Starred', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await item(page, 'about.md').getByRole('button', { name: 'Star', exact: true }).click();
  await item(page, 'about.md').dblclick();
  await expect(page.getByRole('dialog', { name: 'about.md (~/Documents) - Text Editor' })).toBeVisible();
  await page.getByRole('dialog', { name: 'about.md (~/Documents) - Text Editor' }).getByRole('button', { name: 'Close' }).click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Delete');
  await place(page, 'Trash').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Delete');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await place(page, 'Recent').click();
  await expect(files(page).getByRole('heading', { name: 'No Recent Files' })).toBeVisible();
  await place(page, 'Starred').click();
  await expect(files(page).getByRole('heading', { name: 'No Starred Files' })).toBeVisible();
});

test('the Trash list says where each thing came from', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Delete');
  await place(page, 'Trash').click();
  await expect(item(page, 'about.md').locator('.path')).toHaveText('Documents/');
});

test('Downloads opens with the newest first', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Downloads').click();
  await page.keyboard.press('Control+Shift+N');
  await page.keyboard.type('old');
  await page.keyboard.press('Enter');
  await expect(item(page, 'old')).toBeVisible();
  await expect(files(page).getByRole('columnheader', { name: 'Modified' })).toHaveAttribute('aria-sort', 'descending');
});

// ---- search ------------------------------------------------------------------
const searchBox = (page: Page) => files(page).getByRole('searchbox');
const filterButton = (page: Page) => files(page).getByRole('button', { name: 'Filter Search Results' });
const filters = (page: Page) => page.getByRole('dialog', { name: 'Filter Search Results' });
const searchButton = (page: Page) => files(page).getByRole('button', { name: 'Search Current Folder' });
const everywhere = (page: Page) => files(page).locator('.sidebar').getByRole('button', { name: 'Search Everywhere' });

test('Ctrl+F puts the search entry where the path bar was; Esc puts the path bar back', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+f');
  await expect(searchBox(page)).toBeFocused();
  await expect(searchBox(page)).toHaveAttribute('placeholder', 'Search current folder');
  await expect(path(page)).toHaveCount(0);
  await expect(searchButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(item(page, 'Documents')).toBeVisible(); // nothing typed: still the folder
  await expect(files(page).getByRole('button', { name: 'Clear Entry' })).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(searchBox(page)).toHaveCount(0);
  await expect(path(page).getByRole('button')).toHaveText(['Home']);
  await expect(searchButton(page)).toHaveAttribute('aria-pressed', 'false');
});

test('the Search Current Folder button opens and closes it', async ({ page }) => {
  await openHome(page);
  await searchButton(page).click();
  await expect(searchBox(page)).toBeFocused();
  await searchButton(page).click();
  await expect(searchBox(page)).toHaveCount(0);
});

test('typing in the view starts a search: every folder below, the best first and selected, under a new title', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await page.keyboard.type('about');
  await expect(searchBox(page)).toBeFocused();
  await expect(searchBox(page)).toHaveValue('about');
  await expect(page.getByRole('dialog', { name: 'Search for “about”' })).toBeVisible();
  const first = content(page).getByRole('option').first();
  await expect(first).toHaveAttribute('aria-label', 'about.md');
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(first.locator('.path')).toHaveText('Documents/');
  await expect(sidebar(page).locator('[aria-selected="true"]')).toHaveCount(0);
  await expect(bar(page)).toContainText('“about.md” selected');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'about.md (~/Documents) - Text Editor' })).toBeVisible();
});

test('a space, an arrow or a shortcut does not start one', async ({ page }) => {
  await openHome(page);
  for (const key of ['Space', 'ArrowDown', 'Control+h']) {
    await page.keyboard.press(key);
    await expect(searchBox(page)).toHaveCount(0);
  }
});

test('with the view focused, letters and Backspace still go to the entry', async ({ page }) => {
  await openHome(page);
  await page.keyboard.type('docu');
  await page.keyboard.press('ArrowDown');
  await expect(searchBox(page)).not.toBeFocused();
  await page.keyboard.type('m');
  await expect(searchBox(page)).toHaveValue('docum');
  await page.keyboard.press('Backspace');
  await expect(searchBox(page)).toHaveValue('docu');
  await expect(path(page)).toHaveCount(0); // it did not go up a folder
});

test('Down from the entry goes to the results', async ({ page }) => {
  await openHome(page);
  await page.keyboard.type('about');
  await page.keyboard.press('ArrowDown');
  await expect(item(page, 'about.md')).toBeFocused();
});

test('emptying the entry ends the search; so does its clear icon', async ({ page }) => {
  await openHome(page);
  await page.keyboard.type('ab');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(searchBox(page)).toHaveCount(0);
  await expect(item(page, 'Documents')).toBeVisible();
  await page.keyboard.type('ab');
  await files(page).getByRole('button', { name: 'Clear Entry' }).click();
  await expect(searchBox(page)).toHaveCount(0);
});

test('Esc: the result stays selected if it is in the folder you were in', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await page.keyboard.type('skills');
  await expect(item(page, 'skills.md')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Documents']);
  await expect(item(page, 'skills.md')).toHaveAttribute('aria-selected', 'true');
  await expect(item(page, 'about.md')).toBeVisible();
});

test('Back from a search leaves the search, not the folder', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await page.keyboard.type('skills');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(searchBox(page)).toHaveCount(0);
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Documents']);
});

test('opening a folder from the results goes there and ends the search; a search is not in the history', async ({ page }) => {
  await openHome(page);
  await page.keyboard.type('wallpapers');
  await item(page, 'Wallpapers').dblclick();
  await expect(searchBox(page)).toHaveCount(0);
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Pictures', 'Wallpapers']);
  await files(page).getByRole('button', { name: 'Back' }).first().click();
  await expect(path(page).getByRole('button')).toHaveText(['Home']);
});

test('No Results Found: where it looked, and Search Everywhere keeps the words', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await page.keyboard.type('wallpapers');
  await expect(files(page).getByRole('heading', { name: 'No Results Found' })).toBeVisible();
  await expect(files(page).getByText('No matches in “Documents”')).toBeVisible();
  await files(page).getByRole('button', { name: 'Search Everywhere' }).last().click();
  await expect(searchBox(page)).toHaveValue('wallpapers');
  await expect(searchBox(page)).toHaveAttribute('placeholder', 'Search everywhere');
  await expect(item(page, 'Wallpapers')).toBeVisible();
});

test('Search Everywhere: its own page, no history or search buttons, and Esc leaves it', async ({ page }) => {
  await openHome(page);
  await everywhere(page).click();
  await expect(everywhere(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(searchBox(page)).toBeFocused();
  await expect(files(page).getByRole('heading', { name: 'Search Everywhere' })).toBeVisible();
  await expect(files(page).getByText('Find files and folders in all search locations')).toBeVisible();
  await expect(files(page).getByRole('button', { name: 'Search Settings' })).toBeDisabled();
  await expect(sidebar(page).locator('[aria-selected="true"]')).toHaveCount(0);
  await expect(searchButton(page)).toBeHidden();
  await expect(files(page).getByRole('button', { name: 'Back' }).first()).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(everywhere(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(item(page, 'Documents')).toBeVisible();
  await expect(place(page, 'Home')).toHaveAttribute('aria-selected', 'true');
});

test('Ctrl+Shift+F turns it on and off; across Home a word is found by its start, not its middle', async ({ page }) => {
  await openHome(page);
  await place(page, 'Network').click();
  await page.keyboard.press('Control+Shift+F');
  await page.keyboard.type('bout');
  await expect(files(page).getByRole('heading', { name: 'No Results Found' })).toBeVisible();
  await expect(files(page).getByText('More locations can be added to search in the settings')).toBeVisible();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('abou');
  await expect(item(page, 'about.md')).toBeVisible();
  await page.keyboard.press('Control+Shift+F');
  await expect(searchBox(page)).toHaveCount(0);
});

test('outside Home the entry says it is not a search location', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+l');
  await page.keyboard.type('/etc');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Control+f');
  await files(page).getByRole('button', { name: 'Search Information' }).click();
  const info = page.getByRole('dialog', { name: 'Search Information' });
  await expect(info.getByRole('heading', { name: 'Folder Not in Search Locations' })).toBeVisible();
  await expect(info.getByText('Search may be slow and will not include file contents')).toBeVisible();
});

test('inside Home there is nothing to say', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+f');
  await expect(files(page).getByRole('button', { name: 'Search Information' })).toHaveCount(0);
});

test('what is inside a text file is found too, with the words it matched', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await page.keyboard.type('computer');
  const row = item(page, 'README.md');
  await expect(row.locator('.path')).toHaveText('Desktop/');
  await row.getByRole('button', { name: 'Full Text Match' }).click();
  const pop = page.getByRole('dialog', { name: 'Full Text Match' });
  await expect(pop.locator('b')).toHaveText(['computer']);
  await page.keyboard.press('Escape');
  await filterButton(page).click();
  await filters(page).getByRole('button', { name: 'Only Filename' }).click();
  await page.keyboard.press('Escape');
  await expect(files(page).getByRole('heading', { name: 'No Results Found' })).toBeVisible();
  await expect(filterButton(page)).toHaveClass(/accent/);
});

test('the filters: file types add up, with no text they list what they match, and leaving the search resets them', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await page.keyboard.press('Control+f');
  await filterButton(page).click();
  await expect(filters(page).getByRole('checkbox')).toHaveText(['Audio', 'Documents', 'Folders', 'Images', 'PDF', 'Spreadsheets', 'Text', 'Videos']);
  await filters(page).getByRole('checkbox', { name: 'Documents' }).click();
  await expect(filters(page).getByRole('checkbox', { name: 'Documents' })).toHaveAttribute('aria-checked', 'true');
  await expect(filters(page)).toBeVisible();
  await expect(item(page, 'about.md')).toBeVisible();
  await expect(item(page, 'Documents')).toHaveCount(0);
  await expect(filterButton(page)).toHaveClass(/accent/);
  await filters(page).getByRole('checkbox', { name: 'Folders' }).click();
  await expect(item(page, 'about.md')).toBeVisible();
  await expect(item(page, 'Documents')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(filters(page)).toHaveCount(0);
  await expect(searchBox(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(searchBox(page)).toHaveCount(0);
  await page.keyboard.press('Control+f');
  await filterButton(page).click();
  await expect(filters(page).getByRole('checkbox', { name: 'Documents' })).toHaveAttribute('aria-checked', 'false');
});

test('turning the last filter off with no text ends the search', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+f');
  await filterButton(page).click();
  await filters(page).getByRole('checkbox', { name: 'PDF' }).click();
  await filters(page).getByRole('checkbox', { name: 'PDF' }).click();
  await expect(searchBox(page)).toHaveCount(0);
});

test('the date filter: one at a time, and Modified can become Used or Created, remembered', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+f');
  await filterButton(page).click();
  const dates = filters(page).getByRole('group', { name: 'Date' });
  await expect(filters(page).getByRole('heading', { name: 'Date Modified' })).toBeVisible();
  await expect(dates.getByRole('button')).toHaveText(['Today', 'Yesterday', 'Past Week', 'Past Month', 'Past Year', '']);
  await dates.getByRole('button', { name: 'Today' }).click();
  await expect(dates.getByRole('button', { name: 'Today' })).toHaveClass(/accent/);
  await dates.getByRole('button', { name: 'Past Week' }).click();
  await expect(dates.getByRole('button', { name: 'Today' })).not.toHaveClass(/accent/);
  await expect(dates.getByRole('button', { name: 'Past Week' })).toHaveClass(/accent/);
  await filters(page).getByRole('button', { name: 'Date Type' }).click();
  await expect(page.getByRole('menuitemradio', { name: 'Modified' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('menuitemradio', { name: 'Created' }).click();
  await expect(filters(page).getByRole('heading', { name: 'Date Created' })).toBeVisible();
  await page.reload();
  await openHome(page);
  await page.keyboard.press('Control+f');
  await filterButton(page).click();
  await expect(filters(page).getByRole('heading', { name: 'Date Created' })).toBeVisible();
});

test('a result: Open Item Location, and it can be renamed and trashed from there', async ({ page }) => {
  await openHome(page);
  await page.keyboard.type('skills');
  await item(page, 'skills.md').click({ button: 'right' });
  expect(await labels(page)).toContain('Open Item Location');
  await menuItem(page, 'Open Item Location').click();
  await expect(searchBox(page)).toHaveCount(0);
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Documents']);
  await expect(item(page, 'skills.md')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.type('skills');
  await item(page, 'skills.md').click({ button: 'right' });
  await menuItem(page, 'Move to Trash').click();
  await expect(files(page).getByRole('heading', { name: 'No Results Found' })).toBeVisible();
});

test('the background of results: New Folder and Paste are off, and there are no Properties', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').click({ button: 'right' });
  await menuItem(page, 'Copy').click();
  await page.keyboard.type('md');
  await files(page).locator('.page').click({ button: 'right', position: { x: 5, y: 400 } });
  await expect(menuItem(page, 'New Folder…')).toBeDisabled();
  await expect(menuItem(page, 'Paste')).toBeDisabled();
  await expect(menuItem(page, 'Select All')).toBeEnabled();
  expect(await labels(page)).not.toContain('Properties');
});

test('a new tab from a search opens Home, and closing a searching tab brings the search back on restore', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await page.keyboard.type('skills');
  await page.keyboard.press('Control+t');
  await expect(tabs(page)).toHaveCount(2);
  await expect(tabs(page).nth(1)).toHaveText('Home');
  await expect(searchBox(page)).toHaveCount(0);
  await tabs(page).nth(0).click();
  await expect(searchBox(page)).toHaveValue('skills');
  await expect(searchBox(page)).toBeFocused();
  await page.keyboard.press('Control+w');
  await expect(tabs(page)).toHaveCount(0);
  await page.keyboard.press('Control+Shift+T');
  await expect(searchBox(page)).toHaveValue('skills');
  await expect(item(page, 'skills.md')).toBeVisible();
});

test('each tab has its own search', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+t');
  await page.keyboard.type('about');
  await tabs(page).nth(0).click();
  await expect(searchBox(page)).toHaveCount(0);
  await tabs(page).nth(1).click();
  await expect(searchBox(page)).toHaveValue('about');
});

test('sorting a search by a column, then leaving: the folder keeps its own sort', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await page.keyboard.type('md');
  await expect(files(page).getByRole('columnheader', { name: 'Name' })).not.toHaveAttribute('aria-sort');
  await files(page).getByRole('columnheader', { name: 'Name' }).click();
  await expect(files(page).getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'ascending');
  await page.keyboard.press('Escape');
  await page.keyboard.type('md');
  await expect(files(page).getByRole('columnheader', { name: 'Name' })).not.toHaveAttribute('aria-sort');
});

test('after the Full Text Match popover the keyboard still works, however it was closed', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await page.keyboard.type('computer');
  const button = item(page, 'README.md').getByRole('button', { name: 'Full Text Match' });
  const pop = page.getByRole('dialog', { name: 'Full Text Match' });
  await button.click();
  await expect(pop).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);
  await button.click();
  await expect(pop).toBeVisible();
  await files(page).getByRole('columnheader', { name: 'Size' }).hover();
  await page.mouse.down(); // a click away
  await page.mouse.up();
  await expect(pop).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(searchBox(page)).toHaveCount(0);
});

test('a menu closed by clicking away leaves the keyboard with the view', async ({ page }) => {
  await openHome(page);
  await item(page, 'Documents').click({ button: 'right' });
  await expect(menuItem(page, 'Cut')).toBeVisible();
  await files(page).locator('.sidebar .title').click();
  await expect(menuItem(page, 'Cut')).toHaveCount(0);
  await page.keyboard.press('Control+h');
  await expect(item(page, '.bashrc')).toBeVisible();
});

test('clicking the place you are in: an empty entry stays, a search ends, and so does Search Everywhere', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+f');
  await place(page, 'Home').click();
  await expect(searchBox(page)).toBeFocused();
  await page.keyboard.type('about');
  await expect(item(page, 'about.md')).toBeVisible();
  await place(page, 'Home').click();
  await expect(searchBox(page)).toHaveCount(0);
  await expect(item(page, 'Documents')).toBeVisible();
  await expect(content(page).locator('[aria-selected="true"]')).toHaveCount(0);
  await everywhere(page).click();
  await place(page, 'Home').click();
  await expect(everywhere(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(searchBox(page)).toHaveCount(0);
});

// ---- drag and drop -------------------------------------------------------------
const center = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
/** Press on `from`, go past the drag threshold, on to `to`, and wait there `hold` ms; then release unless told not to. */
async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }, { release = true, hold = 0 } = {}) {
  const a = await center(from);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 12, a.y + 12, { steps: 3 });
  const b = 'x' in to ? to : await center(to);
  await page.mouse.move(b.x - 12, b.y, { steps: 6 });
  await page.mouse.move(b.x, b.y, { steps: 3 }); // some way in: a folder in the view opens only then
  if (hold) await page.waitForTimeout(hold);
  if (release) await page.mouse.up();
}
const picture = (page: Page) => page.locator('.dnd-picture');
const dragCursor = (page: Page) => page.evaluate(() => document.documentElement.style.getPropertyValue('--dnd-cursor'));
const below = async (page: Page) => {
  const last = (await content(page).getByRole('option').last().boundingBox())!;
  return { x: last.x + 40, y: last.y + last.height + 60 };
};

test('a file dropped on a folder moves there; while over it, the folder is the target and the cursor says move', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await drag(page, item(page, 'Public'), item(page, 'Music'), { release: false });
  await expect(picture(page).locator('img')).toHaveCount(1);
  await expect(item(page, 'Music')).toHaveClass(/drop-active/);
  expect(await dragCursor(page)).toBe('move');
  await page.mouse.up();
  await expect(item(page, 'Public')).toHaveCount(0);
  await expect(picture(page)).toHaveCount(0); // a drop that did something: the picture just goes
  await page.keyboard.press('Control+z');
  await expect(item(page, 'Public')).toBeVisible();
});

test('a drop on the folder it is already in does nothing; with Ctrl it duplicates, and the copy is selected', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await drag(page, item(page, 'about.md'), await below(page));
  await expect(content(page).getByRole('option')).toHaveCount(3);
  await page.keyboard.down('Control');
  await drag(page, item(page, 'about.md'), await below(page), { release: false });
  expect(await dragCursor(page)).toBe('copy');
  await page.mouse.up();
  await page.keyboard.up('Control');
  await expect(item(page, 'about (Copy).md')).toHaveAttribute('aria-selected', 'true');
});

test('Escape cancels: nothing moves, and the picture slides back and fades', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); // the slide back is an animation
  await openHome(page);
  await drag(page, item(page, 'Public'), item(page, 'Music'), { release: false });
  // Measured in the page, so a slow machine cannot miss the 500ms it is on screen: the picture's slide back, how long
  // it lasted, and that it is gone afterwards (DRAG_FAILED_DURATION).
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    const slides: Promise<{ duration: unknown; lasted: number; gone: boolean }>[] = [];
    Object.assign(window, { slides });
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options);
      if (this.classList.contains('dnd-picture')) {
        const start = performance.now();
        const el = this;
        slides.push(
          animation.finished.then(
            () => new Promise((done) => requestAnimationFrame(() => done({ duration: (options as KeyframeAnimationOptions).duration, lasted: performance.now() - start, gone: !el.isConnected })))
          ),
        );
      }
      return animation;
    };
  });
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as unknown as { slides: unknown[] }).slides.length)).toBe(1);
  const slide = await page.evaluate(() => (window as unknown as { slides: Promise<{ duration: unknown; lasted: number; gone: boolean }>[] }).slides[0]);
  expect(slide.duration).toBe(500);
  expect(slide.lasted).toBeGreaterThanOrEqual(490);
  expect(slide.gone).toBe(true);
  await page.mouse.up();
  await expect(searchBox(page)).toHaveCount(0); // the keys went to the drag, not to the window
  // Held over Music for half a second on a slow machine, the drag opens it; either way Public is still in Home.
  await page.keyboard.press('Alt+Home');
  await expect(item(page, 'Public')).toBeVisible();
});

test('held over a folder the drag opens it; the drop then goes to the folder shown, and what arrives is selected', async ({ page }) => {
  await openHome(page);
  await drag(page, item(page, 'Public'), item(page, 'Music'), { release: false, hold: 800 });
  await expect(path(page).getByRole('button')).toHaveText(['Home', 'Music']);
  const view = (await files(page).locator('.page').boundingBox())!; // Music is empty: the status page takes drops too
  await page.mouse.move(view.x + view.width / 2, view.y + view.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(item(page, 'Public')).toHaveAttribute('aria-selected', 'true');
});

test('over the sidebar, places a drop cannot go to are dimmed; a drop on a bookmark moves it there, selecting nothing', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await drag(page, item(page, 'about.md'), place(page, 'Music'), { release: false });
  await expect(place(page, 'Recent')).toHaveClass(/insensitive/);
  await expect(place(page, 'Network')).toHaveClass(/insensitive/);
  await expect(place(page, 'Home')).not.toHaveClass(/insensitive/);
  await expect(place(page, 'Music')).toHaveClass(/drop-active/);
  await page.mouse.up();
  await expect(place(page, 'Recent')).not.toHaveClass(/insensitive/);
  await expect(item(page, 'about.md')).toHaveCount(0);
  await place(page, 'Music').click();
  await expect(item(page, 'about.md')).toHaveAttribute('aria-selected', 'false');
});

test('the Trash row trashes, with its toast; the Starred row stars', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await drag(page, item(page, 'skills.md'), place(page, 'Trash'));
  await expect(toast(page)).toContainText('“skills.md” moved to trash');
  await drag(page, item(page, 'about.md'), place(page, 'Starred'));
  await expect(item(page, 'about.md').getByRole('button', { name: 'Unstar', exact: true })).toBeVisible();
  await expect(item(page, 'about.md')).toBeVisible(); // starring leaves it where it is
});

test('Recent takes nothing: the cursor says so, and the drop slides back', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openHome(page);
  await drag(page, item(page, 'Public'), place(page, 'Recent'), { release: false });
  expect(await dragCursor(page)).toBe('no-drop');
  await expect(place(page, 'Recent')).not.toHaveClass(/drop-active/);
  await page.mouse.up();
  await expect(picture(page)).toHaveCount(1);
  await expect(item(page, 'Public')).toBeVisible();
});

test('a lone folder brings out New bookmark above the bookmarks, and a drop there adds it first', async ({ page }) => {
  await openHome(page);
  const newRow = sidebar(page).getByRole('option', { name: 'New bookmark' });
  await drag(page, item(page, 'Public'), place(page, 'Documents'), { release: false });
  await expect(newRow).toBeVisible();
  await expect(newRow).toHaveAttribute('title', 'Add a new bookmark');
  await page.mouse.move(...Object.values(await center(newRow)) as [number, number], { steps: 4 });
  await page.mouse.up();
  await expect(newRow).toHaveCount(0);
  await expect(sidebar(page).getByRole('option')).toHaveText(['Home', 'Recent', 'Starred', 'Network', 'Trash', 'Public', 'Documents', 'Music', 'Pictures', 'Videos', 'Downloads']);
});

test('two items, or a file, bring no New bookmark row', async ({ page }) => {
  await openHome(page);
  await item(page, 'Public').click();
  await item(page, 'Videos').click({ modifiers: ['Control'] });
  await drag(page, item(page, 'Public'), place(page, 'Documents'), { release: false });
  await expect(sidebar(page).getByRole('option', { name: 'New bookmark' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.mouse.up();
});

test('a bookmark can be dragged to another place among them; a line shows where', async ({ page }) => {
  await openHome(page);
  const music = (await place(page, 'Music').boundingBox())!;
  await drag(page, place(page, 'Videos'), { x: music.x + 40, y: music.y + 4 }, { release: false });
  await expect(sidebar(page).locator('.placeholder')).toHaveCount(1);
  await expect(place(page, 'Videos')).toBeHidden();
  await expect(picture(page)).toContainText('Videos');
  await page.mouse.up();
  await expect(sidebar(page).getByRole('option')).toHaveText(['Home', 'Recent', 'Starred', 'Network', 'Trash', 'Documents', 'Videos', 'Music', 'Pictures', 'Downloads']);
  await expect(path(page).getByRole('button')).toHaveText(['Home']); // the release was not a click on the row
});

test('a path bar button takes a drop into its folder; held there, the drag goes to it', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await drag(page, item(page, 'about.md'), path(page).getByRole('button', { name: 'Home' }), { release: false });
  await expect(path(page).getByRole('button', { name: 'Home' })).toHaveClass(/drop-active/);
  await page.mouse.up();
  await expect(item(page, 'about.md')).toHaveCount(0);
  await drag(page, item(page, 'skills.md'), path(page).getByRole('button', { name: 'Home' }), { release: false, hold: 800 });
  await expect(path(page).getByRole('button')).toHaveText(['Home']);
  await page.mouse.up();
  await expect(item(page, 'skills.md')).toHaveAttribute('aria-selected', 'true');
});

test('a drop on a tab goes to the folder it shows; held there, the tab comes to the front', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await page.keyboard.press('Control+t');
  await place(page, 'Music').click();
  await tabs(page).nth(0).click();
  await drag(page, item(page, 'about.md'), tabs(page).nth(1));
  await expect(item(page, 'about.md')).toHaveCount(0);
  await drag(page, item(page, 'skills.md'), tabs(page).nth(1), { release: false, hold: 800 });
  await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.mouse.up();
  await expect(item(page, 'about.md')).toBeVisible();
});

test('several items make a pile of 64px icons; the first is on top', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await page.keyboard.press('Control+a');
  await drag(page, item(page, 'about.md'), place(page, 'Music'), { release: false });
  const icons = picture(page).locator('img');
  await expect(icons).toHaveCount(3);
  expect((await icons.last().boundingBox())!.width).toBe(64);
  await page.keyboard.press('Escape');
  await page.mouse.up();
});

test('what cannot be moved from where it is is copied, Shift or not', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await page.keyboard.press('Control+l');
  await page.keyboard.type('/etc');
  await page.keyboard.press('Enter');
  await page.keyboard.down('Shift');
  await drag(page, item(page, 'hostname'), place(page, 'Documents'), { release: false });
  expect(await dragCursor(page)).toBe('copy');
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(item(page, 'hostname')).toBeVisible();
  await place(page, 'Documents').click();
  await expect(item(page, 'hostname')).toBeVisible();
});

test('dragged out of the Trash, a file is restored where it is dropped, and Undo says so', async ({ page }) => {
  await openHome(page);
  await page.keyboard.press('Control+1');
  await place(page, 'Documents').click();
  await item(page, 'contact.md').click();
  await page.keyboard.press('Delete');
  await place(page, 'Trash').click();
  await drag(page, item(page, 'contact.md'), place(page, 'Music'));
  await expect(files(page).getByRole('heading', { name: 'Trash is Empty' })).toBeVisible();
  await files(page).getByRole('button', { name: 'Main Menu' }).click();
  await expect(menuItem(page, 'Undo Restore From Trash')).toBeVisible();
  await page.keyboard.press('Escape');
  await place(page, 'Music').click();
  await expect(item(page, 'contact.md')).toBeVisible();
});

test('after Escape, letting go on the row the drag began on does not open it', async ({ page }) => {
  await openHome(page);
  const videos = await center(place(page, 'Videos'));
  await page.mouse.move(videos.x, videos.y);
  await page.mouse.down();
  await page.mouse.move(videos.x + 12, videos.y + 12, { steps: 3 });
  await page.keyboard.press('Escape');
  await page.mouse.move(videos.x, videos.y, { steps: 3 });
  await page.mouse.up();
  await expect(path(page).getByRole('button')).toHaveText(['Home']);
});

test('About Files: the values Files and its metainfo give, with Support Questions, and the GNOME Project in every credit', async ({ page }) => {
  await openHome(page);
  await files(page).getByRole('button', { name: 'Main Menu' }).click();
  await menuItem(page, 'About Files').click();
  const about = page.getByRole('dialog', { name: 'About' });
  await expect(about.getByRole('heading', { name: 'Files' })).toBeVisible();
  await expect(about).toContainText('The GNOME Project');
  await expect(about.getByRole('button', { name: '50.2.2' })).toBeVisible();
  await expect(about.getByRole('link', { name: 'Website' })).toHaveAttribute('href', 'https://apps.gnome.org/Nautilus/');
  await expect(about.getByRole('link', { name: 'Support Questions' })).toHaveAttribute('href', 'https://discourse.gnome.org/tag/nautilus');
  await expect(about.getByRole('link', { name: 'Report an Issue' })).toHaveAttribute('href', 'https://gitlab.gnome.org/GNOME/nautilus/issues');
  await expect(about.getByRole('button', { name: 'Troubleshooting' })).toBeDisabled();

  await about.getByRole('button', { name: 'Credits' }).click();
  await expect(about.getByRole('heading')).toHaveText(['Code by', 'Design by', 'Documentation by']);
  await expect(about.locator('.adw-group').nth(2)).toContainText('Sun Microsystems');
  await about.getByRole('button', { name: 'Back' }).click();
  await about.getByRole('button', { name: 'Legal' }).click();
  await expect(about).toContainText('© 1999 The Files Authors');
  await expect(about.getByRole('link', { name: 'GNU General Public License, version 3 or later' })).toHaveAttribute('href', 'https://www.gnu.org/licenses/gpl-3.0.html');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(about).toHaveCount(0);
});


const props = (page: Page) => page.getByRole('dialog', { name: 'Properties' });
const FULL_DATE = /^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} [AP]M$/;
const row = (page: Page, title: string) => props(page).locator('.adw-row', { hasText: title });

test('Properties of a file: name, type, size, its folder, three dates and your access; Esc closes', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click({ button: 'right' });
  await menuItem(page, 'Properties').click();
  await expect(props(page).getByRole('heading', { name: 'about.md' })).toBeVisible();
  await expect(props(page)).toContainText('Markdown document');
  await expect(props(page).locator('.caption').first()).toHaveText(/^\d+(\.\d)? (bytes|kB)$/);
  await expect(props(page).locator('.caption').first()).toHaveAttribute('title', /^[\d,]+ bytes$/);
  await expect(row(page, 'Parent Folder').locator('.subtitle')).toHaveText('/home/ubuntu/Documents/');
  for (const title of ['Accessed', 'Modified', 'Created']) await expect(row(page, title).locator('.subtitle')).toHaveText(FULL_DATE);
  await expect(props(page).getByRole('button', { name: /^Permissions/ })).toContainText('Read and Write');
  await expect(props(page).getByRole('switch', { name: 'Executable as Program' })).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await expect(props(page)).toHaveCount(0);
  await expect(item(page, 'about.md')).toBeFocused();
});

test('Ctrl+I with nothing selected: the folder itself, everything in it counted, and the free space', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await content(page).focus();
  await page.keyboard.press('Control+i');
  await expect(props(page).getByRole('heading', { name: 'Documents' })).toBeVisible();
  await expect(props(page).locator('.contents')).toHaveText(/^\d+ items, totalling [\d.]+ (bytes|kB|MB)$/);
  await expect(props(page)).toContainText(/\d+\.\d GB Free/);
  await expect(props(page).locator('.labels p', { hasText: /^Folder$/ })).toHaveCount(0); // no type for one folder
  await expect(row(page, 'Accessed')).toHaveCount(0);
});

test('Alt+Enter on two files: their names, the shared type, no dates', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await item(page, 'skills.md').click({ modifiers: ['Control'] });
  await page.keyboard.press('Alt+Enter');
  await expect(props(page).getByRole('heading')).toHaveText(/^(about\.md, skills\.md|skills\.md, about\.md)$/);
  await expect(props(page)).toContainText('Markdown document');
  await expect(props(page).locator('.contents')).toHaveText(/^2 items, totalling /);
  await expect(row(page, 'Modified')).toHaveCount(0);
});

test('Set Custom Permissions: owner, group and others; nothing to change yet; Esc goes back first', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Control+i');
  await props(page).getByRole('button', { name: /^Permissions/ }).click();
  await expect(props(page)).toContainText('Set Custom Permissions');
  await expect(props(page)).not.toContainText('Only the owner can edit these permissions');
  const combos = props(page).locator('.combo');
  await expect(combos.locator('.titles')).toHaveText(['Owner', 'Access', 'Group', 'Access', 'Access']);
  await expect(combos.locator('.value')).toHaveText(['ubuntu', 'Read and Write', 'ubuntu', 'Read-Only', 'Read-Only']);
  for (const combo of await combos.all()) await expect(combo).toBeDisabled();
  await expect(props(page).getByRole('heading', { name: 'Other Users' })).toBeVisible();
  await expect(row(page, 'Security Context').locator('.subtitle')).toHaveText('Unknown');
  await page.keyboard.press('Escape');
  await expect(props(page).getByRole('heading', { name: 'about.md' })).toBeVisible();
  await expect(props(page).getByRole('button', { name: /^Permissions/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(props(page)).toHaveCount(0);
});

test('what root owns says so, and only root may change it', async ({ page }) => {
  await openHome(page);
  await files(page).getByRole('button', { name: 'Main Menu' }).focus();
  await page.keyboard.press('Control+l');
  await page.keyboard.type('/etc/');
  await page.keyboard.press('Enter');
  await item(page, 'hostname').click();
  await page.keyboard.press('Control+i');
  await expect(props(page).getByRole('button', { name: /^Permissions/ })).toContainText('Read-Only');
  await expect(props(page).getByRole('button', { name: 'Star' })).toHaveCount(0);
  await props(page).getByRole('button', { name: /^Permissions/ }).click();
  await expect(props(page)).toContainText('Only the owner can edit these permissions');
  await expect(props(page).locator('.combo .value').first()).toHaveText('root');
});

test('the star in Properties stars and unstars with no Undo; a screen reader hears it', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Control+i');
  await props(page).getByRole('button', { name: 'Star' }).click();
  await expect(props(page).getByRole('button', { name: 'Unstar' })).toBeVisible();
  await expect(props(page).locator('[aria-live]')).toHaveText('starred');
  await page.keyboard.press('Escape');
  await place(page, 'Starred').click();
  await expect(item(page, 'about.md')).toBeVisible();
  await files(page).getByRole('button', { name: 'Main Menu' }).click();
  await expect(undoRow(page)).toBeDisabled();
});

test('Open Parent Folder: a new window there, with the item selected', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Control+i');
  await props(page).getByRole('button', { name: 'Open Parent Folder', exact: true }).click();
  await expect(files(page)).toHaveCount(2);
  const other = files(page).last().getByRole('listbox', { name: 'Content' });
  await expect(other.getByRole('option', { name: 'about.md', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(files(page).last()).toHaveAttribute('aria-label', 'Documents');
});

test('Properties from a sidebar row and from a path bar button; not for Recent or the Trash', async ({ page }) => {
  await openHome(page);
  await place(page, 'Pictures').click({ button: 'right' });
  await menuItem(page, 'Properties').click();
  await expect(props(page).getByRole('heading', { name: 'Pictures' })).toBeVisible();
  await page.keyboard.press('Escape');
  await place(page, 'Recent').click({ button: 'right' });
  expect(await labels(page)).not.toContain('Properties');
  await page.keyboard.press('Escape');
  await place(page, 'Documents').click();
  await path(page).getByRole('button', { name: 'Home' }).click({ button: 'right' });
  await menuItem(page, 'Properties').click();
  await expect(props(page).getByRole('heading', { name: 'ubuntu' })).toBeVisible();
});

test('/ is the computer: named Ubuntu, with the disk', async ({ page }) => {
  await openHome(page);
  await files(page).getByRole('button', { name: 'Main Menu' }).focus();
  await page.keyboard.press('Control+l');
  await page.keyboard.type('/');
  await page.keyboard.press('Enter');
  await expect(item(page, 'home')).toHaveAttribute('aria-selected', 'true'); // the folder it came from
  await page.keyboard.press('Control+Shift+a');
  await page.keyboard.press('Control+i');
  await expect(props(page).getByRole('heading', { name: 'Ubuntu' })).toBeVisible();
  await expect(props(page)).toContainText('68.7 GB total');
  await expect(props(page).getByRole('meter', { name: 'Disk usage' })).toBeVisible();
  await expect(props(page).getByRole('button', { name: 'Open in Disks' })).toBeDisabled();
});

test('the pop-out button: Properties leaves the dialog for a Files window of its own, as tall as it is; Esc closes it', async ({ page }) => {
  await openHome(page);
  await place(page, 'Documents').click();
  await item(page, 'about.md').click();
  await page.keyboard.press('Control+i');
  const height = await props(page).locator('.scroll').evaluate((s) => s.scrollHeight);
  await props(page).getByRole('button', { name: 'Open in Window' }).click();
  await expect(props(page)).toHaveCount(0);
  await expect(files(page)).toHaveCount(2);
  const own = files(page).last();
  await expect(own.getByRole('heading', { name: 'about.md' })).toBeVisible();
  await expect(own.getByRole('button', { name: 'Open in Window' })).toHaveCount(0);
  const box = (await own.boundingBox())!;
  expect(box.width).toBe(480);
  expect(box.height).toBeGreaterThan(height);
  await own.getByRole('button', { name: /^Permissions/ }).click();
  await page.keyboard.press('Escape');
  await expect(own.getByRole('heading', { name: 'about.md' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(files(page)).toHaveCount(1);
});
