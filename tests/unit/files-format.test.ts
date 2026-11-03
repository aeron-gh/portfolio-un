import { describe, expect, test } from 'bun:test';
import { dateText, formatSize, itemCount } from '../../src/desktop/apps/files/format';

describe('formatSize (g_format_size: units of 1000)', () => {
  test('whole bytes below 1000, with the singular', () => {
    expect(formatSize(0)).toBe('0 bytes');
    expect(formatSize(1)).toBe('1 byte');
    expect(formatSize(999)).toBe('999 bytes');
  });
  test('one decimal from kB up', () => {
    expect(formatSize(1000)).toBe('1.0 kB');
    expect(formatSize(1234)).toBe('1.2 kB');
    expect(formatSize(1_500_000)).toBe('1.5 MB');
    expect(formatSize(2_000_000_000)).toBe('2.0 GB');
  });
});

test('itemCount (format_item_count_for_display): singular, plural, thousands', () => {
  expect(itemCount(0)).toBe('0 items');
  expect(itemCount(1)).toBe('1 item');
  expect(itemCount(2)).toBe('2 items');
  expect(itemCount(1234)).toBe('1,234 items');
});

describe('dateText (date_to_str, wording from ICU 78 ureldatefmt)', () => {
  const now = new Date(2026, 10, 15, 15, 30);
  const daysAgo = (n: number) => new Date(2026, 10, 15 - n, 9, 5);

  test('today and yesterday carry the time', () => {
    expect(dateText(daysAgo(0), now, true)).toBe('Today, 09:05');
    expect(dateText(daysAgo(1), now, true)).toBe('Yesterday, 09:05');
  });
  test('the day boundary is midnight, not 24 hours', () => {
    expect(dateText(new Date(2026, 10, 14, 23, 59), new Date(2026, 10, 15, 0, 1), true)).toBe('Yesterday, 23:59');
  });
  test('12-hour time has a narrow no-break space before AM or PM', () => {
    expect(dateText(daysAgo(0), now, false)).toBe('Today, 9:05 AM');
  });
  test('days, up to six', () => {
    expect(dateText(daysAgo(2), now, true)).toBe('2 days ago');
    expect(dateText(daysAgo(6), now, true)).toBe('6 days ago');
  });
  test('weeks from 7 days, cut down to whole weeks', () => {
    expect(dateText(daysAgo(7), now, true)).toBe('Last week');
    expect(dateText(daysAgo(13), now, true)).toBe('Last week');
    expect(dateText(daysAgo(14), now, true)).toBe('2 weeks ago');
    expect(dateText(daysAgo(30), now, true)).toBe('4 weeks ago');
  });
  test('months of 30.4 days from 31 days', () => {
    expect(dateText(daysAgo(31), now, true)).toBe('Last month');
    expect(dateText(daysAgo(60), now, true)).toBe('Last month');
    expect(dateText(daysAgo(61), now, true)).toBe('2 months ago');
    expect(dateText(daysAgo(364), now, true)).toBe('11 months ago');
  });
  test('years of 365.25 days; exactly 365 days rounds down to "This year", as the real one does', () => {
    expect(dateText(daysAgo(365), now, true)).toBe('This year');
    expect(dateText(daysAgo(366), now, true)).toBe('Last year');
    expect(dateText(daysAgo(731), now, true)).toBe('2 years ago');
  });
  test('the future', () => {
    expect(dateText(daysAgo(-1), now, true)).toBe('Tomorrow, 09:05');
    expect(dateText(daysAgo(-3), now, true)).toBe('In 3 days');
  });
  test('takes the ISO text kept in the file system', () => {
    expect(dateText(daysAgo(2).toISOString(), now, true)).toBe('2 days ago');
  });
});
