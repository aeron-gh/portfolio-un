import { describe, expect, test } from 'bun:test';
import { forget, fuzzy, parseRecents, rank, score, touch } from '../../src/desktop/apps/text-editor/recents';

describe('fuzzy match (gtk_source_completion_fuzzy_match)', () => {
  test('letters must appear in order; each skipped letter costs 2, each letter left over costs 1', () => {
    // r at 0 (0), d skips "ea" (2 × 2), m comes next (0), "e.md" is left over (4).
    expect(fuzzy('readme.md', 'rdm')).toBe(8);
  });
  test('no match when a letter is missing or out of order', () => {
    expect(fuzzy('readme.md', 'xyz')).toBeNull();
    expect(fuzzy('abc', 'cb')).toBeNull();
    expect(fuzzy('', 'a')).toBeNull();
  });
});

describe('search score (_editor_sidebar_item_matches)', () => {
  test('a prefix of the name or the folder is best, then a part of either, then a fuzzy match', () => {
    expect(score('README.md', '~/Desktop', 'read')).toBe(0);
    expect(score('README.md', '~/Desktop', '~/des')).toBe(0);
    expect(score('README.md', '~/Desktop', 'me.m')).toBe(1);
    expect(score('README.md', '~/Desktop', 'rdm')).toBe(fuzzy('readme.md', 'rdm')! + 2);
    expect(score('README.md', '~/Desktop', 'qq')).toBeNull();
  });
  test('ranking puts the best score first and keeps the newest first among equals', () => {
    const items = [
      { title: 'skills.md', subtitle: '~/Documents' },
      { title: 'about.md', subtitle: '~/Documents' },
      { title: 'README.md', subtitle: '~/Desktop' },
    ];
    expect(rank(items, '').map((i) => i.title)).toEqual(['skills.md', 'about.md', 'README.md']);
    expect(rank(items, 'ab').map((i) => i.title)).toEqual(['about.md']);
    expect(rank(items, 'md').map((i) => i.title)).toEqual(['skills.md', 'about.md', 'README.md']);
    expect(rank(items, '~/doc').map((i) => i.title)).toEqual(['skills.md', 'about.md']);
  });
});

describe('the saved list of recent documents', () => {
  test('closing a file puts it first with a new age; it appears once', () => {
    const list = touch(touch([], '/a', 1), '/b', 2);
    expect(list).toEqual([{ path: '/b', age: 2 }, { path: '/a', age: 1 }]);
    expect(touch(list, '/a', 3)).toEqual([{ path: '/a', age: 3 }, { path: '/b', age: 2 }]);
  });
  test('Remove forgets a file', () => {
    expect(forget([{ path: '/a', age: 1 }, { path: '/b', age: 2 }], '/a')).toEqual([{ path: '/b', age: 2 }]);
  });
  test('saved data is checked entry by entry; anything odd is dropped', () => {
    expect(parseRecents([{ path: '/a', age: 5 }, { path: 'rel', age: 1 }, { path: '/b' }, null, 'x', { path: '/c', age: 2 }])).toEqual([
      { path: '/a', age: 5 },
      { path: '/c', age: 2 },
    ]);
    expect(parseRecents('nope')).toEqual([]);
  });
});
