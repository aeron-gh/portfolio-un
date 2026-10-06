import { describe, expect, test } from 'bun:test';
import {
  buildWeeks,
  findPr,
  levelFor,
  roundedTotal,
  shapeGithubData,
  sinceLabel,
  type RawPr,
} from '../../src/lib/github';

const pr = (repo: string, number: number, mergedAt: string): RawPr => ({
  repo,
  number,
  title: `PR ${number}`,
  mergedAt,
  url: `https://github.com/${repo}/pull/${number}`,
});
const EX = { owners: ['me', 'my-org'], repos: ['school/class-exercise'] };

describe('roundedTotal', () => {
  test('rounds down to tens and adds a plus', () => {
    expect(roundedTotal(73)).toBe('70+');
    expect(roundedTotal(70)).toBe('70+');
    expect(roundedTotal(128)).toBe('120+');
    expect(roundedTotal(10)).toBe('10+');
  });

  test('under ten is exact', () => {
    expect(roundedTotal(9)).toBe('9');
    expect(roundedTotal(0)).toBe('0');
  });
});

describe('sinceLabel', () => {
  const now = new Date('2026-10-06T12:00:00Z');

  test('a recent first merge gives the month name', () => {
    expect(sinceLabel('2026-06-21T10:00:00Z', now)).toBe('June');
  });

  test('a first merge 12 or more months ago gives the year', () => {
    expect(sinceLabel('2025-10-01T00:00:00Z', now)).toBe('2025');
  });

  test('no merges gives an empty label', () => {
    expect(sinceLabel(null, now)).toBe('');
  });
});

describe('shapeGithubData', () => {
  const prs = [
    pr('p4lang/p4c', 2, '2026-07-05T09:00:00Z'),
    pr('p4lang/p4c', 1, '2026-06-21T09:00:00Z'),
    pr('thanos-io/thanos', 3, '2026-07-05T20:00:00Z'),
    pr('me/own-repo', 4, '2026-07-06T09:00:00Z'),
    pr('My-Org/thing', 5, '2026-07-06T09:00:00Z'),
    pr('school/class-exercise', 6, '2026-07-07T09:00:00Z'),
  ];
  const data = shapeGithubData(prs, EX, '2026-10-06T00:00:00Z');

  test('drops own repos, own orgs (any letter case) and excluded repos', () => {
    expect(data.total).toBe(3);
    expect(data.prs.map((p) => p.number)).toEqual([1, 2, 3]);
  });

  test('counts per day and per repo', () => {
    expect(data.perDay).toEqual({ '2026-06-21': 1, '2026-07-05': 2 });
    expect(data.perRepo).toEqual({ 'p4lang/p4c': 2, 'thanos-io/thanos': 1 });
  });

  test('first and latest merges come from sorted dates', () => {
    expect(data.firstMergedAt).toBe('2026-06-21T09:00:00Z');
    expect(data.latest?.number).toBe(3);
  });

  test('no PRs gives an empty but valid result', () => {
    const empty = shapeGithubData([], EX, '2026-10-06T00:00:00Z');
    expect(empty).toMatchObject({ total: 0, firstMergedAt: null, latest: null, perDay: {}, perRepo: {}, prs: [] });
  });
});

describe('levelFor', () => {
  test('0, 1, 2 stay as they are and 3 or more caps at 3', () => {
    expect([0, 1, 2, 3, 7].map(levelFor)).toEqual([0, 1, 2, 3, 3]);
  });
});

describe('buildWeeks', () => {
  const now = new Date('2026-10-06T12:00:00Z'); // a Tuesday
  const weeks = buildWeeks({ '2026-06-21': 1, '2026-09-14': 5 }, '2026-06-21T09:00:00Z', now);

  test('runs from the Monday of the first-merge week to the current week', () => {
    expect(weeks.length).toBe(17);
    expect(weeks[0].days[0].date).toBe('2026-06-15');
    expect(weeks.at(-1)!.days[6].date).toBe('2026-10-11');
  });

  test('every week has 7 days', () => {
    expect(weeks.every((w) => w.days.length === 7)).toBe(true);
  });

  test('counts and levels land on the right day', () => {
    expect(weeks[0].days[6]).toMatchObject({ date: '2026-06-21', count: 1, level: 1 });
    const sep14 = weeks.flatMap((w) => w.days).find((d) => d.date === '2026-09-14');
    expect(sep14).toMatchObject({ count: 5, level: 3 });
  });

  test('days after today are marked future', () => {
    expect(weeks.at(-1)!.days.map((d) => d.future)).toEqual([false, false, true, true, true, true, true]);
  });

  test('a month label appears only on the first week of each month', () => {
    expect(weeks.map((w) => w.month).filter(Boolean)).toEqual(['Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
    expect(weeks[0].month).toBe('Jun');
    expect(weeks[1].month).toBeNull();
  });

  test('never more than 52 weeks', () => {
    expect(buildWeeks({}, '2020-01-01T00:00:00Z', now).length).toBe(52);
  });

  test('no merges gives no weeks', () => {
    expect(buildWeeks({}, null, now)).toEqual([]);
  });
});

describe('findPr', () => {
  test('finds a PR by repo (any letter case) and number', () => {
    const data = shapeGithubData([pr('p4lang/p4c', 5707, '2026-07-19T00:00:00Z')], EX, '2026-10-06T00:00:00Z');
    expect(findPr(data, 'P4lang/P4C', 5707)?.number).toBe(5707);
    expect(findPr(data, 'p4lang/p4c', 1)).toBeUndefined();
  });
});
