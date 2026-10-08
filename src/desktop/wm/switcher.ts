// Alt+Tab (windows of this workspace) and Super+Tab (apps of every workspace), most recently used first.
import type { AppId } from '../apps/registry';
import type { Win, Wm } from './windows';

const recentFirst = (wins: Win[]) => [...wins].sort((a, b) => b.z - a.z);

export function windowOrder(wm: Wm): Win[] {
  return recentFirst(wm.wins.filter((w) => w.workspace === wm.workspace));
}

export function appOrder(wm: Wm): AppId[] {
  return [...new Set(recentFirst(wm.wins).map((w) => w.app))];
}

/** Alt+`: the focused app's windows on this workspace. */
export function groupOrder(wm: Wm): Win[] {
  const focused = wm.wins.find((w) => w.id === wm.focused);
  return focused ? windowOrder(wm).filter((w) => w.app === focused.app) : [];
}

/** The first press selects the second entry (the previous window or app), as GNOME does. */
export function firstIndex(len: number): number {
  return len > 1 ? 1 : 0;
}

export function step(i: number, len: number, dir: 1 | -1): number {
  return len === 0 ? 0 : (i + dir + len) % len;
}
