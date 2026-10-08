import { describe, expect, test } from 'bun:test';
import { SESSION_KEY, loadSession, saveSession } from '../../src/desktop/system/fullscreen';

const memory = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; }, data };
};

describe('session choice (GDM remembers the last one)', () => {
  test('defaults to Ubuntu; remembers full screen', () => {
    const m = memory();
    expect(loadSession(m)).toBe('ubuntu');
    saveSession(m, 'fullscreen');
    expect(loadSession(m)).toBe('fullscreen');
  });

  test('anything odd falls back to Ubuntu, and blocked storage never throws', () => {
    expect(loadSession(memory({ [SESSION_KEY]: 'kde' }))).toBe('ubuntu');
    expect(loadSession(null)).toBe('ubuntu');
    expect(loadSession({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toBe('ubuntu');
    expect(() => saveSession({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, 'fullscreen')).not.toThrow();
  });
});
