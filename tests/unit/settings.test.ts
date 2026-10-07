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
    const s = loadSettings(memory({ [SETTINGS_KEY]: JSON.stringify({ style: 'neon', accent: 'pink', volume: 400, brightness: -5, clock24: 'yes' }) }));
    expect(s.style).toBe('system');
    expect(s.accent).toBe('orange');
    expect(s.volume).toBe(100);
    expect(s.brightness).toBe(10);
    expect(s.clock24).toBeNull();
  });

  test('saved settings round-trip', () => {
    const m = memory();
    const s = { ...DEFAULTS, style: 'dark' as const, accent: 'viridian' as const, clock24: true };
    expect(saveSettings(m, s)).toBe(true);
    expect(loadSettings(m)).toEqual(s);
  });

  test('a store that throws on write reports failure', () => {
    const broken = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(saveSettings(broken, DEFAULTS)).toBe(false);
  });

  test('the ten Ubuntu accents with their Yaru colours', () => {
    expect(Object.keys(ACCENTS)).toEqual(['orange', 'bark', 'sage', 'olive', 'viridian', 'prussiangreen', 'blue', 'purple', 'magenta', 'red']);
    expect(ACCENTS.orange).toBe('#E95420');
    expect(ACCENTS.red).toBe('#DA3450');
  });

  test('system style follows the visitor', () => {
    expect(resolveStyle('system', true)).toBe('dark');
    expect(resolveStyle('system', false)).toBe('light');
    expect(resolveStyle('light', true)).toBe('light');
  });
});
