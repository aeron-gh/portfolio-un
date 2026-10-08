import { describe, expect, test } from 'bun:test';
import { PINNED_DEFAULT, type AppId } from '../../src/desktop/apps/registry';
import { PINS_KEY, clickAction, dockItems, dockMenu, hotkeyApp, loadPins, pinApp, savePins, unpinApp } from '../../src/desktop/shell/dock';

const memory = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; }, data };
};
const input = (over: Partial<Parameters<typeof dockItems>[0]> = {}) => ({
  pins: [...PINNED_DEFAULT] as AppId[],
  running: [] as AppId[],
  focusedApp: null,
  windows: () => 0,
  available: () => false,
  trash: { show: false, full: false },
  ...over,
});

describe('dock items', () => {
  test('a visitor sees no app tiles while no real app is built', () => {
    expect(dockItems(input())).toEqual([]);
  });

  test('pinned apps first, then running unpinned apps, then the trash after a divider', () => {
    const items = dockItems(input({
      pins: ['test-utility'],
      running: ['test-window', 'test-utility'],
      focusedApp: 'test-window',
      windows: (a) => (a === 'test-window' ? 2 : 0),
      available: () => true,
      trash: { show: true, full: false },
    }));
    expect(items).toEqual([
      { kind: 'app', app: 'test-utility', pinned: true, windows: 0, focused: false },
      { kind: 'app', app: 'test-window', pinned: false, windows: 2, focused: true },
      { kind: 'separator' },
      { kind: 'trash', full: false },
    ]);
  });

  test('focus-or-appspread: launch, focus, or spread', () => {
    expect(clickAction(0, false)).toBe('launch');
    expect(clickAction(1, false)).toBe('focus');
    expect(clickAction(1, true)).toBe('focus');
    expect(clickAction(3, false)).toBe('focus');
    expect(clickAction(2, true)).toBe('spread');
  });

  test('Super+number picks the nth app tile', () => {
    const items = dockItems(input({ pins: ['test-window', 'test-utility'], available: () => true, trash: { show: true, full: true } }));
    expect(hotkeyApp(items, 2)).toBe('test-utility');
    expect(hotkeyApp(items, 3)).toBeNull();
  });
});

describe('pins', () => {
  test('saved pins round-trip, without duplicates', () => {
    const m = memory();
    expect(savePins(m, ['help', 'help', 'files'])).toBe(true);
    expect(loadPins(m)).toEqual(['help', 'files']);
  });

  test('bad saved pins fall back to the defaults', () => {
    expect(loadPins(null)).toEqual(PINNED_DEFAULT);
    expect(loadPins(memory({ [PINS_KEY]: '{oops' }))).toEqual(PINNED_DEFAULT);
    expect(loadPins(memory({ [PINS_KEY]: '["files", "nope"]' }))).toEqual(PINNED_DEFAULT);
    expect(loadPins(memory({ [PINS_KEY]: '"files"' }))).toEqual(PINNED_DEFAULT);
    expect(savePins({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, ['files'])).toBe(false);
  });

  test('pin and unpin', () => {
    expect(pinApp(['files'], 'help')).toEqual(['files', 'help']);
    expect(pinApp(['files'], 'files')).toEqual(['files']);
    expect(unpinApp(['files', 'help'], 'files')).toEqual(['help']);
  });
});

describe('dock right-click menu (ubuntu-dock)', () => {
  test('an app with no windows', () => {
    expect(dockMenu('Test Window', false, [])).toEqual([
      { kind: 'separator', label: 'Test Window' },
      { kind: 'item', id: 'new-window', label: 'New Window' },
      { kind: 'separator' },
      { kind: 'item', id: 'pin', label: 'Pin to Dock' },
    ]);
  });

  test('a pinned app with two windows', () => {
    expect(dockMenu('Test Window', true, [{ id: 'w1', title: 'One' }, { id: 'w2', title: 'Two' }])).toEqual([
      { kind: 'separator', label: 'Test Window' },
      { kind: 'separator', label: 'Open Windows' },
      { kind: 'item', id: 'win:w1', label: 'One' },
      { kind: 'item', id: 'win:w2', label: 'Two' },
      { kind: 'separator' },
      { kind: 'item', id: 'new-window', label: 'New Window' },
      { kind: 'separator' },
      { kind: 'item', id: 'unpin', label: 'Unpin' },
      { kind: 'separator' },
      { kind: 'item', id: 'quit', label: 'Quit 2 Windows' },
    ]);
  });

  test('one window says just Quit', () => {
    expect(dockMenu('Test Window', false, [{ id: 'w1', title: 'One' }]).at(-1)).toEqual({ kind: 'item', id: 'quit', label: 'Quit' });
  });
});
