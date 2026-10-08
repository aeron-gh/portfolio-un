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
  test('GNOME format: short month and day, an en space, then the time', () => {
    expect(formatClock(t, true, 'en-US')).toEqual({ date: 'Apr 14', time: '14:16', bar: 'Apr 14\u200214:16' });
    expect(formatClock(t, false, 'en-US')).toEqual({ date: 'Apr 14', time: '2:16 PM', bar: 'Apr 14\u2002 2:16 PM' });
  });

  test('a 24-hour clock always pads the hour, also when the locale picks it', () => {
    const early = new Date('2026-04-14T09:05:00');
    expect(formatClock(early, true, 'en-US').time).toBe('09:05');
    expect(formatClock(early, null, 'en-GB').time).toBe('09:05');
    expect(formatClock(early, null, 'en-US').time).toBe('9:05 AM');
  });
});

describe('battery icon', () => {
  test('steps down to tens (10 × floor) and shows charging', () => {
    expect(batteryIcon({ level: 0.47, charging: false })).toBe('battery-level-40-symbolic');
    expect(batteryIcon({ level: 0.3, charging: false })).toBe('battery-level-30-symbolic');
    expect(batteryIcon({ level: 0.31, charging: true })).toBe('battery-level-30-charging-symbolic');
    expect(batteryIcon({ level: 1, charging: true })).toBe('battery-level-100-charged-symbolic');
    expect(batteryIcon(null)).toBe('battery-level-100-charged-symbolic');
  });
});
