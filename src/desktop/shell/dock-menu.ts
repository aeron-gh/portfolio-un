// The dock's app menu, loaded with the popup menu on first right-click (not needed to draw the dock).
import { tidySeparators, type MenuItem } from './menu';

/** ubuntu-dock's app menu: name, open windows, New Window, Pin to Dock / Unpin, Quit. */
export function dockMenu(name: string, pinned: boolean, windows: { id: string; title: string }[]): MenuItem[] {
  const items: MenuItem[] = [{ kind: 'separator', label: name }];
  if (windows.length) {
    items.push({ kind: 'separator', label: 'Open Windows' });
    for (const w of windows) items.push({ kind: 'item', id: `win:${w.id}`, label: w.title });
  }
  items.push({ kind: 'separator' }, { kind: 'item', id: 'new-window', label: 'New Window' }, { kind: 'separator' });
  items.push({ kind: 'separator' }, pinned ? { kind: 'item', id: 'unpin', label: 'Unpin' } : { kind: 'item', id: 'pin', label: 'Pin to Dock' });
  if (windows.length) {
    items.push({ kind: 'separator' }, { kind: 'item', id: 'quit', label: windows.length === 1 ? 'Quit' : `Quit ${windows.length} Windows` });
  }
  return tidySeparators(items);
}
