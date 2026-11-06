// The sidebar's bookmarks (nautilus-bookmark-list.c, nautilus-bookmark.c).
import { basename, HOME, TRASH } from '../../fs/vfs';
import { isSpecial, type Place } from './places';

export type Bookmark = { path: string; name?: string };

/** xdg-user-dirs-gtk's update.c writes these for a new account, in this order. */
export const DEFAULT_BOOKMARKS: Bookmark[] = ['Documents', 'Music', 'Pictures', 'Videos', 'Downloads'].map((n) => ({ path: `${HOME}/${n}` }));

/** nautilus_special_directory_get_symbolic_icon */
const SPECIAL_ICONS: Record<string, string> = {
  [`${HOME}/Desktop`]: 'user-desktop-symbolic',
  [`${HOME}/Documents`]: 'folder-documents-symbolic',
  [`${HOME}/Downloads`]: 'folder-download-symbolic',
  [`${HOME}/Music`]: 'folder-music-symbolic',
  [`${HOME}/Pictures`]: 'folder-pictures-symbolic',
  [`${HOME}/Public`]: 'folder-publicshare-symbolic',
  [`${HOME}/Templates`]: 'folder-templates-symbolic',
  [`${HOME}/Videos`]: 'folder-videos-symbolic',
};

export function bookmarkPlace({ path, name }: Bookmark): Place {
  return { label: name ?? basename(path), icon: SPECIAL_ICONS[path] ?? 'folder-symbolic', path, tooltip: path };
}

/** What is already in the sidebar cannot be added again. */
export function canBookmark(list: Bookmark[], path: string): boolean {
  return !list.some((b) => b.path === path) && !isSpecial(path) && path !== HOME && path !== TRASH && !path.startsWith(`${TRASH}/`);
}

export const addBookmark = (list: Bookmark[], path: string): Bookmark[] => [...list, { path }];
/** nautilus_bookmark_list_add: at a position; one already in the list stays where it is. */
export const insertBookmark = (list: Bookmark[], path: string, at: number): Bookmark[] =>
  list.some((b) => b.path === path) ? list : [...list.slice(0, at), { path }, ...list.slice(at)];
/** nautilus_bookmark_list_move_item: before what was at `to` before it was taken out; past the end is the end. */
export function moveBookmark(list: Bookmark[], path: string, to: number): Bookmark[] {
  const from = list.findIndex((b) => b.path === path);
  if (from < 0 || from === to) return list;
  const rest = list.filter((_, i) => i !== from);
  const at = to < list.length ? rest.indexOf(list[to]) : rest.length;
  return [...rest.slice(0, at), list[from], ...rest.slice(at)];
}
export const removeBookmark = (list: Bookmark[], path: string): Bookmark[] => list.filter((b) => b.path !== path);

/** A bookmark called what its folder is called has no name of its own. */
export function renameBookmark(list: Bookmark[], path: string, name: string): Bookmark[] {
  return list.map((b) => (b.path !== path ? b : name === basename(path) ? { path } : { path, name }));
}

/** rename_entry_changed: another bookmark already has that name. */
export const nameClash = (list: Bookmark[], path: string, name: string) => list.some((b) => b.path !== path && bookmarkPlace(b).label === name);

export function parseBookmarks(raw: unknown): Bookmark[] {
  if (!Array.isArray(raw)) return DEFAULT_BOOKMARKS;
  return raw.flatMap((b) => {
    if (typeof b?.path !== 'string') return [];
    return [typeof b.name === 'string' ? { path: b.path, name: b.name } : { path: b.path }];
  });
}

/** A path after something moved: itself, or something inside it. */
export const followMove = (path: string, from: string, to: string) => (path === from ? to : path.startsWith(`${from}/`) ? to + path.slice(from.length) : path);
