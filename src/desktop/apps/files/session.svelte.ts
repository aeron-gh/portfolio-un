// What every Files window shares: the settings, and where each window is, so opening a folder from outside can reuse a
// window already showing it (NAUTILUS_OPEN_FLAG_REUSE_EXISTING).
import { safeStorage } from '../../system/settings';
import { focus, launch } from '../../wm/wm.svelte';
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

/** By window id. */
export const locations: Record<string, string> = $state({});

export async function openLocation(path: string): Promise<void> {
  const open = Object.entries(locations).find(([, location]) => location === path);
  if (open) focus(open[0]);
  else await launch('files', { path });
}
