import { describe, expect, test } from 'bun:test';
import { next } from '../../src/desktop/system/session';
import { formatClock } from '../../src/desktop/system/clock';
import { batteryIcon } from '../../src/desktop/system/battery';

describe('session state machine', () => {
  test('boot → login → session ⇄ lock, log out, power off, restart', () => {
    expect(next('boot', 'booted')).toBe('login');
    expect(next('login', 'login')).toBe('session');
    expect(next('session', 'lock')).toBe('lock');
    expect(next('lock', 'unlock')).toBe('session');
    expect(next('session', 'logout')).toBe('login');
    expect(next('session', 'powerOff')).toBe('off');
    expect(next('off', 'restart')).toBe('boot');
  });

  test('events that make no sense leave the state alone', () => {
    expect(next('login', 'unlock')).toBe('login');
    expect(next('lock', 'login')).toBe('lock');
    expect(next('off', 'login')).toBe('off');
  });
});

describe('top bar clock', () => {
  const t = new Date('2026-04-14T14:16:00');
  test('GNOME format: short month and day, then time', () => {
    expect(formatClock(t, true, 'en-US')).toEqual({ date: 'Apr 14', time: '14:16' });
    expect(formatClock(t, false, 'en-US')).toEqual({ date: 'Apr 14', time: '2:16 PM' });
  });
});

describe('battery icon', () => {
  test('rounds to tens and shows charging', () => {
    expect(batteryIcon({ level: 0.47, charging: false })).toBe('battery-level-50-symbolic');
    expect(batteryIcon({ level: 0.31, charging: true })).toBe('battery-level-30-charging-symbolic');
    expect(batteryIcon({ level: 1, charging: true })).toBe('battery-level-100-charged-symbolic');
    expect(batteryIcon(null)).toBe('battery-level-100-charged-symbolic');
  });
});
