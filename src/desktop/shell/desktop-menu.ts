// Desktop Icons NG: its right-click menus and how it names new files (desktopManager.js, fileItemMenu.js,
// askRenamePopup.js). Items whose app does not exist yet stay in place, disabled.
import type { Arrange, SortOrder } from './desktop-arrange';

export type GtkItem =
  | { kind: 'item'; id: string; label: string; disabled?: boolean; submenu?: GtkItem[] }
  | { kind: 'check' | 'radio'; id: string; label: string; checked: boolean; disabled?: boolean }
  | { kind: 'separator' };

const sep = { kind: 'separator' } as const;
const off = (id: string, label: string): GtkItem => ({ kind: 'item', id, label, disabled: true });

/** Right-click on empty desktop. New Document is left out (no templates), Undo and Redo until there is one. */
export function backgroundMenu(o: { canPaste: boolean; arrange: Arrange }): GtkItem[] {
  const a = o.arrange;
  const radio = (id: SortOrder, label: string): GtkItem => ({ kind: 'radio', id: `order:${id}`, label, checked: a.order === id });
  return [
    { kind: 'item', id: 'new-folder', label: 'New Folder' },
    sep,
    { kind: 'item', id: 'paste', label: 'Paste', disabled: !o.canPaste },
    sep,
    { kind: 'item', id: 'select-all', label: 'Select All' },
    sep,
    { kind: 'item', id: 'arrange', label: 'Arrange Icons', disabled: a.keepArranged },
    {
      kind: 'item', id: 'arrange-by', label: 'Arrange By...', submenu: [
        { kind: 'check', id: 'keep-arranged', label: 'Keep Arranged...', checked: a.keepArranged },
        { kind: 'check', id: 'keep-stacked', label: 'Keep Stacked by type...', checked: false, disabled: true },
        { kind: 'check', id: 'sort-special', label: 'Sort Home/Drives/Trash...', checked: a.sortSpecial },
        sep,
        radio('NAME', 'Sort by Name'),
        radio('DESCENDINGNAME', 'Sort by Name Descending'),
        radio('MODIFIEDTIME', 'Sort by Modified Time'),
        radio('KIND', 'Sort by Type'),
        radio('SIZE', 'Sort by Size'),
      ],
    },
    sep,
    off('show-in-files', 'Show Desktop in Files'),
    off('terminal', 'Open in Terminal'),
    sep,
    off('background', 'Change Background…'),
    sep,
    off('icons-settings', 'Desktop Icons Settings'),
    off('display-settings', 'Display Settings'),
  ];
}

/** Right-click on icons. `special` = Home is in the selection. */
export function fileMenu(o: { count: number; special: boolean; folders: number; canRename: boolean }): GtkItem[] {
  const many = o.count > 1;
  const items: GtkItem[] = [
    { kind: 'item', id: 'open', label: many ? 'Open All...' : 'Open' },
    off('open-with', many ? 'Open All With Other Application...' : 'Open With Other Application'),
    sep,
    { kind: 'item', id: 'cut', label: 'Cut', disabled: o.special },
    { kind: 'item', id: 'copy', label: 'Copy', disabled: o.special },
  ];
  if (o.canRename && !many) items.push({ kind: 'item', id: 'rename', label: 'Rename…' });
  items.push(sep, { kind: 'item', id: 'trash', label: 'Move to Trash', disabled: o.special });
  if (!o.special) {
    const n = o.count;
    items.push(sep);
    if (o.folders < n) items.push(off('send-to', 'Send to...'));
    items.push(
      off('compress', o.folders === n ? `Compress ${n} folder${n === 1 ? '' : 's'}` : `Compress ${n} file${n === 1 ? '' : 's'}`),
      { kind: 'item', id: 'new-folder-with', label: `New Folder with ${n} item${n === 1 ? '' : 's'}` },
    );
  }
  items.push(sep, off('properties', many ? 'Common Properties' : 'Properties'), sep, off('show-in-files', many ? 'Show All in Files' : 'Show in Files'));
  if (o.folders === 1 && !many) items.push(off('terminal', 'Open in Terminal'));
  return items;
}

/** "New Folder", then "New Folder 1", "New Folder 2" … (getDesktopUniqueFileName). */
export function uniqueName(base: string, taken: (name: string) => boolean): string {
  let name = base;
  for (let i = 1; taken(name); i++) name = `${base} ${i}`;
  return name;
}

/** Where the name stops and the extension starts; folders and dotfiles have none. */
export function extensionAt(name: string, dir: boolean): number {
  const dot = name.lastIndexOf('.');
  return dir || dot <= 0 ? name.length : dot;
}

/** Nautilus: "README (Copy).md", then "README (Copy 2).md"; copying a copy counts on from it. */
export function copyName(name: string, dir: boolean, taken: (name: string) => boolean): string {
  const at = extensionAt(name, dir);
  let base = name.slice(0, at);
  const ext = name.slice(at);
  const m = /^(.*) \(Copy(?: (\d+))?\)$/.exec(base);
  let n = 1;
  if (m) {
    base = m[1];
    n = (m[2] ? Number(m[2]) : 1) + 1;
  }
  const make = (k: number) => `${base} (${k === 1 ? 'Copy' : `Copy ${k}`})${ext}`;
  while (taken(make(n))) n++;
  return make(n);
}

/** askRenamePopup.js _validate: not empty, no "/", changed (unless new), and not taken by another file. */
export function validName(text: string, current: string, taken: (name: string) => boolean, isNew: boolean): boolean {
  if (!text || text.includes('/')) return false;
  if (text === current) return isNew;
  return !taken(text);
}
