// Desktop settings: the model, safe load/save, and style resolution. Pure (unit-tested).

export type Style = 'system' | 'light' | 'dark';
export type PowerMode = 'balanced' | 'power-saver' | 'performance';

/** Ubuntu 26.04 accents: GNOME's accent names, with the Yaru colours Ubuntu's GNOME Shell uses for them (`light` with
 *  the default colour scheme, `dark` with prefer-dark). */
export const ACCENTS = {
  blue: { light: '#0070de', dark: '#0073e5' },
  teal: { light: '#2e7e7c', dark: '#308280' },
  green: { light: '#488001', dark: '#4b8501' },
  yellow: { light: '#9a6800', dark: '#9f6c00' },
  orange: { light: '#cb4314', dark: '#d34615' },
  red: { light: '#d82b48', dark: '#da3450' },
  pink: { light: '#ae4aae', dark: '#b34cb3' },
  purple: { light: '#7360d7', dark: '#7764d8' },
  slate: { light: '#627766', dark: '#657b69' },
  brown: { light: '#8c6c47', dark: '#92714a' },
} as const;
export type Accent = keyof typeof ACCENTS;

export type Settings = {
  style: Style;
  accent: Accent;
  nightLight: boolean;
  powerMode: PowerMode;
  /** The Power Mode tile switches between Balanced and the last other profile. */
  lastPowerMode: Exclude<PowerMode, 'balanced'>;
  dnd: boolean;
  /** null = follow the visitor's locale */
  clock24: boolean | null;
  volume: number;
  muted: boolean;
  brightness: number;
  wifi: boolean;
  bluetooth: boolean;
  airplane: boolean;
};

export const DEFAULTS: Settings = {
  style: 'system',
  accent: 'orange',
  nightLight: false,
  powerMode: 'balanced',
  lastPowerMode: 'power-saver',
  dnd: false,
  clock24: null,
  volume: 70,
  muted: false,
  brightness: 100,
  wifi: true,
  bluetooth: true,
  airplane: false,
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
  const wifi = typeof r.wifi === 'boolean' ? r.wifi : DEFAULTS.wifi;
  const bluetooth = typeof r.bluetooth === 'boolean' ? r.bluetooth : DEFAULTS.bluetooth;
  return {
    style: r.style === 'light' || r.style === 'dark' || r.style === 'system' ? r.style : DEFAULTS.style,
    accent: typeof r.accent === 'string' && Object.hasOwn(ACCENTS, r.accent) ? (r.accent as Accent) : DEFAULTS.accent,
    nightLight: typeof r.nightLight === 'boolean' ? r.nightLight : DEFAULTS.nightLight,
    powerMode: r.powerMode === 'power-saver' || r.powerMode === 'performance' || r.powerMode === 'balanced' ? r.powerMode : DEFAULTS.powerMode,
    lastPowerMode: r.lastPowerMode === 'performance' ? 'performance' : 'power-saver',
    dnd: typeof r.dnd === 'boolean' ? r.dnd : DEFAULTS.dnd,
    clock24: typeof r.clock24 === 'boolean' ? r.clock24 : null,
    volume: clamp(r.volume, 0, 100, DEFAULTS.volume),
    muted: r.muted === true,
    brightness: clamp(r.brightness, 0, 100, DEFAULTS.brightness),
    wifi,
    bluetooth,
    // Airplane mode means every radio is off; anything else is a damaged save.
    airplane: r.airplane === true && !wifi && !bluetooth,
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
