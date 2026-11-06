// Files' settings (org.gnome.nautilus.*), as saved: the view, the two zoom levels, hidden files and each folder's sort.
import { DEFAULT_BOOKMARKS, parseBookmarks, type Bookmark } from './bookmarks';
import type { TimeType } from './query';
import type { Sort, SortKey } from './sort';

export type ViewMode = 'grid' | 'list';
/** `recents`: files opened from here, with when (GtkRecentManager). `starred`: paths (NautilusTagManager). */
export type Recent = { path: string; at: string };
export type Prefs = {
  view: ViewMode;
  gridZoom: number;
  listZoom: number;
  hidden: boolean;
  sorts: Record<string, Sort>;
  bookmarks: Bookmark[];
  starred: string[];
  recents: Recent[];
  /** search-filter-time-type, and fts-enabled. */
  searchTime: TimeType;
  searchContent: boolean;
};

/** nautilus-enums.h: the icon size at each zoom level. */
export const GRID_SIZES = [48, 64, 96, 168, 256];
export const LIST_SIZES = [16, 32, 64];
/** zoom_level_standard, what Ctrl+0 goes back to: not Ubuntu's starting size for the grid. */
export const GRID_STANDARD = 2;
export const LIST_STANDARD = 1;

/** The gschema's defaults, with ubuntu-settings' override of icon-view default-zoom-level to small. */
export const DEFAULTS: Prefs = { view: 'grid', gridZoom: 0, listZoom: 1, hidden: false, sorts: {}, bookmarks: DEFAULT_BOOKMARKS, starred: [], recents: [], searchTime: 'last_modified', searchContent: true };

const KEYS: SortKey[] = ['name', 'size', 'type', 'date_modified'];
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
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
    bookmarks: parseBookmarks(v.bookmarks),
    starred: array(v.starred).filter((p): p is string => typeof p === 'string'),
    searchTime: v.searchTime === 'last_used' || v.searchTime === 'created' ? v.searchTime : 'last_modified',
    searchContent: v.searchContent !== false,
    recents: array(v.recents).filter((r): r is Recent => typeof (r as Recent)?.path === 'string' && typeof (r as Recent)?.at === 'string'),
  };
}

export const zoomed = (level: number, by: 1 | -1, sizes: number[]) => Math.max(0, Math.min(sizes.length - 1, level + by));
