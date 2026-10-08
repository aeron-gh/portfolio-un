// Alt+Tab, Super+Tab and Alt+`: the popup shows after 150ms (switcherPopup.js POPUP_DELAY_TIMEOUT); releasing the
// modifier picks the selected entry, so a quick press-and-release switches without showing anything.
import { appById, type AppId } from '../apps/registry';
import { openLayer, type Layer } from '../system/layers.svelte';
import { appOrder, firstIndex, groupOrder, step, windowOrder } from '../wm/switcher';
import { appWindows } from '../wm/windows';
import { focus, wm } from '../wm/wm.svelte';
import type { SwitcherItem } from './SwitcherList.svelte';

export type SwitchKind = 'windows' | 'apps' | 'group';

export const switcher: { kind: SwitchKind | null; index: number; visible: boolean; items: SwitcherItem[] } = $state({
  kind: null, index: 0, visible: false, items: [],
});
let timer: ReturnType<typeof setTimeout> | undefined;
let layer: Layer | null = null;

function itemsFor(kind: SwitchKind): SwitcherItem[] {
  if (kind === 'apps') return appOrder(wm).map((a) => ({ id: a, icon: appById(a).icon, label: appById(a).name }));
  const wins = kind === 'group' ? groupOrder(wm) : windowOrder(wm);
  return wins.map((w) => ({ id: w.id, icon: appById(w.app).icon, label: w.title }));
}

export function startSwitch(kind: SwitchKind, back = false): void {
  if (switcher.kind) {
    stepSwitch(back ? -1 : 1);
    return;
  }
  const items = itemsFor(kind);
  if (!items.length) return;
  switcher.kind = kind;
  layer = openLayer(); // already a layer before the popup shows: Esc cancels the switch, nothing else
  switcher.items = items;
  switcher.index = back ? items.length - 1 : firstIndex(items.length);
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (switcher.kind) switcher.visible = true;
  }, 150);
}

export function stepSwitch(dir: 1 | -1): void {
  if (switcher.kind) switcher.index = step(switcher.index, switcher.items.length, dir);
}

export function endSwitch(): void {
  clearTimeout(timer);
  layer?.close();
  layer = null;
  switcher.kind = null;
  switcher.visible = false;
  switcher.items = [];
}

export function commitSwitch(): void {
  const { kind, index } = switcher;
  const item = switcher.items[index];
  endSwitch();
  if (!kind || !item) return;
  if (kind === 'apps') {
    const win = appWindows(wm, item.id as AppId)[0];
    if (win) focus(win.id);
  } else focus(item.id);
}
