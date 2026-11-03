// What the right-click menus hold (nautilus-files-view-context-menus.ui, nautilus-pathbar-context-menu.ui), with the rules
// of update_selection_menu and nautilus_files_view_update_actions_state. Items whose parts are not built yet are off.
import type { ViewMode } from './prefs';

export type Item = { id: string; label: string; disabled?: boolean; submenu?: Item[][] };

export type Picked = {
  count: number;
  folders: number;
  /** The default app of a selection of files: its name even when it is not built yet (then `appReady` is false). */
  app: string | null;
  appReady: boolean;
  images: number;
  canRename: boolean;
  canDelete: boolean;
  canTrash: boolean;
  inTrash: boolean;
  canCreate: boolean;
  canPaste: boolean;
};

export type Place = { canCreate: boolean; canPaste: boolean; inTrash: boolean; trashHasItems: boolean; mode: ViewMode };

const off = (id: string, label: string): Item => ({ id, label, disabled: true });

export function selectionMenu(p: Picked): Item[][] {
  const sections: Item[][] = [];
  if (p.count > 1 && p.canCreate && p.canDelete) sections.push([off('new-folder-with-selection', `New Folder with Selection (${p.count} Items)`)]);

  const onlyFolders = p.folders === p.count;
  if (onlyFolders) {
    sections.push([
      {
        id: 'open-menu',
        label: 'Open',
        submenu: [
          [{ id: 'open', label: 'Open' }, off('open-tab', 'Open in New Tab'), { id: 'open-window', label: 'Open in New Window' }],
          [off('open-with', 'Open With…'), off('terminal', 'Open in Terminal')],
        ],
      },
    ]);
  } else if (!p.folders && p.app) {
    sections.push([{ id: 'open', label: `Open With ${p.app}`, disabled: !p.appReady }, off('open-with', 'Open With…')]);
  }

  sections.push([{ id: 'cut', label: 'Cut', disabled: !p.canDelete }, { id: 'copy', label: 'Copy' }, off('move-to', 'Move to…'), off('copy-to', 'Copy to…')]);

  const actions: Item[] = [{ id: 'rename', label: 'Rename…', disabled: !p.canRename }];
  if (p.count === 1 && p.folders === 1 && p.canPaste) actions.push({ id: 'paste-into', label: 'Paste Into Folder' });
  if (p.canCreate) actions.push(off('compress', 'Compress…'));
  if (p.count === 1 && p.images === 1) actions.push(off('set-as-wallpaper', 'Set as Background…'));
  if (p.canTrash) actions.push({ id: 'trash', label: 'Move to Trash' });
  if (p.inTrash && p.canDelete) actions.push({ id: 'delete', label: 'Delete From Trash…' });
  if (p.inTrash) actions.push({ id: 'restore', label: 'Restore From Trash' });
  sections.push(actions);

  sections.push([off('properties', 'Properties')]);
  return sections;
}

const creating = (p: Place): Item[] => {
  const items = [{ id: 'new-folder', label: 'New Folder…', disabled: !p.canCreate }, off('open-with', 'Open With…')];
  return p.inTrash ? items : [...items, off('terminal', 'Open in Terminal')];
};
const paste = (p: Place): Item => ({ id: 'paste', label: 'Paste', disabled: !p.canPaste || !p.canCreate });
const emptyTrash = (p: Place): Item[][] => (p.inTrash ? [[{ id: 'empty-trash', label: 'Empty Trash…', disabled: !p.trashHasItems }]] : []);

export function backgroundMenu(p: Place): Item[][] {
  return [
    creating(p),
    [paste(p), { id: 'select-all', label: 'Select All' }, off('view-setup', p.mode === 'list' ? 'Visible Columns…' : 'Captions…')],
    ...emptyTrash(p),
    [off('properties', 'Properties')],
  ];
}

export function currentFolderMenu(p: Place): Item[][] {
  return [
    creating(p),
    [{ id: 'reload', label: 'Reload' }, off('bookmark', 'Add to Bookmarks'), off('star', 'Star Folder'), { id: 'copy-location', label: 'Copy Location' }],
    [paste(p), { id: 'select-all', label: 'Select All' }],
    ...emptyTrash(p),
    [off('properties', 'Properties')],
  ];
}

export function sidebarRowMenu(r: { bookmark: boolean; recent: boolean; trash: boolean; trashHasItems: boolean }): Item[][] {
  const sections: Item[][] = [[{ id: 'open', label: 'Open' }, off('open-tab', 'Open in New Tab'), { id: 'open-window', label: 'Open in New Window' }]];
  if (r.bookmark) sections.push([off('remove-bookmark', 'Remove from Bookmarks'), off('rename-bookmark', 'Rename')]);
  if (r.recent) sections.push([off('settings', 'File History Settings…')]);
  if (r.trash) sections.push([off('settings', 'Trash Settings…')], [{ id: 'empty-trash', label: 'Empty Trash…', disabled: !r.trashHasItems }]);
  return sections;
}
