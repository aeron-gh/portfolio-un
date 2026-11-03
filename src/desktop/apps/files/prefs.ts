// Files' settings (org.gnome.nautilus.*), as saved: the view, the two zoom levels, hidden files and each folder's sort.
import type { Sort, SortKey } from './sort';

export type ViewMode = 'grid' | 'list';
export type Prefs = { view: ViewMode; gridZoom: number; listZoom: number; hidden: boolean; sorts: Record<string, Sort> };

/** nautilus-enums.h: the icon size at each zoom level. */
export const GRID_SIZES = [48, 64, 96, 168, 256];
export const LIST_SIZES = [16, 32, 64];
/** zoom_level_standard, what Ctrl+0 goes back to: not Ubuntu's starting size for the grid. */
export const GRID_STANDARD = 2;
export const LIST_STANDARD = 1;

/** The gschema's defaults, with ubuntu-settings' override of icon-view default-zoom-level to small. */
export const DEFAULTS: Prefs = { view: 'grid', gridZoom: 0, listZoom: 1, hidden: false, sorts: {} };

const KEYS: SortKey[] = ['name', 'size', 'type', 'date_modified'];
const level = (v: unknown, sizes: number[], fallback: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < sizes.length ? (v as number) : fallback);

function parseSorts(v: unknown): Record<string, Sort> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, Sort> = {};
  for (const [path, s] of Object.entries(v)) {
    const sort = s as Partial<Sort> | null;
    if (sort && KEYS.includes(sort.key as SortKey) && typeof sort.reversed === 'boolean') out[path] = { key: sort.key as SortKey, reversed: sort.reversed };
  }
  return out;
}

export function parsePrefs(raw: unknown): Prefs {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Prefs, unknown>>;
  return {
    view: v.view === 'list' ? 'list' : 'grid',
    gridZoom: level(v.gridZoom, GRID_SIZES, DEFAULTS.gridZoom),
    listZoom: level(v.listZoom, LIST_SIZES, DEFAULTS.listZoom),
    hidden: v.hidden === true,
    sorts: parseSorts(v.sorts),
  };
}

export const zoomed = (level: number, by: 1 | -1, sizes: number[]) => Math.max(0, Math.min(sizes.length - 1, level + by));
