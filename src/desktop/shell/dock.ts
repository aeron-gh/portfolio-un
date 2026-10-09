// The Ubuntu Dock's rules (ubuntu-dock 26.04 defaults): which items show, what a click does, pins.
// The app menu is in dock-menu.ts, loaded on first right-click.
import { APPS, PINNED_DEFAULT, type AppId } from '../apps/registry';

export type DockItem =
  | { kind: 'app'; app: AppId; pinned: boolean; windows: number; focused: boolean }
  | { kind: 'separator' }
  | { kind: 'trash'; full: boolean };

export type DockInput = {
  pins: AppId[];
  running: AppId[];
  focusedApp: AppId | null;
  windows: (app: AppId) => number;
  available: (app: AppId) => boolean;
  trash: { show: boolean; full: boolean };
};

export function dockItems(i: DockInput): DockItem[] {
  const apps = [...i.pins.filter(i.available), ...i.running.filter((a) => !i.pins.includes(a) && i.available(a))];
  const items: DockItem[] = apps.map((app) => ({ kind: 'app', app, pinned: i.pins.includes(app), windows: i.windows(app), focused: app === i.focusedApp }));
  if (i.trash.show) {
    if (items.length) items.push({ kind: 'separator' });
    items.push({ kind: 'trash', full: i.trash.full });
  }
  return items;
}

export type DockClick = 'launch' | 'focus' | 'spread';

/** click-action 'focus-or-appspread' (appIcons.js): spread only when the app is focused and has 2+ windows. */
export function clickAction(windows: number, focused: boolean): DockClick {
  if (windows === 0) return 'launch';
  return focused && windows > 1 ? 'spread' : 'focus';
}

export const PINS_KEY = 'ubuntu.dock.v1';
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const IDS = new Set<string>(APPS.map((a) => a.id));

export function loadPins(store: Store | null): AppId[] {
  try {
    const v: unknown = JSON.parse(store?.getItem(PINS_KEY) ?? 'null');
    if (Array.isArray(v) && v.every((x) => typeof x === 'string' && IDS.has(x))) return [...new Set(v as AppId[])];
  } catch {
    /* corrupt: defaults */
  }
  return [...PINNED_DEFAULT];
}

export function savePins(store: Store | null, pins: AppId[]): boolean {
  if (!store) return false;
  try {
    store.setItem(PINS_KEY, JSON.stringify([...new Set(pins)]));
    return true;
  } catch {
    return false;
  }
}

export const pinApp = (pins: AppId[], app: AppId): AppId[] => (pins.includes(app) ? pins : [...pins, app]);
export const unpinApp = (pins: AppId[], app: AppId): AppId[] => pins.filter((a) => a !== app);

/** Super+1…9 (dock hot-keys). */
export function hotkeyApp(items: DockItem[], n: number): AppId | null {
  const apps = items.filter((i): i is Extract<DockItem, { kind: 'app' }> => i.kind === 'app');
  return apps[n - 1]?.app ?? null;
}
