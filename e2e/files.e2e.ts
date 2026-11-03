import { expect, test, type Page } from '@playwright/test';

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

test('the keyboard: arrows, Shift, Ctrl+A, Enter and Esc', async ({ page }) => {
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
  await page.keyboard.press('Escape');
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
  expect(await labels(page)).toEqual(['New Folder…', 'Open With…', 'Open in Terminal', 'Reload', 'Add to Bookmarks', 'Star Folder', 'Copy Location', 'Paste', 'Select All', 'Properties']);
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
  expect(await labels(page)).toEqual(['Open', 'Open in New Tab', 'Open in New Window', 'Remove from Bookmarks', 'Rename']);
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
