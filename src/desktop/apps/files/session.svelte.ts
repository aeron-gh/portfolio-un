// What every Files window shares: the settings, and where each window is, so opening a folder from outside can reuse a
// window already showing it (NAUTILUS_OPEN_FLAG_REUSE_EXISTING).
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

/** By window id: where each of its tabs is, and how to bring one to the front. */
export const locations: Record<string, string[]> = $state({});
export const showTab: Record<string, (path: string) => void> = {};

/** get_window_with_location: the window in front first. */
export async function openLocation(path: string): Promise<void> {
  const open = Object.entries(locations)
    .filter(([, places]) => places.includes(path))
    .sort(([a], [b]) => Number(b === wm.focused) - Number(a === wm.focused))[0];
  if (open) {
    focus(open[0]);
    showTab[open[0]]?.(path);
  } else await launch('files', { path });
}
