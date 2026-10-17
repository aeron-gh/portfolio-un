// Text Editor's recently used documents: how the Open popover matches and ranks them (editor-sidebar-item.c,
// editor-search-model.c, GtkSourceView's gtk_source_completion_fuzzy_match), and the saved list itself.

export type Recent = { path: string; age: number };

/** Every letter of `needle` must appear in order; each skipped letter costs 2, each letter left at the end costs 1. */
export function fuzzy(haystack: string, needle: string): number | null {
  if (!haystack) return null;
  let rest = haystack;
  let cost = 0;
  for (const ch of needle) {
    const up = ch.toUpperCase();
    const down = rest.indexOf(ch);
    const upper = rest.indexOf(up);
    const at = down < 0 ? upper : upper < 0 ? down : Math.min(down, upper);
    if (at < 0) return null;
    cost += at * 2;
    if (rest[0] === up && up !== ch) cost += 1; // matched by upper case: a little worse
    rest = rest.slice(at + 1);
  }
  return cost + rest.length;
}

/** The best score over the name and the folder: a prefix is 0, any other part 1, a fuzzy match its cost + 2. */
export function score(title: string, subtitle: string, query: string): number | null {
  const q = query.toLowerCase();
  let best: number | null = null;
  for (const keyword of [title.toLowerCase(), subtitle.toLowerCase()]) {
    if (keyword.startsWith(q)) return 0;
    if (keyword.includes(q)) return 1;
    const f = fuzzy(keyword, q);
    if (f !== null && (best === null || f + 2 < best)) best = f + 2;
  }
  return best;
}

/** The items that match, best first; among equals the newest stays first. An empty query keeps them all. */
export function rank<T extends { title: string; subtitle: string }>(items: T[], query: string): T[] {
  if (!query) return items;
  return items
    .map((item, i) => ({ item, i, s: score(item.title, item.subtitle, query) }))
    .filter((x): x is { item: T; i: number; s: number } => x.s !== null)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.item);
}

const MAX = 100;

/** A file was used: it goes first, with a new age, once. */
export function touch(list: Recent[], path: string, now: number): Recent[] {
  return [{ path, age: now }, ...list.filter((r) => r.path !== path)].slice(0, MAX);
}

export function forget(list: Recent[], path: string): Recent[] {
  return list.filter((r) => r.path !== path);
}

/** Saved data is checked entry by entry; anything that is not an absolute path with a numeric age is dropped. */
export function parseRecents(raw: unknown): Recent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Recent => !!r && typeof r === 'object' && typeof (r as Recent).path === 'string' && (r as Recent).path.startsWith('/') && Number.isFinite((r as Recent).age))
    .map((r) => ({ path: r.path, age: r.age }))
    .slice(0, MAX);
}
