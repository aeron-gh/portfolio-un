import { describe, expect, test } from 'bun:test';
import { ACCENTS, DEFAULTS, SETTINGS_KEY, loadSettings, resolveStyle, saveSettings } from '../../src/desktop/system/settings';

const memory = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; }, data };
};

describe('settings', () => {
  test('defaults: follow the system style, orange accent', () => {
    expect(loadSettings(memory())).toEqual(DEFAULTS);
    expect(DEFAULTS.style).toBe('system');
    expect(DEFAULTS.accent).toBe('orange');
  });

  test('works with no storage at all', () => {
    expect(loadSettings(null)).toEqual(DEFAULTS);
    expect(saveSettings(null, DEFAULTS)).toBe(false);
  });

  test('corrupt JSON falls back to defaults', () => {
    expect(loadSettings(memory({ [SETTINGS_KEY]: '{oops' }))).toEqual(DEFAULTS);
  });

  test('unknown values are replaced, numbers are clamped', () => {
    const s = loadSettings(memory({ [SETTINGS_KEY]: JSON.stringify({ style: 'neon', accent: 'viridian', volume: 400, brightness: -5, clock24: 'yes' }) }));
    expect(s.style).toBe('system');
    expect(s.accent).toBe('orange');
    expect(s.volume).toBe(100);
    expect(s.brightness).toBe(0);
    expect(s.clock24).toBeNull();
  });

  test('saved settings round-trip', () => {
    const m = memory();
    const s = { ...DEFAULTS, style: 'dark' as const, accent: 'teal' as const, clock24: true, wifi: false, muted: true, lastPowerMode: 'performance' as const };
    expect(saveSettings(m, s)).toBe(true);
    expect(loadSettings(m)).toEqual(s);
  });

  test('a store that throws on write reports failure', () => {
    const broken = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(saveSettings(broken, DEFAULTS)).toBe(false);
  });

  test('the 26.04 accents: GNOME names, Yaru shell colours for light and dark', () => {
    expect(Object.keys(ACCENTS)).toEqual(['blue', 'teal', 'green', 'yellow', 'orange', 'red', 'pink', 'purple', 'slate', 'brown']);
    expect(ACCENTS.orange).toEqual({ light: '#cb4314', dark: '#d34615' });
    expect(ACCENTS.teal.dark).toBe('#308280');
  });

  test('radios: on by default; a damaged airplane flag with a radio on is dropped', () => {
    expect([DEFAULTS.wifi, DEFAULTS.bluetooth, DEFAULTS.airplane, DEFAULTS.muted]).toEqual([true, true, false, false]);
    const s = loadSettings(memory({ [SETTINGS_KEY]: JSON.stringify({ airplane: true, wifi: true, bluetooth: false, muted: 'no', lastPowerMode: 'balanced' }) }));
    expect(s.airplane).toBe(false);
    expect(s.wifi).toBe(true);
    expect(s.muted).toBe(false);
    expect(s.lastPowerMode).toBe('power-saver');
    expect(loadSettings(memory({ [SETTINGS_KEY]: JSON.stringify({ airplane: true, wifi: false, bluetooth: false }) })).airplane).toBe(true);
  });

  test('system style follows the visitor', () => {
    expect(resolveStyle('system', true)).toBe('dark');
    expect(resolveStyle('system', false)).toBe('light');
    expect(resolveStyle('light', true)).toBe('light');
  });
});
