import { describe, expect, test } from 'bun:test';
import { backgroundMenu, currentFolderMenu, pathButtonMenu, selectionMenu, sidebarRowMenu, tabMenu, type Picked } from '../../src/desktop/apps/files/menus';

const labels = (sections: { label: string }[][]) => sections.map((s) => s.map((i) => i.label));
const ids = (sections: { id: string }[][]) => sections.flat().map((i) => i.id);
const base: Picked = { count: 1, folders: 0, app: null, appReady: true, where: null, images: 0, canRename: true, canDelete: true, canTrash: true, inTrash: false, canCreate: true, canPaste: false };
const file: Picked = { ...base, app: 'Text Editor' };
const folder: Picked = { ...base, folders: 1 };

describe('a search result', () => {
  const result: Picked = { ...file, where: 'search' };
  test('offers its folder, and can be cut, renamed and trashed like any other', () => {
    expect(labels(selectionMenu(result))).toEqual([
      ['Open With Text Editor', 'Open With…', 'Open Item Location'],
      ['Cut', 'Copy', 'Move to…', 'Copy to…'],
      ['Rename…', 'Compress…', 'Move to Trash'],
      ['Properties'],
    ]);
    expect(selectionMenu(result).flat().find((i) => i.id === 'cut')?.disabled).toBeFalsy();
  });
  test('more than one has no single folder to offer', () => {
    expect(ids(selectionMenu({ ...result, count: 2 }))).not.toContain('open-location');
  });
  test('the background of results: a search folder is not editable', () => {
    const place = { canCreate: false, canPaste: true, inTrash: false, special: true, trashHasItems: false, mode: 'list' as const };
    const items = backgroundMenu(place).flat();
    expect(items.find((i) => i.id === 'new-folder')?.disabled).toBe(true);
    expect(items.find((i) => i.id === 'paste')?.disabled).toBe(true);
    expect(ids(backgroundMenu(place))).not.toContain('folder-properties');
    expect(ids(backgroundMenu({ ...place, special: false, inTrash: true }))).not.toContain('folder-properties');
    expect(ids(backgroundMenu({ ...place, special: false }))).toContain('folder-properties');
    expect(ids(backgroundMenu(place))).not.toContain('terminal');
  });
});

describe('the selection menu (update_selection_menu, nautilus_files_view_update_actions_state)', () => {
  test('a file: Open With its app, then Open With…; no Open submenu', () => {
    expect(labels(selectionMenu(file))).toEqual([
      ['Open With Text Editor', 'Open With…'],
      ['Cut', 'Copy', 'Move to…', 'Copy to…'],
      ['Rename…', 'Compress…', 'Move to Trash'],
      ['Properties'],
    ]);
  });
  test('a folder: the Open submenu, in its real sections', () => {
    const menu = selectionMenu(folder);
    expect(labels(menu)).toEqual([
      ['Open'],
      ['Cut', 'Copy', 'Move to…', 'Copy to…'],
      ['Rename…', 'Compress…', 'Move to Trash'],
      ['Properties'],
    ]);
    expect(labels(menu[0][0].submenu!)).toEqual([['Open', 'Open in New Tab', 'Open in New Window'], ['Open With…', 'Open in Terminal']]);
  });
  test('a file with no app: neither Open With line (the code removes both)', () => {
    expect(labels(selectionMenu(base))[0]).toEqual(['Cut', 'Copy', 'Move to…', 'Copy to…']);
  });
  test('an app that is not built yet still has its real name, and is off', () => {
    const item = selectionMenu({ ...file, app: 'Image Viewer', appReady: false })[0][0];
    expect(item.label).toBe('Open With Image Viewer');
    expect(item.disabled).toBe(true);
  });
  test('several items: New Folder with Selection comes first, and Rename stays but is off', () => {
    const menu = selectionMenu({ ...file, count: 3, canRename: false });
    expect(menu[0].map((i) => i.label)).toEqual(['New Folder with Selection (3 Items)']);
    expect(menu.flat().find((i) => i.id === 'rename')?.disabled).toBe(true);
  });
  test('Paste Into Folder: one folder, and only with something to paste', () => {
    expect(ids(selectionMenu(folder))).not.toContain('paste-into');
    expect(ids(selectionMenu({ ...folder, canPaste: true }))).toContain('paste-into');
    expect(ids(selectionMenu({ ...folder, count: 2, canPaste: true }))).not.toContain('paste-into');
    expect(ids(selectionMenu({ ...file, canPaste: true }))).not.toContain('paste-into');
  });
  test('an image gets Set as Background…', () => {
    expect(ids(selectionMenu({ ...file, images: 1 }))).toContain('set-as-wallpaper');
    expect(ids(selectionMenu({ ...file, count: 2, images: 2 }))).not.toContain('set-as-wallpaper');
  });
  test('what cannot be changed: no Trash, Cut and Rename off, Copy still on', () => {
    const items = selectionMenu({ ...file, canRename: false, canDelete: false, canTrash: false }).flat();
    expect(items.map((i) => i.id)).not.toContain('trash');
    expect(items.find((i) => i.id === 'cut')?.disabled).toBe(true);
    expect(items.find((i) => i.id === 'rename')?.disabled).toBe(true);
    expect(items.find((i) => i.id === 'copy')?.disabled).toBeFalsy();
  });
  test('in the Trash: Delete and Restore replace Move to Trash; nothing can be created', () => {
    const inTrash: Picked = { ...file, inTrash: true, canRename: false, canTrash: false, canCreate: false };
    const list = ids(selectionMenu(inTrash));
    expect(list).toEqual(expect.arrayContaining(['delete', 'restore']));
    expect(list).not.toContain('trash');
    expect(list).not.toContain('compress');
    const sections = labels(selectionMenu(inTrash));
    expect(sections.flat()).toEqual(expect.arrayContaining(['Delete From Trash…', 'Restore From Trash']));
  });
  test('one item in the Trash that is a folder still opens', () => {
    expect(selectionMenu({ ...folder, inTrash: true, canRename: false, canTrash: false, canCreate: false })[0][0].label).toBe('Open');
  });
  test('a folder and a file together: nothing to open with', () => {
    expect(labels(selectionMenu({ ...base, count: 2, folders: 1 })).flat()).not.toContain('Open');
    expect(labels(selectionMenu({ ...base, count: 2, folders: 1 })).flat()).not.toContain('Open With…');
  });
  test('what is not built yet is shown but off', () => {
    const items = selectionMenu(folder).flat();
    for (const id of ['move-to', 'copy-to', 'compress']) expect(items.find((i) => i.id === id)?.disabled).toBe(true);
    expect(items.find((i) => i.id === 'properties')?.disabled).toBeFalsy();
    const sub = selectionMenu(folder)[0][0].submenu!.flat();
    for (const id of ['open-with', 'terminal']) expect(sub.find((i) => i.id === id)?.disabled).toBe(true);
    for (const id of ['open-tab', 'open-window']) expect(sub.find((i) => i.id === id)?.disabled).toBeFalsy();
  });
});

describe('the background menu', () => {
  const ctx = { canCreate: true, canPaste: false, inTrash: false, special: false, trashHasItems: false, mode: 'grid' as const };
  test('a normal folder', () => {
    expect(labels(backgroundMenu(ctx))).toEqual([
      ['New Folder…', 'Open With…', 'Open in Terminal'],
      ['Paste', 'Select All', 'Captions…'],
      ['Properties'],
    ]);
  });
  test('the list has Visible Columns… in place of Captions…', () => {
    expect(labels(backgroundMenu({ ...ctx, mode: 'list' }))[1]).toEqual(['Paste', 'Select All', 'Visible Columns…']);
  });
  test('Paste needs something to paste, and somewhere that can take it', () => {
    const paste = (o: object) => backgroundMenu({ ...ctx, ...o }).flat().find((i) => i.id === 'paste')!;
    expect(paste({}).disabled).toBe(true);
    expect(paste({ canPaste: true }).disabled).toBeFalsy();
    expect(paste({ canPaste: true, canCreate: false }).disabled).toBe(true);
  });
  test('a folder that cannot be written: New Folder is off', () => {
    expect(backgroundMenu({ ...ctx, canCreate: false }).flat().find((i) => i.id === 'new-folder')?.disabled).toBe(true);
  });
  test('Recent and Starred: no terminal and no properties', () => {
    expect(labels(backgroundMenu({ ...ctx, canCreate: false, special: true }))).toEqual([
      ['New Folder…', 'Open With…'],
      ['Paste', 'Select All', 'Captions…'],
    ]);
  });
  test('the Trash has Empty Trash…, on only when it holds something', () => {
    const empty = backgroundMenu({ ...ctx, canCreate: false, inTrash: true }).flat().find((i) => i.id === 'empty-trash')!;
    expect(empty.label).toBe('Empty Trash…');
    expect(empty.disabled).toBe(true);
    expect(backgroundMenu({ ...ctx, canCreate: false, inTrash: true, trashHasItems: true }).flat().find((i) => i.id === 'empty-trash')?.disabled).toBeFalsy();
    expect(ids(backgroundMenu(ctx))).not.toContain('empty-trash');
  });
});

describe('the path bar\'s menu (nautilus-pathbar-context-menu.ui, current-view-menu)', () => {
  const ctx = { canCreate: true, canPaste: false, inTrash: false, special: false, trashHasItems: false, mode: 'grid' as const, bookmark: 'add' as const, star: 'star' as const };
  test('a folder that is neither bookmarked nor starred', () => {
    expect(labels(currentFolderMenu(ctx))).toEqual([
      ['New Folder…', 'Open With…', 'Open in Terminal'],
      ['Reload', 'Add to Bookmarks', 'Star Folder', 'Copy Location'],
      ['Paste', 'Select All'],
      ['Properties'],
    ]);
  });
  test('it offers the opposite when it is', () => {
    expect(labels(currentFolderMenu({ ...ctx, bookmark: 'remove', star: 'unstar' }))[1]).toEqual(['Reload', 'Remove from Bookmarks', 'Unstar Folder', 'Copy Location']);
  });
  test('Home can be neither, so neither shows', () => {
    expect(labels(currentFolderMenu({ ...ctx, bookmark: null, star: null }))[1]).toEqual(['Reload', 'Copy Location']);
  });
  test('Copy Location is off in the places that are not folders', () => {
    expect(currentFolderMenu({ ...ctx, special: true, bookmark: null, star: null }).flat().find((i) => i.id === 'copy-location')?.disabled).toBe(true);
  });
});

describe('the selection menu in Recent and Starred', () => {
  const recent: Picked = { ...file, where: 'recent', canCreate: false, canRename: false, canTrash: false };
  const starred: Picked = { ...file, where: 'starred', canCreate: false };
  test('Recent: where it is, and Remove From Recent in place of Move to Trash', () => {
    expect(labels(selectionMenu(recent))).toEqual([
      ['Open With Text Editor', 'Open With…', 'Open Item Location'],
      ['Cut', 'Copy', 'Move to…', 'Copy to…'],
      ['Rename…', 'Remove From Recent'],
      ['Properties'],
    ]);
    expect(selectionMenu(recent).flat().find((i) => i.id === 'cut')?.disabled).toBe(true);
  });
  test('Starred: Unstar as well as Move to Trash', () => {
    expect(labels(selectionMenu(starred))[2]).toEqual(['Rename…', 'Move to Trash', 'Unstar']);
    expect(selectionMenu(starred).flat().find((i) => i.id === 'cut')?.disabled).toBe(true);
  });
  test('Open Item Location needs exactly one', () => {
    expect(ids(selectionMenu({ ...recent, count: 2 }))).not.toContain('open-location');
  });
  test('no New Folder with Selection there', () => {
    expect(ids(selectionMenu({ ...starred, count: 2, canCreate: true }))).not.toContain('new-folder-with-selection');
  });
});

test('a sidebar row\'s menu (nautilus-sidebar.c)', () => {
  const row = (o: object) => labels(sidebarRowMenu({ bookmark: false, recent: false, trash: false, trashHasItems: false, properties: false, ...o }));
  const open = ['Open', 'Open in New Tab', 'Open in New Window'];
  expect(row({})).toEqual([open]);
  expect(row({ bookmark: true })).toEqual([open, ['Remove from Bookmarks', 'Rename']]);
  expect(row({ recent: true })).toEqual([open, ['File History Settings…']]);
  expect(row({ trash: true })).toEqual([open, ['Trash Settings…'], ['Empty Trash…']]);
  expect(row({ bookmark: true, properties: true })).toEqual([open, ['Remove from Bookmarks', 'Rename'], ['Properties']]);
  const empty = (o: object) => sidebarRowMenu({ bookmark: false, recent: false, trash: true, trashHasItems: false, properties: false, ...o }).flat().find((i) => i.id === 'empty-trash')!;
  expect(empty({}).disabled).toBe(true);
  expect(empty({ trashHasItems: true }).disabled).toBeFalsy();
});

test('a tab\'s menu (nautilus-window.blp tab_menu_model)', () => {
  const ctx = { position: 1, count: 3, canRestore: false };
  expect(labels(tabMenu(ctx))).toEqual([
    ['New Tab', 'Restore Closed Tab'],
    ['Move Tab to New Window', 'Move Tab Left', 'Move Tab Right'],
    ['Close Tab', 'Close Other Tabs'],
  ]);
  const off = (c: typeof ctx, id: string) => tabMenu(c).flat().find((i) => i.id === id)?.disabled;
  expect(off(ctx, 'restore-tab')).toBe(true);
  expect(off({ ...ctx, canRestore: true }, 'restore-tab')).toBe(false);
  expect(off({ ...ctx, position: 0 }, 'tab-left')).toBe(true);
  expect(off({ ...ctx, position: 2 }, 'tab-right')).toBe(true);
  expect(off(ctx, 'tab-left')).toBe(false);
  expect(off(ctx, 'tab-right')).toBe(false);
});

test('a path bar button\'s menu (nautilus-pathbar-context-menu.ui button-menu)', () => {
  expect(labels(pathButtonMenu())).toEqual([['Open in New Window', 'Open in New Tab', 'Properties']]);
});
