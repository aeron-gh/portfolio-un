// Desktop settings: the model, safe load/save, and style resolution. Pure (unit-tested).

export type Style = 'system' | 'light' | 'dark';
export type PowerMode = 'balanced' | 'power-saver' | 'performance';

/** Ubuntu's ten accent colours (Yaru common/accent-colors.scss.in). */
export const ACCENTS = {
  orange: '#E95420',
  bark: '#787859',
  sage: '#657B69',
  olive: '#4B8501',
  viridian: '#03875B',
  prussiangreen: '#308280',
  blue: '#0073E5',
  purple: '#7764D8',
  magenta: '#B34CB3',
  red: '#DA3450',
} as const;
export type Accent = keyof typeof ACCENTS;

export type Settings = {
  style: Style;
  accent: Accent;
  nightLight: boolean;
  powerMode: PowerMode;
  dnd: boolean;
  /** null = follow the visitor's locale */
  clock24: boolean | null;
  volume: number;
  brightness: number;
};

export const DEFAULTS: Settings = {
  style: 'system',
  accent: 'orange',
  nightLight: false,
  powerMode: 'balanced',
  dnd: false,
  clock24: null,
  volume: 70,
  brightness: 100,
};

export const SETTINGS_KEY = 'ubuntu.settings.v1';
export type StoreLike = Pick<Storage, 'getItem' | 'setItem'>;

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
}

export function loadSettings(store: StoreLike | null): Settings {
  let raw: unknown = null;
  try {
    raw = JSON.parse(store?.getItem(SETTINGS_KEY) ?? 'null');
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  const r = raw as Record<string, unknown>;
  return {
    style: r.style === 'light' || r.style === 'dark' || r.style === 'system' ? r.style : DEFAULTS.style,
    accent: typeof r.accent === 'string' && r.accent in ACCENTS ? (r.accent as Accent) : DEFAULTS.accent,
    nightLight: typeof r.nightLight === 'boolean' ? r.nightLight : DEFAULTS.nightLight,
    powerMode: r.powerMode === 'power-saver' || r.powerMode === 'performance' || r.powerMode === 'balanced' ? r.powerMode : DEFAULTS.powerMode,
    dnd: typeof r.dnd === 'boolean' ? r.dnd : DEFAULTS.dnd,
    clock24: typeof r.clock24 === 'boolean' ? r.clock24 : null,
    volume: clamp(r.volume, 0, 100, DEFAULTS.volume),
    brightness: clamp(r.brightness, 10, 100, DEFAULTS.brightness),
  };
}

export function saveSettings(store: StoreLike | null, s: Settings): boolean {
  if (!store) return false;
  try {
    store.setItem(SETTINGS_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function resolveStyle(style: Style, prefersDark: boolean): 'light' | 'dark' {
  if (style === 'system') return prefersDark ? 'dark' : 'light';
  return style;
}

/** localStorage, or null when the browser blocks it. */
export function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    s.getItem(SETTINGS_KEY);
    return s;
  } catch {
    return null;
  }
}
