import { describe, expect, test } from 'bun:test';
import { backgroundMenu, currentFolderMenu, selectionMenu, sidebarRowMenu, type Picked } from '../../src/desktop/apps/files/menus';

const labels = (sections: { label: string }[][]) => sections.map((s) => s.map((i) => i.label));
const ids = (sections: { id: string }[][]) => sections.flat().map((i) => i.id);
const base: Picked = { count: 1, folders: 0, app: null, appReady: true, images: 0, canRename: true, canDelete: true, canTrash: true, inTrash: false, canCreate: true, canPaste: false };
const file: Picked = { ...base, app: 'Text Editor' };
const folder: Picked = { ...base, folders: 1 };

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
    for (const id of ['move-to', 'copy-to', 'compress', 'properties']) expect(items.find((i) => i.id === id)?.disabled).toBe(true);
    const sub = selectionMenu(folder)[0][0].submenu!.flat();
    for (const id of ['open-tab', 'open-with', 'terminal']) expect(sub.find((i) => i.id === id)?.disabled).toBe(true);
    expect(sub.find((i) => i.id === 'open-window')?.disabled).toBeFalsy();
  });
});

describe('the background menu', () => {
  const ctx = { canCreate: true, canPaste: false, inTrash: false, trashHasItems: false, mode: 'grid' as const };
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
  test('the Trash has Empty Trash…, on only when it holds something', () => {
    const empty = backgroundMenu({ ...ctx, canCreate: false, inTrash: true }).flat().find((i) => i.id === 'empty-trash')!;
    expect(empty.label).toBe('Empty Trash…');
    expect(empty.disabled).toBe(true);
    expect(backgroundMenu({ ...ctx, canCreate: false, inTrash: true, trashHasItems: true }).flat().find((i) => i.id === 'empty-trash')?.disabled).toBeFalsy();
    expect(ids(backgroundMenu(ctx))).not.toContain('empty-trash');
  });
});

test('the path bar\'s menu (nautilus-pathbar-context-menu.ui, current-view-menu)', () => {
  const ctx = { canCreate: true, canPaste: false, inTrash: false, trashHasItems: false, mode: 'grid' as const };
  expect(labels(currentFolderMenu(ctx))).toEqual([
    ['New Folder…', 'Open With…', 'Open in Terminal'],
    ['Reload', 'Add to Bookmarks', 'Star Folder', 'Copy Location'],
    ['Paste', 'Select All'],
    ['Properties'],
  ]);
});

test('a sidebar row\'s menu (nautilus-sidebar.c)', () => {
  const row = (o: object) => labels(sidebarRowMenu({ bookmark: false, recent: false, trash: false, trashHasItems: false, ...o }));
  const open = ['Open', 'Open in New Tab', 'Open in New Window'];
  expect(row({})).toEqual([open]);
  expect(row({ bookmark: true })).toEqual([open, ['Remove from Bookmarks', 'Rename']]);
  expect(row({ recent: true })).toEqual([open, ['File History Settings…']]);
  expect(row({ trash: true })).toEqual([open, ['Trash Settings…'], ['Empty Trash…']]);
  const empty = (o: object) => sidebarRowMenu({ bookmark: false, recent: false, trash: true, trashHasItems: false, ...o }).flat().find((i) => i.id === 'empty-trash')!;
  expect(empty({}).disabled).toBe(true);
  expect(empty({ trashHasItems: true }).disabled).toBeFalsy();
});
