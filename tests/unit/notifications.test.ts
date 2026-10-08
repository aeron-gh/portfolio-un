import { describe, expect, test } from 'bun:test';
import { groupByApp, timeSpan, type Notice } from '../../src/desktop/system/notifications';

const n = (id: string, app: string, time: number): Notice => ({ id, app, appName: app, icon: '', title: id, body: '', time, acknowledged: false });

describe('notifications (messageList.js, dateUtils.js)', () => {
  test('grouped by app, the newest app first, newest first inside', () => {
    const groups = groupByApp([n('a1', 'files', 1), n('w1', 'welcome', 2), n('a2', 'files', 3)]);
    expect(groups.map((g) => g.app)).toEqual(['files', 'welcome']);
    expect(groups[0].notices.map((x) => x.id)).toEqual(['a2', 'a1']);
  });

  test('GNOME\'s time words', () => {
    const now = Date.UTC(2026, 9, 7, 12);
    const m = 60_000;
    expect(timeSpan(now, now - 4 * m)).toBe('Just now');
    expect(timeSpan(now, now - 5 * m)).toBe('5 minutes ago');
    expect(timeSpan(now, now - 61 * m)).toBe('1 hour ago');
    expect(timeSpan(now, now - 25 * 60 * m)).toBe('Yesterday');
    expect(timeSpan(now, now - 3 * 1440 * m)).toBe('3 days ago');
    expect(timeSpan(now, now - 20 * 1440 * m)).toBe('2 weeks ago');
    expect(timeSpan(now, now - 100 * 1440 * m)).toBe('3 months ago');
    expect(timeSpan(now, now - 800 * 1440 * m)).toBe('2 years ago');
  });
});
