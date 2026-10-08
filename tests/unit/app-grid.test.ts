import { describe, expect, test } from 'bun:test';
import { APPS } from '../../src/desktop/apps/registry';
import { ORDER_KEY, gridShape, loadOrder, moveTile, pages, saveOrder, tiles } from '../../src/desktop/shell/app-grid';

const memory = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; }, data };
};
const test2 = APPS.filter((a) => a.testOnly);

describe('app grid', () => {
  test('10 columns on wide screens (real 26.04), fewer when narrow', () => {
    expect(gridShape(1854)).toEqual({ cols: 10, rows: 3, icon: 64 });
    expect(gridShape(1000)).toEqual({ cols: 8, rows: 3, icon: 64 });
    expect(gridShape(800)).toEqual({ cols: 6, rows: 4, icon: 48 });
  });

  test('apps in a folder are grouped; tiles sort by name until reordered', () => {
    expect(tiles(test2, [])).toEqual([
      { kind: 'app', id: 'test-window' },
      { kind: 'folder', id: 'Utilities', apps: ['test-utility'] },
    ]);
  });

  test('a saved order wins; unknown ids are ignored', () => {
    expect(tiles(test2, ['Utilities', 'gone', 'test-window']).map((t) => t.id)).toEqual(['Utilities', 'test-window']);
  });

  test('moving a tile', () => {
    expect(moveTile(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
    expect(moveTile(['a', 'b', 'c'], 'a', 9)).toEqual(['b', 'c', 'a']);
  });

  test('pages split the tiles', () => {
    expect(pages([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(pages([], 30)).toEqual([[]]);
  });

  test('bad saved grid order falls back to none', () => {
    expect(loadOrder(null)).toEqual([]);
    expect(loadOrder(memory({ [ORDER_KEY]: '{bad' }))).toEqual([]);
    expect(loadOrder(memory({ [ORDER_KEY]: '[1, 2]' }))).toEqual([]);
    const m = memory();
    expect(saveOrder(m, ['test-window'])).toBe(true);
    expect(loadOrder(m)).toEqual(['test-window']);
  });
});
