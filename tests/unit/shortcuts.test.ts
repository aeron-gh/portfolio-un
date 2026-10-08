import { describe, expect, test } from 'bun:test';
import { actionFor, createOverlayKey } from '../../src/desktop/system/shortcuts';

const key = (code: string, mods: { meta?: boolean; ctrl?: boolean; alt?: boolean; shift?: boolean } = {}) => ({
  code, metaKey: !!mods.meta, ctrlKey: !!mods.ctrl, altKey: !!mods.alt, shiftKey: !!mods.shift,
});

describe('Ubuntu 26.04 shortcuts', () => {
  test('Shell keys: app grid, Quick Settings, date menu, lock, log out', () => {
    expect(actionFor(key('KeyA', { meta: true }))).toBe('apps');
    expect(actionFor(key('KeyS', { meta: true }))).toBe('quick-settings');
    expect(actionFor(key('KeyV', { meta: true }))).toBe('date-menu');
    expect(actionFor(key('KeyM', { meta: true }))).toBe('date-menu');
    expect(actionFor(key('KeyL', { meta: true }))).toBe('lock');
    expect(actionFor(key('Delete', { ctrl: true, alt: true }))).toBe('logout');
  });

  test('window keys', () => {
    expect(actionFor(key('ArrowUp', { meta: true }))).toBe('maximize');
    expect(actionFor(key('ArrowDown', { meta: true }))).toBe('unmaximize');
    expect(actionFor(key('F5', { alt: true }))).toBe('unmaximize');
    expect(actionFor(key('F10', { alt: true }))).toBe('toggle-maximize');
    expect(actionFor(key('KeyH', { meta: true }))).toBe('minimize');
    expect(actionFor(key('F4', { alt: true }))).toBe('close');
    expect(actionFor(key('ArrowLeft', { meta: true }))).toBe('tile-left');
    expect(actionFor(key('ArrowRight', { meta: true }))).toBe('tile-right');
  });

  test('Ubuntu: Alt+Tab switches windows, Super+Tab apps, Alt+` the app\'s windows', () => {
    expect(actionFor(key('Tab', { alt: true }))).toBe('switch-windows');
    expect(actionFor(key('Tab', { alt: true, shift: true }))).toBe('switch-windows-back');
    expect(actionFor(key('Tab', { meta: true }))).toBe('switch-apps');
    expect(actionFor(key('Backquote', { alt: true }))).toBe('switch-group');
    expect(actionFor(key('Backquote', { meta: true }))).toBe('switch-group');
  });

  test('show desktop, workspaces, dock numbers', () => {
    for (const m of [{ meta: true }, { meta: true, ctrl: true }, { ctrl: true, alt: true }]) expect(actionFor(key('KeyD', m))).toBe('show-desktop');
    expect(actionFor(key('PageDown', { meta: true }))).toBe('workspace-next');
    expect(actionFor(key('ArrowLeft', { ctrl: true, alt: true }))).toBe('workspace-prev');
    expect(actionFor(key('PageDown', { meta: true, shift: true }))).toBe('move-next');
    expect(actionFor(key('Digit3', { meta: true }))).toEqual({ dock: 3, newWindow: false });
    expect(actionFor(key('Digit3', { meta: true, ctrl: true }))).toEqual({ dock: 3, newWindow: true });
  });

  test('plain typing is never a shortcut', () => {
    expect(actionFor(key('KeyA'))).toBeNull();
    expect(actionFor(key('KeyA', { shift: true }))).toBeNull();
    expect(actionFor(key('Tab'))).toBeNull();
  });

  test('Super pressed and released alone toggles the Overview; Super+key does not', () => {
    const k = createOverlayKey();
    k.down({ key: 'Meta' });
    expect(k.up({ key: 'Meta' })).toBe(true);
    k.down({ key: 'Meta' });
    k.down({ key: 'a' });
    expect(k.up({ key: 'Meta' })).toBe(false);
  });
});
