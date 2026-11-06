// The order of a folder's items: nautilus_file_compare_for_sort, with Nautilus's default of folders first.
import { dirname, HOME, TRASH, type FsNode } from '../../fs/vfs';
import { typeLabel } from '../../shell/file-icons';
import { RECENT } from './places';
import type { SnippetPart } from './query';

export type SortKey = 'name' | 'size' | 'type' | 'date_modified' | 'trashed_on' | 'recency' | 'relevance';
export type Sort = { key: SortKey; reversed: boolean };
/** `count`: how many items a folder holds. `at`: when it was last used, in Recent. `where`: the line under its name. In a search, `relevance` and what matched inside (`snippet`). */
export type Entry = { path: string; node: FsNode; count: number; at?: string; where?: string | null; relevance?: number; snippet?: SnippetPart[] };

/** nautilus-toolbar-view-menu.ui */
export const SORTS: { label: string; sort: Sort }[] = [
  { label: 'A-Z', sort: { key: 'name', reversed: false } },
  { label: 'Z-A', sort: { key: 'name', reversed: true } },
  { label: 'Last Modified', sort: { key: 'date_modified', reversed: true } },
  { label: 'First Modified', sort: { key: 'date_modified', reversed: false } },
  { label: 'Size', sort: { key: 'size', reversed: true } },
  { label: 'Type', sort: { key: 'type', reversed: false } },
];

/** The Trash and Recent add their own (hidden-when action-disabled elsewhere). */
export function sortsFor(inTrash: boolean, inRecent = false): { label: string; sort: Sort }[] {
  if (inTrash) return [...SORTS, { label: 'Last Trashed', sort: { key: 'trashed_on', reversed: true } }];
  if (inRecent) return [...SORTS, { label: 'Recency', sort: { key: 'recency', reversed: true } }];
  return SORTS;
}

/** nautilus_file_get_default_sort_type, while searching. */
export const SEARCH_SORT: Sort = { key: 'relevance', reversed: true };

/** nautilus_file_get_default_sort_type */
export function defaultSort(location: string): Sort {
  if (location === `${HOME}/Downloads`) return { key: 'date_modified', reversed: true };
  if (location === TRASH) return { key: 'trashed_on', reversed: true };
  if (location === RECENT) return { key: 'recency', reversed: true };
  return { key: 'name', reversed: false };
}

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
  if (key === 'recency') return Date.parse(a.at ?? a.node.mtime) - Date.parse(b.at ?? b.node.mtime);
  if (key === 'type') return collator.compare(typeLabel(a.node), typeLabel(b.node)) || collator.compare(a.node.mime ?? '', b.node.mime ?? '');
  return 0;
}

/** compare_by_full_path */
const byFullPath = (a: Entry, b: Entry) => collator.compare(dirname(a.path), dirname(b.path)) || byName(a, b);

/** `foldersFirst`: not in search or Recent (update_sort_directories_first). */
export function sortEntries(entries: Entry[], sort: Sort, foldersFirst = true): Entry[] {
  const way = sort.reversed ? -1 : 1;
  // Equal scores read alphabetically whichever way the scores run.
  if (sort.key === 'relevance') return [...entries].sort((a, b) => way * ((a.relevance ?? 0) - (b.relevance ?? 0)) || byFullPath(a, b));
  return [...entries].sort((a, b) => {
    if (foldersFirst && isDir(a) !== isDir(b)) return isDir(a) ? -1 : 1; // respected even when reversed
    return way * (byKey(a, b, sort.key) || byName(a, b));
  });
}
