// What the right-click menus hold (nautilus-files-view-context-menus.ui, nautilus-pathbar-context-menu.ui), with the rules
// of update_selection_menu and nautilus_files_view_update_actions_state. Items whose parts are not built yet are off.
import type { ViewMode } from './prefs';

export type Item = { id: string; label: string; accel?: string; disabled?: boolean; submenu?: Item[][] };

export type Picked = {
  count: number;
  folders: number;
  /** The default app of a selection of files: its name even when it is not built yet (then `appReady` is false). */
  app: string | null;
  appReady: boolean;
  /** The pages of items from anywhere. */
  where: 'recent' | 'starred' | 'search' | null;
  images: number;
  canRename: boolean;
  canDelete: boolean;
  canTrash: boolean;
  inTrash: boolean;
  canCreate: boolean;
  canPaste: boolean;
};

export type Place = { canCreate: boolean; canPaste: boolean; inTrash: boolean; special: boolean; trashHasItems: boolean; mode: ViewMode };

const off = (id: string, label: string): Item => ({ id, label, disabled: true });

export function selectionMenu(p: Picked): Item[][] {
  const sections: Item[][] = [];
  if (p.count > 1 && p.canCreate && p.canDelete && !p.where) sections.push([off('new-folder-with-selection', `New Folder with Selection (${p.count} Items)`)]);

  const locate: Item[] = p.where && p.count === 1 ? [{ id: 'open-location', label: 'Open Item Location' }] : [];
  const onlyFolders = p.folders === p.count;
  if (onlyFolders) {
    sections.push([
      {
        id: 'open-menu',
        label: 'Open',
        submenu: [
          [{ id: 'open', label: 'Open' }, { id: 'open-tab', label: 'Open in New Tab' }, { id: 'open-window', label: 'Open in New Window' }],
          [off('open-with', 'Open With…'), off('terminal', 'Open in Terminal')],
        ],
      },
      ...locate,
    ]);
  } else if (!p.folders && p.app) {
    sections.push([{ id: 'open', label: `Open With ${p.app}`, disabled: !p.appReady }, off('open-with', 'Open With…'), ...locate]);
  } else if (locate.length) sections.push(locate);

  sections.push([{ id: 'cut', label: 'Cut', disabled: !p.canDelete || p.where === 'recent' || p.where === 'starred' }, { id: 'copy', label: 'Copy' }, off('move-to', 'Move to…'), off('copy-to', 'Copy to…')]);

  const actions: Item[] = [{ id: 'rename', label: 'Rename…', disabled: !p.canRename }];
  if (p.count === 1 && p.folders === 1 && p.canPaste) actions.push({ id: 'paste-into', label: 'Paste Into Folder' });
  if (p.canCreate) actions.push(off('compress', 'Compress…'));
  if (p.count === 1 && p.images === 1) actions.push(off('set-as-wallpaper', 'Set as Background…'));
  if (p.canTrash) actions.push({ id: 'trash', label: 'Move to Trash' });
  if (p.inTrash && p.canDelete) actions.push({ id: 'delete', label: 'Delete From Trash…' });
  if (p.inTrash) actions.push({ id: 'restore', label: 'Restore From Trash' });
  if (p.where === 'recent') actions.push({ id: 'remove-recent', label: 'Remove From Recent' });
  if (p.where === 'starred') actions.push({ id: 'unstar', label: 'Unstar' });
  sections.push(actions);

  sections.push([off('properties', 'Properties')]);
  return sections;
}

const creating = (p: Place): Item[] => {
  const items = [{ id: 'new-folder', label: 'New Folder…', disabled: !p.canCreate }, off('open-with', 'Open With…')];
  return p.inTrash || p.special ? items : [...items, off('terminal', 'Open in Terminal')];
};
const paste = (p: Place): Item => ({ id: 'paste', label: 'Paste', disabled: !p.canPaste || !p.canCreate });
const properties = (p: Place): Item[][] => (p.special ? [] : [[off('properties', 'Properties')]]);
const emptyTrash = (p: Place): Item[][] => (p.inTrash ? [[{ id: 'empty-trash', label: 'Empty Trash…', disabled: !p.trashHasItems }]] : []);

export function backgroundMenu(p: Place): Item[][] {
  return [
    creating(p),
    [paste(p), { id: 'select-all', label: 'Select All' }, off('view-setup', p.mode === 'list' ? 'Visible Columns…' : 'Captions…')],
    ...emptyTrash(p),
    ...properties(p),
  ];
}

/** `bookmark` and `star`: which of each it can offer; a place that can be neither offers nothing. */
export function currentFolderMenu(p: Place & { bookmark: 'add' | 'remove' | null; star: 'star' | 'unstar' | null }): Item[][] {
  const here: Item[] = [{ id: 'reload', label: 'Reload' }];
  if (p.bookmark === 'add') here.push({ id: 'bookmark', label: 'Add to Bookmarks' });
  if (p.bookmark === 'remove') here.push({ id: 'unbookmark', label: 'Remove from Bookmarks' });
  if (p.star === 'star') here.push({ id: 'star-folder', label: 'Star Folder' });
  if (p.star === 'unstar') here.push({ id: 'unstar-folder', label: 'Unstar Folder' });
  here.push({ id: 'copy-location', label: 'Copy Location', disabled: p.special });
  return [creating(p), here, [paste(p), { id: 'select-all', label: 'Select All' }], ...emptyTrash(p), ...properties(p)];
}

export function sidebarRowMenu(r: { bookmark: boolean; recent: boolean; trash: boolean; trashHasItems: boolean }): Item[][] {
  const sections: Item[][] = [[{ id: 'open', label: 'Open' }, { id: 'open-tab', label: 'Open in New Tab' }, { id: 'open-window', label: 'Open in New Window' }]];
  if (r.bookmark) sections.push([{ id: 'remove-bookmark', label: 'Remove from Bookmarks' }, { id: 'rename-bookmark', label: 'Rename' }]);
  if (r.recent) sections.push([off('settings', 'File History Settings…')]);
  if (r.trash) sections.push([off('settings', 'Trash Settings…')], [{ id: 'empty-trash', label: 'Empty Trash…', disabled: !r.trashHasItems }]);
  return sections;
}

/** nautilus-window.blp tab_menu_model, with tab_view_setup_menu_cb's rules. */
export function tabMenu(t: { position: number; count: number; canRestore: boolean }): Item[][] {
  return [
    [{ id: 'new-tab', label: 'New Tab', accel: 'Ctrl+T' }, { id: 'restore-tab', label: 'Restore Closed Tab', accel: 'Shift+Ctrl+T', disabled: !t.canRestore }],
    [
      { id: 'tab-window', label: 'Move Tab to New Window' },
      { id: 'tab-left', label: 'Move Tab Left', accel: 'Shift+Ctrl+Page Up', disabled: t.position <= 0 },
      { id: 'tab-right', label: 'Move Tab Right', accel: 'Shift+Ctrl+Page Down', disabled: t.position >= t.count - 1 },
    ],
    [{ id: 'tab-close', label: 'Close Tab', accel: 'Ctrl+W' }, { id: 'tab-others', label: 'Close Other Tabs' }],
  ];
}

/** nautilus-pathbar-context-menu.ui button-menu */
export function pathButtonMenu(): Item[][] {
  return [[{ id: 'open-window', label: 'Open in New Window' }, { id: 'open-tab', label: 'Open in New Tab' }, off('properties', 'Properties')]];
}
