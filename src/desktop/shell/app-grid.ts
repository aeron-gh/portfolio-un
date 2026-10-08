// The app grid as Ubuntu 26.04 shows it: 10 columns × 3 rows of 64px icons on wide screens (upstream GNOME uses 8),
// app folders, and an order the visitor can change by dragging.
import type { AppEntry, AppId } from '../apps/registry';

export type GridTile = { kind: 'app'; id: AppId } | { kind: 'folder'; id: 'Utilities'; apps: AppId[] };

export const ORDER_KEY = 'ubuntu.app-grid.v1';
type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function gridShape(width: number): { cols: number; rows: number; icon: number } {
  if (width >= 1200) return { cols: 10, rows: 3, icon: 64 };
  if (width >= 900) return { cols: 8, rows: 3, icon: 64 };
  return { cols: 6, rows: 4, icon: 48 };
}

export function tiles(apps: AppEntry[], order: string[]): GridTile[] {
  const out: GridTile[] = apps.filter((a) => !a.folder).map((a) => ({ kind: 'app', id: a.id }));
  const inFolder = apps.filter((a) => a.folder === 'Utilities').map((a) => a.id);
  if (inFolder.length) out.push({ kind: 'folder', id: 'Utilities', apps: inFolder });
  const name = (t: GridTile) => (t.kind === 'app' ? (apps.find((a) => a.id === t.id)?.name ?? t.id) : t.id);
  const rank = (t: GridTile) => {
    const i = order.indexOf(t.id);
    return i < 0 ? Number.POSITIVE_INFINITY : i;
  };
  return out.sort((a, b) => rank(a) - rank(b) || name(a).localeCompare(name(b)));
}

export function pages<T>(items: T[], perPage: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) out.push(items.slice(i, i + perPage));
  return out.length ? out : [[]];
}

export function moveTile(ids: string[], id: string, to: number): string[] {
  const rest = ids.filter((x) => x !== id);
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, id);
  return rest;
}

export function loadOrder(store: Store | null): string[] {
  try {
    const v: unknown = JSON.parse(store?.getItem(ORDER_KEY) ?? '[]');
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v;
  } catch {
    /* corrupt: default order */
  }
  return [];
}

export function saveOrder(store: Store | null, order: string[]): boolean {
  if (!store) return false;
  try {
    store.setItem(ORDER_KEY, JSON.stringify(order));
    return true;
  } catch {
    return false;
  }
}
