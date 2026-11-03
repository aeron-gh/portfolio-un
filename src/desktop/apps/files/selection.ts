// Which items are selected, as GTK's list and grid views do it (gtk_list_base_grab_focus_on_item, _move_cursor).
// The anchor is where a Shift range starts; the cursor is the item with the keyboard focus.
export type Selection = { selected: string[]; anchor: string | null; cursor: string | null };
export type Mods = { ctrl?: boolean; shift?: boolean };

export const none: Selection = { selected: [], anchor: null, cursor: null };

function range(order: string[], a: string, b: string): string[] {
  const [i, j] = [order.indexOf(a), order.indexOf(b)];
  return order.slice(Math.min(i, j), Math.max(i, j) + 1);
}
const inOrder = (order: string[], items: Set<string>) => order.filter((p) => items.has(p));

function extend(order: string[], sel: Selection, path: string, keep: boolean): Selection {
  const r = range(order, sel.anchor!, path);
  return { selected: keep ? inOrder(order, new Set([...sel.selected, ...r])) : r, anchor: sel.anchor, cursor: path };
}

export function clickItem(order: string[], sel: Selection, path: string, { ctrl, shift }: Mods): Selection {
  if (shift && sel.anchor && order.includes(sel.anchor)) return extend(order, sel, path, !!ctrl);
  if (!ctrl) return { selected: [path], anchor: path, cursor: path };
  const on = sel.selected.includes(path);
  return { selected: on ? sel.selected.filter((p) => p !== path) : inOrder(order, new Set([...sel.selected, path])), anchor: path, cursor: path };
}

export function moveCursor(order: string[], sel: Selection, path: string, { ctrl, shift }: Mods): Selection {
  if (shift && sel.anchor && order.includes(sel.anchor)) return extend(order, sel, path, false);
  return ctrl ? { ...sel, cursor: path } : { selected: [path], anchor: path, cursor: path };
}

/** Where a key lands. `cols` is 1 in a list; `page` is how many rows fit on screen. Null: the key does not move. */
export function targetIndex(from: number, key: string, cols: number, len: number, page: number): number | null {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(key)) return null;
  if (key === 'End') return len - 1;
  if (from < 0 || key === 'Home') return 0;
  const last = len - 1;
  const down = (by: number) => {
    const to = from + by;
    if (to <= last) return to;
    return Math.floor(last / cols) > Math.floor(from / cols) ? last : from; // a shorter last row: its final item
  };
  const up = (by: number) => (from - by >= 0 ? from - by : from);
  switch (key) {
    case 'ArrowLeft': return Math.max(0, from - 1);
    case 'ArrowRight': return Math.min(last, from + 1);
    case 'ArrowUp': return up(cols);
    case 'ArrowDown': return down(cols);
    case 'PageUp': return up(cols * page);
    default: return down(cols * page);
  }
}

export const selectAll = (order: string[]): Selection => ({ selected: [...order], anchor: order[0] ?? null, cursor: order.at(-1) ?? null });

export function invert(order: string[], sel: Selection): Selection {
  return { ...sel, selected: order.filter((p) => !sel.selected.includes(p)) };
}
