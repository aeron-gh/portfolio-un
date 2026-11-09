// What every Files window shares: the settings, and where each window is, so opening a folder from outside can reuse a
// window already showing it (NAUTILUS_OPEN_FLAG_REUSE_EXISTING).
import { dirname, HOME, TRASH } from '../../fs/vfs';
import { safeStorage } from '../../system/settings';
import { focus, launch, wm } from '../../wm/wm.svelte';
import { parsePrefs, type Prefs } from './prefs';

const KEY = 'ubuntu.files.v1';
const store = safeStorage();

function load(): Prefs {
  try {
    return parsePrefs(JSON.parse(store?.getItem(KEY) ?? 'null'));
  } catch {
    return parsePrefs(null);
  }
}

export const prefs: Prefs = $state(load());

export function savePrefs(): void {
  try {
    store?.setItem(KEY, JSON.stringify($state.snapshot(prefs)));
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
}

/** The starred items, in the form setStarred changes. */
export const starredList = {
  get paths() {
    return prefs.starred;
  },
  set paths(next: string[]) {
    prefs.starred = next;
    savePrefs();
  },
};
/** nautilus_tag_manager_can_star_contents: inside Home, and not in the Trash. */
export const canHoldStars = (path: string) => (path === HOME || path.startsWith(`${HOME}/`)) && path !== TRASH && !path.startsWith(`${TRASH}/`);

/** By window id: where each of its tabs is, and how to bring one to the front. */
export const locations: Record<string, string[]> = $state({});
export const showTab: Record<string, (path: string, select?: string[]) => void> = {};

/** NAUTILUS_OPEN_FLAG_REUSE_EXISTING, get_window_with_location: the window in front first. `select`: what to select. */
export async function openLocation(path: string, select?: string[]): Promise<void> {
  const open = Object.entries(locations)
    .filter(([, places]) => places.includes(path))
    .sort(([a], [b]) => Number(b === wm.focused) - Number(a === wm.focused))[0];
  if (open) {
    focus(open[0]);
    showTab[open[0]]?.(path, select);
  } else await launch('files', { path, select });
}

/** org.freedesktop.FileManager1.ShowItems: each item's folder, with it selected (skeleton_handle_show_items_cb). */
export async function showItems(paths: string[]): Promise<void> {
  for (const path of paths) await openLocation(dirname(path), [path]);
}

/** org.freedesktop.FileManager1.ShowItemProperties: a Properties window of its own (nautilus_properties_present_window). */
export async function showItemProperties(paths: string[]): Promise<void> {
  const { default: view } = await import('./PropertiesWindow.svelte');
  await launch('files', { paths, recent: false }, { view, size: { w: 480, h: 294, minW: 360, minH: 294 }, title: '' });
}
