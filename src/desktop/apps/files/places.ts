// Where Files can go: the sidebar's rows (nautilus-sidebar.c), the path bar's buttons and the window's title
// (nautilus-pathbar.c). A location is a folder's path, or one of the special places below.
import { basename, dirname, HOME, TRASH } from '../../fs/vfs';

export const RECENT = 'recent:///';
export const STARRED = 'starred:///';
export const NETWORK = 'network-view:///';

export type Place = { label: string; icon: string; path: string; tooltip: string };
export type Segment = { label: string; icon?: string; path: string };

export const LOCATIONS: Place[] = [
  { label: 'Home', icon: 'user-home-symbolic', path: HOME, tooltip: 'Open Personal Folder' },
  { label: 'Recent', icon: 'document-open-recent-symbolic', path: RECENT, tooltip: 'Recent Files' },
  { label: 'Starred', icon: 'starred-symbolic', path: STARRED, tooltip: 'Starred Files' },
  { label: 'Network', icon: 'network-computer-symbolic', path: NETWORK, tooltip: 'Open Network Locations' },
  { label: 'Trash', icon: 'user-trash-symbolic', path: TRASH, tooltip: 'Open Trash' },
];

const ONE_BUTTON: Record<string, Segment> = {
  [RECENT]: { label: 'Recent', icon: 'document-open-recent-symbolic', path: RECENT },
  [STARRED]: { label: 'Starred', icon: 'starred-symbolic', path: STARRED },
  [NETWORK]: { label: 'Network', icon: 'folder-remote-symbolic', path: NETWORK },
};

export const isSpecial = (location: string) => location in ONE_BUTTON;

/** The first button: the walk up from a folder stops at Home or the Trash, or else at the root. */
function firstButton(path: string): Segment | null {
  if (path === HOME) return { label: 'Home', icon: 'user-home-symbolic', path };
  if (path === TRASH) return { label: 'Trash', icon: 'user-trash-symbolic', path };
  if (path === '/') return { label: 'Ubuntu', icon: 'drive-harddisk-symbolic', path }; // g_get_os_info (G_OS_INFO_KEY_NAME)
  return null;
}

export function segments(location: string): Segment[] {
  if (isSpecial(location)) return [ONE_BUTTON[location]];
  const out: Segment[] = [];
  for (let path = location; ; path = dirname(path)) {
    const first = firstButton(path);
    if (first) return [first, ...out];
    out.unshift({ label: basename(path), path });
  }
}

export function titleFor(location: string): string {
  if (isSpecial(location)) return ONE_BUTTON[location].label;
  return firstButton(location)?.label ?? basename(location);
}

/** Arriving at a folder above the one you were in selects the folder you came from (nautilus-window-slot.c). */
export function fromFolder(previous: string, location: string): string | null {
  if (isSpecial(previous) || isSpecial(location)) return null;
  const prefix = location === '/' ? '/' : `${location}/`;
  if (!previous.startsWith(prefix) || previous === location) return null;
  return prefix + previous.slice(prefix.length).split('/')[0];
}

/** get_path_text: where an item is, in the dim line under its name. `base` is the folder a search started from; Recent,
 *  Starred and the Trash count from Home. */
export function pathLine(dir: string, base: string | null): string | null {
  if (base !== null && dir === base) return null;
  if (dir === HOME) return 'Home';
  const from = base ?? HOME;
  return from !== '/' && dir.startsWith(`${from}/`) ? `${dir.slice(from.length + 1)}/` : dir;
}
