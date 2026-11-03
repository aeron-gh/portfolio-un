// The order of a folder's items: nautilus_file_compare_for_sort, with Nautilus's default of folders first.
import type { FsNode } from '../../fs/vfs';
import { typeLabel } from '../../shell/file-icons';

export type SortKey = 'name' | 'size' | 'type' | 'date_modified' | 'trashed_on';
export type Sort = { key: SortKey; reversed: boolean };
/** `count`: how many items a folder holds. */
export type Entry = { path: string; node: FsNode; count: number };

/** nautilus-toolbar-view-menu.ui */
export const SORTS: { label: string; sort: Sort }[] = [
  { label: 'A-Z', sort: { key: 'name', reversed: false } },
  { label: 'Z-A', sort: { key: 'name', reversed: true } },
  { label: 'Last Modified', sort: { key: 'date_modified', reversed: true } },
  { label: 'First Modified', sort: { key: 'date_modified', reversed: false } },
  { label: 'Size', sort: { key: 'size', reversed: true } },
  { label: 'Type', sort: { key: 'type', reversed: false } },
];

/** The Trash adds its own (hidden-when action-disabled elsewhere). */
export const sortsFor = (inTrash: boolean) => (inTrash ? [...SORTS, { label: 'Last Trashed', sort: { key: 'trashed_on' as const, reversed: true } }] : SORTS);

const collator = new Intl.Collator('en', { numeric: true });
const isDir = (e: Entry) => e.node.kind === 'dir';

/** g_utf8_collate_key_for_filename gives a dot the lowest key there is; a tab is the lowest the collator knows. */
const key = (name: string) => name.replaceAll('.', '\t');

/** compare_by_display_name: SORT_LAST_CHAR1 and SORT_LAST_CHAR2 keep "." and "#" names after the rest. */
function byName(a: Entry, b: Entry): number {
  const lastA = /^[.#]/.test(a.node.name);
  const lastB = /^[.#]/.test(b.node.name);
  return lastA === lastB ? collator.compare(key(a.node.name), key(b.node.name)) : lastA ? 1 : -1;
}

function byKey(a: Entry, b: Entry, key: SortKey): number {
  if (key === 'size') return isDir(a) ? a.count - b.count : a.node.size - b.node.size;
  if (key === 'date_modified') return Date.parse(a.node.mtime) - Date.parse(b.node.mtime);
  if (key === 'trashed_on') return Date.parse(a.node.trashed ?? a.node.mtime) - Date.parse(b.node.trashed ?? b.node.mtime);
  if (key === 'type') return collator.compare(typeLabel(a.node), typeLabel(b.node)) || collator.compare(a.node.mime ?? '', b.node.mime ?? '');
  return 0;
}

export function sortEntries(entries: Entry[], sort: Sort): Entry[] {
  const way = sort.reversed ? -1 : 1;
  return [...entries].sort((a, b) => {
    if (isDir(a) !== isDir(b)) return isDir(a) ? -1 : 1; // respected even when reversed
    return way * (byKey(a, b, sort.key) || byName(a, b));
  });
}
