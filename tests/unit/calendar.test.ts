import { describe, expect, test } from 'bun:test';
import { dayHeadings, eventsTitle, monthGrid, monthLabel, todayLabels, weekStart } from '../../src/desktop/system/calendar';

const today = new Date(2026, 9, 7); // Wednesday 7 October 2026

describe('date menu calendar (calendar.js)', () => {
  test('the week starts where the locale says', () => {
    expect(weekStart('en-US')).toBe(0);
    expect(weekStart('en-GB')).toBe(1);
  });

  test('always six weeks; a month starting on the week start gets a week before it', () => {
    const oct = monthGrid(2026, 9, 0, today); // 1 Oct 2026 is a Thursday
    expect(oct).toHaveLength(42);
    expect(oct[0].date).toEqual(new Date(2026, 8, 27));
    expect(oct.find((d) => d.today)?.date).toEqual(today);
    const feb = monthGrid(2026, 1, 0, today); // 1 Feb 2026 is a Sunday
    expect(feb[0].date).toEqual(new Date(2026, 0, 25));
    expect(feb.filter((d) => d.inMonth)).toHaveLength(28);
    expect(monthGrid(2026, 9, 1, today)[0].date).toEqual(new Date(2026, 8, 28));
  });

  test('weekends and other-month days are marked', () => {
    const oct = monthGrid(2026, 9, 0, today);
    expect(oct[0]).toMatchObject({ inMonth: false, weekend: true });
    expect(oct.find((d) => d.date.getDate() === 7 && d.inMonth)).toMatchObject({ weekend: false, today: true });
  });

  test('headings: letters from the week start, full names for screen readers', () => {
    expect(dayHeadings(0, 'en-US').map((h) => h.letter).join('')).toBe('SMTWTFS');
    expect(dayHeadings(1, 'en-US')[0]).toEqual({ letter: 'M', name: 'Monday' });
  });

  test('labels: month, today button, events title', () => {
    expect(monthLabel(today, today, 'en-US')).toBe('October');
    expect(monthLabel(new Date(2027, 0, 1), today, 'en-US')).toBe('January 2027');
    expect(todayLabels(today, 'en-US')).toEqual({ day: 'Wednesday', date: 'October 7 2026' });
    expect(eventsTitle(today, today)).toBe('Today');
    expect(eventsTitle(new Date(2026, 9, 6), today)).toBe('Yesterday');
    expect(eventsTitle(new Date(2026, 9, 8), today)).toBe('Tomorrow');
    expect(eventsTitle(new Date(2026, 9, 20), today, 'en-US')).toBe('October 20');
    expect(eventsTitle(new Date(2027, 2, 1), today, 'en-US')).toBe('March 1 2027');
  });
});
