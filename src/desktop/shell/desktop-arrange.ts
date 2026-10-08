// Desktop Icons NG: how it arranges icons (desktopManager.js) and the saved arrangement settings.
export type SortOrder = 'NAME' | 'DESCENDINGNAME' | 'MODIFIEDTIME' | 'KIND' | 'SIZE';
export type Arrange = { keepArranged: boolean; keepStacked: boolean; sortSpecial: boolean; order: SortOrder };

/** DING's schema defaults with Ubuntu's override (arrangeorder = DESCENDINGNAME). */
export const ARRANGE_DEFAULTS: Arrange = { keepArranged: false, keepStacked: false, sortSpecial: false, order: 'DESCENDINGNAME' };
export const ARRANGE_KEY = 'ubuntu.desktop-arrange.v1';
const ORDERS: SortOrder[] = ['NAME', 'DESCENDINGNAME', 'MODIFIEDTIME', 'KIND', 'SIZE'];

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function loadArrange(store: Store | null): Arrange {
  try {
    const r = JSON.parse(store?.getItem(ARRANGE_KEY) ?? 'null') as Record<string, unknown> | null;
    if (!r || typeof r !== 'object') return { ...ARRANGE_DEFAULTS };
    const flag = (k: keyof Arrange) => (typeof r[k] === 'boolean' ? (r[k] as boolean) : (ARRANGE_DEFAULTS[k] as boolean));
    return {
      keepArranged: flag('keepArranged'),
      keepStacked: false, // stack icons are not built: the setting stays off
      sortSpecial: flag('sortSpecial'),
      order: ORDERS.includes(r.order as SortOrder) ? (r.order as SortOrder) : ARRANGE_DEFAULTS.order,
    };
  } catch {
    return { ...ARRANGE_DEFAULTS };
  }
}

export function saveArrange(store: Store | null, a: Arrange): void {
  try {
    store?.setItem(ARRANGE_KEY, JSON.stringify(a));
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
}

export type Arrangeable = { path: string; label: string; special: boolean; dir: boolean; launcher: boolean; mime: string; mtime: string; size: number };

const byName = (a: Arrangeable, b: Arrangeable) => a.label.localeCompare(b.label, undefined, { sensitivity: 'accent', numeric: true });

/** The order icons are placed in, as DING sorts them (Home stays put unless sortSpecial; it is placed separately). */
export function arrangeOrder(items: Arrangeable[], order: SortOrder): string[] {
  const list = [...items];
  switch (order) {
    case 'NAME': list.sort(byName); break;
    case 'DESCENDINGNAME': list.sort(byName).reverse(); break;
    case 'MODIFIEDTIME': list.sort((a, b) => a.mtime.localeCompare(b.mtime)); break;
    case 'SIZE': list.sort((a, b) => a.size - b.size); break;
    case 'KIND': {
      const group = (i: Arrangeable) => (i.special ? 0 : i.launcher ? 1 : i.dir ? 2 : 3);
      list.sort((a, b) => group(a) - group(b) || (group(a) === 3 ? a.mime.localeCompare(b.mime) : 0) || byName(a, b));
      break;
    }
  }
  return list.map((i) => i.path);
}
