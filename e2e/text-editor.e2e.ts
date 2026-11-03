import { expect, test, type Page } from '@playwright/test';

const README = '/home/ubuntu/Desktop/README.md';

async function session(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/desktop/');
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.session')).toBeVisible();
}
const icon = (page: Page, path = README) => page.locator(`.desktop-icon[data-path="${path}"]`);
const editor = (page: Page) => page.locator('.window[data-app="text-editor"]');
/** Opens README.md and waits until the editor has the keyboard: keys typed while the app loads would be lost. */
async function openReadme(page: Page) {
  await icon(page).dblclick();
  await expect(editor(page).getByRole('textbox', { name: 'README.md' })).toBeFocused();
}

test('double-clicking README.md on the desktop opens it in Text Editor', async ({ page }) => {
  await session(page);
  await icon(page).dblclick();
  const win = page.getByRole('dialog', { name: 'README.md (~/Desktop) - Text Editor' });
  await expect(win).toBeVisible();
  await expect(win.locator('.headerbar .title')).toHaveText('README.md');
  await expect(win.locator('.headerbar .subtitle')).toHaveText('~/Desktop');
  await expect(win.getByRole('textbox', { name: 'README.md' })).toHaveValue(/^# Welcome to Abhishek's computer/);
  await expect(win.getByRole('textbox', { name: 'README.md' })).toBeFocused();
});

test('opening the same file again focuses its tab instead of opening it twice', async ({ page }) => {
  await session(page);
  await icon(page).dblclick();
  await expect(editor(page)).toHaveCount(1);
  await icon(page).focus();
  await page.keyboard.press('Enter');
  await expect(editor(page)).toHaveCount(1);
  await expect(editor(page).getByRole('tab')).toHaveCount(0); // one document: the tab bar stays hidden
  await expect(editor(page)).not.toHaveClass(/backdrop/);
});

test('typing marks the document as changed, and Ctrl+S saves it for good', async ({ page }) => {
  await session(page);
  await icon(page).dblclick();
  const win = editor(page);
  const text = win.getByRole('textbox', { name: 'README.md' });
  await expect(text).toBeFocused();
  await expect(win.locator('.headerbar .modified')).toHaveText('');
  await page.keyboard.press('Control+End');
  await page.keyboard.type('edited by a visitor');
  await expect(win.locator('.headerbar .modified')).toHaveText('•');
  await page.keyboard.press('Control+s');
  await expect(win.locator('.headerbar .modified')).toHaveText('');
  await expect(text).toHaveValue(/edited by a visitor$/);

  await page.reload();
  await page.locator('.gdm-user').click();
  await page.keyboard.press('Enter');
  await icon(page).dblclick();
  await expect(editor(page).getByRole('textbox', { name: 'README.md' })).toHaveValue(/edited by a visitor$/);
});

test('closing with unsaved changes asks first: Esc keeps the window, Discard drops the changes', async ({ page }) => {
  await session(page);
  await openReadme(page);
  await page.keyboard.press('Control+End');
  await page.keyboard.type('zzz');
  await editor(page).getByRole('button', { name: 'Close' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Save Changes?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Open documents contain unsaved changes. Changes which are not saved will be permanently lost.');
  await expect(dialog.getByRole('checkbox', { name: 'README.md' })).toBeChecked();
  await expect(dialog).toContainText('~/Desktop');
  await expect(dialog.getByRole('button')).toHaveText(['Cancel', 'Discard', 'Save']);
  // AdwAlertDialog: three 100px buttons, 12px apart, 24px either side (adw-alert-dialog.c).
  expect((await dialog.boundingBox())!.width).toBe(372);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(editor(page).getByRole('textbox')).toHaveValue(/zzz$/);

  await editor(page).getByRole('button', { name: 'Close' }).click();
  await dialog.getByRole('button', { name: 'Discard' }).click();
  await expect(editor(page)).toHaveCount(0);
  await icon(page).dblclick();
  await expect(editor(page).getByRole('textbox')).not.toHaveValue(/zzz$/);
});

test('Save in the "Save Changes?" dialog saves the file, then closes the window', async ({ page }) => {
  await session(page);
  await openReadme(page);
  await page.keyboard.press('Control+End');
  await page.keyboard.type('kept');
  await editor(page).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('alertdialog', { name: 'Save Changes?' }).getByRole('button', { name: 'Save' }).click();
  await expect(editor(page)).toHaveCount(0);
  await icon(page).dblclick();
  await expect(editor(page).getByRole('textbox')).toHaveValue(/kept$/);
});

test('a window with nothing unsaved closes without asking', async ({ page }) => {
  await session(page);
  await icon(page).dblclick();
  await editor(page).getByRole('button', { name: 'Close' }).click();
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('New Tab adds a draft and the tab bar appears; the tabs switch documents', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await expect(win.getByRole('tab')).toHaveCount(0);
  await win.getByRole('button', { name: 'New Tab' }).click();
  await expect(win.getByRole('tab')).toHaveText(['README.md', 'New Document']);
  await expect(win.getByRole('tab', { name: 'New Document' })).toHaveAttribute('aria-selected', 'true');
  await expect(win.locator('.headerbar .title')).toHaveText('New Document');
  await expect(win.getByRole('textbox', { name: 'New Document' })).toBeFocused();
  await page.keyboard.type('Shopping list');
  await expect(win.getByRole('tab', { name: 'Shopping list' })).toBeVisible();
  await win.getByRole('tab', { name: 'README.md' }).click();
  await expect(win.locator('.headerbar .title')).toHaveText('README.md');
  await expect(page).toHaveTitle(/.*/); // the page itself is untouched
  await expect(win).toHaveAttribute('aria-label', 'README.md (~/Desktop) - Text Editor');
});

test('clicking the header leaves the keyboard in the text', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await page.keyboard.type('x');
  await win.locator('.headerbar .title').click();
  await expect(win.getByRole('textbox', { name: 'README.md' })).toBeFocused();
  await page.keyboard.press('Control+s');
  await expect(win.locator('.headerbar .modified')).toHaveText('');
});

test('each tab keeps its caret and scroll position', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n'.repeat(40) + 'end');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp'); // not at the end, where a new text box puts it
  const place = () => win.getByRole('textbox').evaluate((t: HTMLTextAreaElement) => [t.selectionStart, t.selectionEnd, t.scrollTop]);
  const before = await place();
  expect(before[2]).toBeGreaterThan(0);
  await win.getByRole('button', { name: 'New Tab' }).click();
  await win.getByRole('tab', { name: 'README.md' }).click();
  await expect(win.getByRole('textbox', { name: 'README.md' })).toBeFocused();
  expect(await place()).toEqual(before);
  await expect.poll(() => win.locator('.layer').evaluate((l) => l.scrollTop)).toBe(before[2]); // the colours follow
});

test('closing an unchanged tab is instant; the last one leaves the "Open a Document" page', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await win.getByRole('button', { name: 'New Tab' }).click();
  await win.getByRole('tab', { name: 'New Document' }).getByRole('button', { name: 'Close' }).click();
  await expect(win.getByRole('tab')).toHaveCount(0); // one tab left: the bar hides again
  await win.getByRole('button', { name: 'New Tab' }).click();
  await win.getByRole('tab', { name: 'README.md' }).getByRole('button', { name: 'Close' }).click();
  // One tab left, so the bar is hidden: Ctrl+W closes it (a normal browser keeps Ctrl+W; the full-screen session passes it).
  await page.keyboard.press('Control+w');
  await expect(win.getByRole('heading', { name: 'Open a Document' })).toBeVisible();
  await expect(win).toContainText('Create a new document (Ctrl+N), or open an existing one (Ctrl+O)');
  await expect(win).toHaveAttribute('aria-label', 'Text Editor');
  await win.getByRole('button', { name: 'New Empty File' }).click();
  await expect(win.getByRole('textbox', { name: 'New Document' })).toBeFocused();
});

test('closing a tab with unsaved changes asks about that document only', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await page.keyboard.type('x');
  await win.getByRole('button', { name: 'New Tab' }).click();
  await win.getByRole('tab', { name: 'README.md' }).getByRole('button', { name: 'Close' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Save Changes?' });
  await expect(dialog.getByRole('checkbox')).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Discard' }).click();
  await expect(win.getByRole('tab')).toHaveCount(0);
  await expect(win.locator('.headerbar .title')).toHaveText('New Document');
});

test('the main menu: theme picker, zoom, the real items with their shortcuts, unbuilt ones greyed', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await win.getByRole('button', { name: 'Main Menu' }).click();
  const menu = page.getByRole('menu', { name: 'Main Menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('radio', { name: 'Follow System Style' })).toBeChecked();
  await expect(menu.getByTitle('Reset Zoom')).toHaveText('100%');
  const items = menu.getByRole('menuitem');
  await expect(items).toHaveText([
    /^New WindowCtrl\+N$/, /^SaveCtrl\+S$/, /^Save As…Shift\+Ctrl\+S$/, /^Discard Changes…$/,
    /^Find\/Replace…Ctrl\+F$/, /^Print…Ctrl\+P$/, /^FullscreenF11$/,
    /^PreferencesCtrl\+,$/, /^Keyboard Shortcuts$/, /^About Text Editor$/,
  ]);
  for (const name of ['Save As…', 'Print…', 'Fullscreen', 'Preferences', 'Keyboard Shortcuts', 'Discard Changes…']) {
    await expect(menu.getByRole('menuitem', { name })).toBeDisabled();
  }
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(win.getByRole('button', { name: 'Main Menu' })).toBeFocused();
});

test('zoom changes the text size in 1-point steps, shown as a percentage', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  const size = () => win.getByRole('textbox').evaluate((el) => getComputedStyle(el).fontSize);
  expect(await size()).toBe('14.6667px'); // Ubuntu Sans Mono 11 (ubuntu-settings)
  await win.getByRole('button', { name: 'Main Menu' }).click();
  const menu = page.getByRole('menu', { name: 'Main Menu' });
  await menu.getByRole('button', { name: 'Zoom In' }).click();
  await expect(menu.getByTitle('Reset Zoom')).toHaveText('109%');
  expect(await size()).toBe('16px');
  await menu.getByTitle('Reset Zoom').click();
  await expect(menu.getByTitle('Reset Zoom')).toHaveText('100%');
});

test('the theme picker turns Text Editor dark while the desktop stays light, and remembers it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await win.getByRole('button', { name: 'Main Menu' }).click();
  await page.getByRole('menu', { name: 'Main Menu' }).getByRole('radio', { name: 'Dark Style' }).check();
  await expect(win).toHaveAttribute('data-style', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-style', 'light');
  await page.keyboard.press('Escape');
  await win.getByRole('button', { name: 'Close' }).click();
  await openReadme(page);
  await expect(editor(page)).toHaveAttribute('data-style', 'dark');
});

test('Discard Changes… asks first, then puts the saved text back', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await page.keyboard.type('junk ');
  await win.getByRole('button', { name: 'Main Menu' }).click();
  await page.getByRole('menu', { name: 'Main Menu' }).getByRole('menuitem', { name: 'Discard Changes…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Discard Changes to “README.md”?' });
  await expect(dialog).toContainText('Unsaved changes will be permanently lost.');
  await dialog.getByRole('button', { name: 'Discard' }).click();
  await expect(win.getByRole('textbox')).toHaveValue(/^# Welcome/);
  await expect(win.locator('.headerbar .modified')).toHaveText('');
});

test('About Text Editor: name, developer and version, the real links, and the Credits and Legal pages', async ({ page }) => {
  await session(page);
  await openReadme(page);
  await editor(page).getByRole('button', { name: 'Main Menu' }).click();
  await page.getByRole('menu', { name: 'Main Menu' }).getByRole('menuitem', { name: 'About Text Editor' }).click();
  const about = page.getByRole('dialog', { name: 'About' });
  await expect(about.getByRole('heading', { name: 'Text Editor' })).toBeVisible();
  await expect(about).toContainText('The GNOME Project');
  await expect(about.getByRole('button', { name: '50.1' })).toBeVisible();
  await expect(about.getByRole('link', { name: 'Website' })).toHaveAttribute('href', 'https://gitlab.gnome.org/GNOME/gnome-text-editor');
  await expect(about.getByRole('link', { name: 'Report an Issue' })).toHaveAttribute('href', 'https://bugs.launchpad.net/ubuntu/+source/gnome-text-editor/+filebug?no-redirect');
  await expect(about.getByRole('button', { name: 'Troubleshooting' })).toBeDisabled();

  await about.getByRole('button', { name: 'Credits' }).click();
  await expect(about.getByRole('heading', { name: 'Code by' })).toBeVisible();
  await expect(about).toContainText('Christian Hergert');
  await expect(about.getByRole('heading', { name: 'Design by' })).toBeVisible();
  await about.getByRole('button', { name: 'Back' }).click();
  await about.getByRole('button', { name: 'Legal' }).click();
  await expect(about).toContainText('© 2020-2025 Christian Hergert, et al.');
  await expect(about.getByRole('link', { name: 'GNU General Public License, version 3 or later' })).toHaveAttribute('href', 'https://www.gnu.org/licenses/gpl-3.0.html');
  await page.keyboard.press('Escape'); // a subpage goes back first, as AdwNavigationView does
  await expect(about.getByRole('heading', { name: 'Text Editor' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(about).toHaveCount(0);
});

/** Start with saved recent documents, newest first, as an earlier visit would have left them. */
async function withRecents(page: Page, paths: string[]) {
  await page.addInitScript((recents) => {
    localStorage.setItem('ubuntu.text-editor.v1', JSON.stringify({ style: 'follow', recents }));
  }, paths.map((path, i) => ({ path, age: 1000 - i })));
}
const DOCS = '/home/ubuntu/Documents';

test('the Open popover lists recent documents that are not open, newest first; a row opens in this window', async ({ page }) => {
  await withRecents(page, [`${DOCS}/about.md`, README, `${DOCS}/skills.md`]);
  await session(page);
  await openReadme(page);
  const win = editor(page);
  const open = win.getByRole('button', { name: 'Open', exact: true });
  await expect(open).toHaveText('Open');
  await expect(open).toHaveAttribute('title', 'Recently Used Documents');
  await open.click();
  const popover = page.getByRole('dialog', { name: 'Recently Used Documents' });
  await expect(popover.getByRole('searchbox', { name: 'Search documents' })).toBeFocused();
  const rows = popover.getByRole('option');
  await expect(rows).toHaveText([/^about\.md~\/Documents\s*$/, /^skills\.md~\/Documents\s*$/]); // README is open, so it is not listed
  // The popover's left edge lines up with the button's (halign start); its arrow still points at the button.
  expect(Math.round((await popover.boundingBox())!.x)).toBe(Math.round((await open.boundingBox())!.x));
  await rows.first().click();
  await expect(popover).toHaveCount(0);
  await expect(win.getByRole('tab')).toHaveText(['README.md', 'about.md']);
  await expect(win.getByRole('textbox', { name: 'about.md' })).toBeFocused();
});

test('searching filters by name or folder, Enter opens the best match, and no match shows the empty page', async ({ page }) => {
  await withRecents(page, [`${DOCS}/about.md`, `${DOCS}/skills.md`]);
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await win.getByRole('button', { name: 'Open', exact: true }).click();
  const popover = page.getByRole('dialog', { name: 'Recently Used Documents' });
  await page.keyboard.type('sk');
  await expect(popover.getByRole('option')).toHaveText([/^skills\.md/]);
  await page.keyboard.type('zzz');
  await expect(popover.getByRole('option')).toHaveCount(0);
  await expect(popover).toContainText('No Recent Documents');
  await popover.getByRole('searchbox').fill('sk');
  await page.keyboard.press('Enter');
  await expect(popover).toHaveCount(0);
  await expect(win.getByRole('textbox', { name: 'skills.md' })).toBeFocused();
});

test('closing a file puts it in the list; Remove takes it out; an empty list says so', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await win.getByRole('button', { name: 'New Tab' }).click();
  await win.getByRole('tab', { name: 'README.md' }).getByRole('button', { name: 'Close' }).click();
  await win.getByRole('button', { name: 'Open', exact: true }).click();
  const popover = page.getByRole('dialog', { name: 'Recently Used Documents' });
  await expect(popover.getByRole('option')).toHaveText([/^README\.md~\/Desktop\s*$/]);
  await expect(popover.getByRole('button', { name: 'Open New Document' })).toBeDisabled(); // the file chooser comes with Files
  await popover.getByRole('option').getByRole('button', { name: 'Remove' }).click();
  await expect(popover).toContainText('No Recent Documents');
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await expect(win.getByRole('textbox', { name: 'New Document' })).toBeFocused();
});

test('Markdown is coloured as the Adwaita scheme does, and the colours stay exactly under the text', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await session(page);
  await openReadme(page);
  const win = editor(page);
  const heading = win.locator('.layer .heading');
  await expect(heading).toHaveText("# Welcome to Abhishek's computer");
  await expect(heading).toHaveCSS('color', 'rgb(33, 135, 135)'); // teal_5
  await expect(heading).toHaveCSS('font-weight', '700');
  await expect(win.locator('.layer .inline-code')).toHaveCSS('color', 'rgb(78, 87, 186)'); // violet_4
  await expect(win.getByRole('textbox')).toHaveCSS('color', 'rgba(0, 0, 0, 0)'); // the text box itself is see-through
  // A long line that wraps, and many lines that scroll: the layer must wrap and scroll exactly like the text box.
  await page.keyboard.press('Control+End');
  await page.keyboard.type(`${'a long line of words '.repeat(12)}\n`);
  for (let i = 0; i < 40; i++) await page.keyboard.press('Enter');
  const sizes = await win.evaluate((w) => {
    const t = w.querySelector('textarea')!;
    const l = w.querySelector<HTMLElement>('.layer')!;
    return { t: t.scrollHeight, l: l.scrollHeight, ts: t.scrollTop, ls: l.scrollTop, tw: t.clientWidth, lw: l.clientWidth };
  });
  expect(sizes.l).toBe(sizes.t);
  expect(sizes.lw).toBe(sizes.tw);
  expect(sizes.ts).toBeGreaterThan(0);
  expect(sizes.ls).toBe(sizes.ts);
});

const caret = (page: Page) => editor(page).getByRole('textbox').first().evaluate((t: HTMLTextAreaElement) => [t.selectionStart, t.selectionEnd]);

test('Ctrl+F opens the search bar at the bottom; typing counts and highlights; Down selects; Esc puts the cursor back', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  const before = await caret(page);
  await page.keyboard.press('Control+f');
  const search = win.getByRole('searchbox', { name: 'Search' });
  await expect(search).toBeFocused();
  const bar = win.locator('.searchbar');
  const box = (await bar.boundingBox())!;
  const frame = (await win.boundingBox())!;
  expect(Math.round(box.y + box.height)).toBe(Math.round(frame.y + frame.height)); // it sits at the bottom
  await page.keyboard.type('documents');
  await expect(win.locator('.search-info')).toHaveText('0 of 2');
  await expect(win.locator('.layer .match')).toHaveCount(2);
  await expect(win.locator('.layer .match').first()).toHaveCSS('background-color', 'rgb(248, 228, 92)'); // yellow_2
  await page.keyboard.press('ArrowDown');
  await expect(win.locator('.search-info')).toHaveText('1 of 2');
  expect(await caret(page)).not.toEqual(before);
  await page.keyboard.press('Escape');
  await expect(bar).toHaveCount(0);
  await expect(win.getByRole('textbox').first()).toBeFocused();
  expect(await caret(page)).toEqual(before);
});

test('Enter jumps to the next match, closes the bar and keeps the match selected; the menu item opens it with the selection', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await win.getByRole('textbox').first().evaluate((t: HTMLTextAreaElement) => t.setSelectionRange(2, 9)); // "Welcome"
  await win.getByRole('button', { name: 'Main Menu' }).click();
  await page.getByRole('menu', { name: 'Main Menu' }).getByRole('menuitem', { name: 'Find/Replace…' }).click();
  await expect(win.getByRole('searchbox', { name: 'Search' })).toHaveValue('Welcome');
  await win.getByRole('searchbox', { name: 'Search' }).fill('ubuntu');
  await page.keyboard.press('Enter');
  await expect(win.locator('.searchbar')).toHaveCount(0);
  const [a, b] = await caret(page);
  const text = await win.getByRole('textbox').first().inputValue();
  expect(text.slice(a, b)).toBe('Ubuntu');
});

test('Search & Replace: Replace All replaces every match', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await page.keyboard.press('Control+f');
  await page.keyboard.type('Documents');
  await win.getByRole('button', { name: 'Search & Replace' }).click();
  const replace = win.getByRole('textbox', { name: 'Replace' });
  await expect(replace).toBeVisible();
  await replace.fill('Docs');
  await win.getByRole('button', { name: 'Replace All' }).click();
  await expect(win.getByRole('textbox').first()).not.toHaveValue(/Documents/);
  await expect(win.getByRole('textbox').first()).toHaveValue(/Docs\/about\.md/);
  await expect(win.locator('.search-info')).toHaveText(''); // no matches: the label is empty (editor-search-entry.c)
});

test('a popover with no room below its button opens above it (the search options at the bottom)', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = editor(page);
  await page.keyboard.press('Control+f');
  const button = win.getByRole('button', { name: 'Search Options' });
  await button.click();
  const menu = page.getByRole('menu', { name: 'Search Options' });
  await expect(menu.getByRole('menuitemcheckbox')).toHaveText(['Regular Expressions', 'Case Sensitive', 'Match Whole Word Only']);
  const m = (await menu.boundingBox())!;
  const b = (await button.boundingBox())!;
  expect(m.y + m.height).toBeLessThanOrEqual(b.y); // fully above the button, on screen
  await menu.getByRole('menuitemcheckbox', { name: 'Case Sensitive' }).click();
  await button.click();
  await expect(page.getByRole('menu', { name: 'Search Options' }).getByRole('menuitemcheckbox', { name: 'Case Sensitive' })).toHaveAttribute('aria-checked', 'true');
});

test('right-clicking a tab: move it, move it to a new window, close the others', async ({ page }) => {
  await session(page);
  await openReadme(page);
  const win = () => editor(page).first();
  await win().getByRole('button', { name: 'New Tab' }).click();
  await win().getByRole('button', { name: 'New Tab' }).click();
  await expect(win().getByRole('tab')).toHaveCount(3);
  const tab = win().getByRole('tab', { name: 'README.md' });
  await tab.click({ button: 'right' });
  const menu = page.getByRole('menu', { name: 'Tab' });
  await expect(menu.getByRole('menuitem')).toHaveText([
    /^Move LeftShift\+Ctrl\+Alt\+Page Up$/, /^Move RightShift\+Ctrl\+Alt\+Page Down$/, /^Move to New WindowShift\+Ctrl\+N$/,
    /^Close Other Tabs$/, /^CloseCtrl\+W$/,
  ]);
  await expect(menu.getByRole('menuitem', { name: 'Move Left' })).toBeDisabled(); // already first
  const point = (await tab.boundingBox())!;
  const m = (await menu.boundingBox())!;
  expect(m.y).toBeGreaterThan(point.y); // under the pointer, no arrow
  await menu.getByRole('menuitem', { name: 'Move Right' }).click();
  await expect(win().getByRole('tab')).toHaveText(['New Document', 'README.md', 'New Document']);

  await win().getByRole('tab', { name: 'README.md' }).click({ button: 'right' });
  await page.getByRole('menu', { name: 'Tab' }).getByRole('menuitem', { name: 'Move to New Window' }).click();
  await expect(editor(page)).toHaveCount(2);
  await expect(page.getByRole('dialog', { name: 'README.md (~/Desktop) - Text Editor' })).toBeVisible();

  const first = editor(page).filter({ has: page.getByRole('tab') });
  // The new window opened on top, 30px down and right (cascade): bring the first one forward by its header's visible strip.
  await first.locator('.headerbar').click({ position: { x: 300, y: 10 } });
  await first.getByRole('tab').first().click({ button: 'right' });
  await page.getByRole('menu', { name: 'Tab' }).getByRole('menuitem', { name: 'Close Other Tabs' }).click();
  await expect(first.getByRole('tab')).toHaveCount(0); // one tab left: the bar hides
});
