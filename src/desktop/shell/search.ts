// Overview search (GNOME 50): app results first, then one section per provider, each at most 5 rows.
import type { AppEntry } from '../apps/registry';

/** search.js: MAX_LIST_SEARCH_RESULTS_ROWS. */
export const MAX_ROWS = 5;

export type Panel = { id: string; name: string; keywords: string[] };
export type FileHit = { path: string; name: string; parent: string };

/** GNOME 50 Settings panels (searchable once the Settings app exists). */
export const SETTINGS_PANELS: Panel[] = [
  { id: 'network', name: 'Network', keywords: ['wifi', 'wi-fi', 'internet', 'ethernet'] },
  { id: 'bluetooth', name: 'Bluetooth', keywords: ['devices'] },
  { id: 'display', name: 'Displays', keywords: ['monitor', 'screen', 'resolution'] },
  { id: 'sound', name: 'Sound', keywords: ['audio', 'volume', 'speaker'] },
  { id: 'power', name: 'Power', keywords: ['battery', 'suspend'] },
  { id: 'multitasking', name: 'Multitasking', keywords: ['workspaces'] },
  { id: 'appearance', name: 'Appearance', keywords: ['dark', 'theme', 'accent', 'background', 'wallpaper'] },
  { id: 'ubuntu', name: 'Ubuntu Desktop', keywords: ['dock', 'icons'] },
  { id: 'apps', name: 'Apps', keywords: ['default'] },
  { id: 'notifications', name: 'Notifications', keywords: ['disturb'] },
  { id: 'search', name: 'Search', keywords: [] },
  { id: 'online-accounts', name: 'Online Accounts', keywords: [] },
  { id: 'sharing', name: 'Sharing', keywords: [] },
  { id: 'wellbeing', name: 'Wellbeing', keywords: ['break'] },
  { id: 'mouse', name: 'Mouse & Touchpad', keywords: ['pointer'] },
  { id: 'keyboard', name: 'Keyboard', keywords: ['shortcuts', 'input'] },
  { id: 'color', name: 'Color Management', keywords: [] },
  { id: 'printers', name: 'Printers', keywords: [] },
  { id: 'accessibility', name: 'Accessibility', keywords: ['a11y'] },
  { id: 'privacy', name: 'Privacy & Security', keywords: ['lock', 'location'] },
  { id: 'system', name: 'System', keywords: ['about', 'date', 'time', 'users', 'region', 'language'] },
];

export function terms(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every term must match: a name prefix counts most, then a word start in the name or keywords, then a substring. */
export function score(name: string, keywords: string[], ts: string[]): number {
  if (!ts.length) return 0;
  const lower = name.toLowerCase();
  const words = [...lower.split(/[\s&-]+/), ...keywords.flatMap((k) => k.toLowerCase().split(/\s+/))];
  let total = 0;
  for (const t of ts) {
    if (lower.startsWith(t)) total += 3;
    else if (words.some((w) => w.startsWith(t))) total += 2;
    else if (lower.includes(t)) total += 1;
    else return 0;
  }
  return total;
}

export function searchApps(apps: AppEntry[], q: string): AppEntry[] {
  const ts = terms(q);
  return apps
    .map((a) => ({ a, s: score(a.name, a.keywords ?? [], ts) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || x.a.name.localeCompare(y.a.name))
    .map((x) => x.a);
}

export function searchPanels(q: string): Panel[] {
  const ts = terms(q);
  return SETTINGS_PANELS.map((p) => ({ p, s: score(p.name, p.keywords, ts) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, MAX_ROWS)
    .map((x) => x.p);
}

export function fileHits(paths: string[]): FileHit[] {
  return paths.slice(0, MAX_ROWS).map((path) => {
    const cut = path.lastIndexOf('/');
    const parent = path.slice(0, cut) || '/';
    return { path, name: path.slice(cut + 1), parent: parent.replace(/^\/home\/ubuntu(?=\/|$)/, '~') };
  });
}
