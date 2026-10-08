// Shell popup menus (dock, Quick Settings, top bar): the item model, keyboard movement, separator rules.
export type MenuItem =
  | { kind: 'item'; id: string; label: string; disabled?: boolean; ornament?: 'none' | 'check' | 'dot' | 'no-dot' }
  | { kind: 'separator'; label?: string };

export function selectable(item: MenuItem | undefined): boolean {
  return item?.kind === 'item' && !item.disabled;
}

/** The next selectable item after `from` going `dir`, wrapping round; -1 when there is none. */
export function nextIndex(items: MenuItem[], from: number, dir: 1 | -1): number {
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const i = (((from + dir * k) % n) + n) % n;
    if (selectable(items[i])) return i;
  }
  return -1;
}

/** GNOME hides an unlabelled separator at either end or next to another separator; labelled ones always show. */
export function tidySeparators(items: MenuItem[]): MenuItem[] {
  const out: MenuItem[] = [];
  for (const item of items) {
    if (item.kind === 'separator') {
      const prev = out.at(-1);
      if (!item.label && (!prev || prev.kind === 'separator')) continue;
      if (item.label && prev?.kind === 'separator' && !prev.label) out.pop();
    }
    out.push(item);
  }
  while (out.length) {
    const last = out[out.length - 1];
    if (last.kind !== 'separator' || last.label) break;
    out.pop();
  }
  return out;
}
