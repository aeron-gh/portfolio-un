import { describe, expect, test } from 'bun:test';
import { DEFAULTS, GRID_SIZES, LIST_SIZES, parsePrefs, zoomed } from '../../src/desktop/apps/files/prefs';

describe('parsePrefs: what a new account starts with, and what saved data may change', () => {
  test('nothing saved: the gschema defaults, with Ubuntu\'s small grid icons', () => {
    expect(parsePrefs(null)).toEqual(DEFAULTS);
    expect(DEFAULTS).toMatchObject({ view: 'grid', gridZoom: 0, listZoom: 1, hidden: false, sorts: {}, starred: [], recents: [], searchTime: 'last_modified', searchContent: true });
    expect(DEFAULTS.bookmarks.map((b) => b.path.split('/').at(-1))).toEqual(['Documents', 'Music', 'Pictures', 'Videos', 'Downloads']);
    expect(GRID_SIZES[DEFAULTS.gridZoom]).toBe(48);
    expect(LIST_SIZES[DEFAULTS.listZoom]).toBe(32);
  });
  test('the search settings keep what was chosen, and nothing else', () => {
    expect(parsePrefs({ searchTime: 'created', searchContent: false })).toMatchObject({ searchTime: 'created', searchContent: false });
    expect(parsePrefs({ searchTime: 'soon', searchContent: 'no' })).toMatchObject({ searchTime: 'last_modified', searchContent: true });
  });
  test('good values are kept', () => {
    const saved = { view: 'list', gridZoom: 2, listZoom: 0, hidden: true, searchTime: 'created', searchContent: false, sorts: { '/a': { key: 'size', reversed: true } }, bookmarks: [{ path: '/etc' }], starred: ['/a'], recents: [{ path: '/b', at: '2026-01-01T00:00:00Z' }] };
    expect(parsePrefs(saved)).toEqual(saved as never);
  });
  test('bad values fall back, one by one', () => {
    expect(parsePrefs('junk')).toEqual(DEFAULTS);
    expect(parsePrefs({ view: 'tree', gridZoom: 9, listZoom: -1, hidden: 'yes', sorts: 3, starred: 'x', recents: 1 })).toEqual(DEFAULTS);
    expect(parsePrefs({ starred: ['/a', 3], recents: [{ path: '/a', at: 'x' }, { path: 1 }, 'no'] })).toMatchObject({ starred: ['/a'], recents: [{ path: '/a', at: 'x' }] });
    expect(parsePrefs({ gridZoom: 1.5 }).gridZoom).toBe(0);
  });
  test('a broken sort is dropped and the good ones stay', () => {
    const sorts = { '/ok': { key: 'name', reversed: true }, '/bad': { key: 'nope', reversed: true }, '/worse': 1 };
    expect(parsePrefs({ sorts }).sorts).toEqual({ '/ok': { key: 'name', reversed: true } });
  });
});

describe('zoomed: the sizes step and stop at the ends', () => {
  test('grid: 48, 64, 96, 168, 256', () => {
    expect(GRID_SIZES).toEqual([48, 64, 96, 168, 256]);
    expect(zoomed(0, 1, GRID_SIZES)).toBe(1);
    expect(zoomed(0, -1, GRID_SIZES)).toBe(0);
    expect(zoomed(4, 1, GRID_SIZES)).toBe(4);
  });
  test('list: 16, 32, 64', () => {
    expect(LIST_SIZES).toEqual([16, 32, 64]);
    expect(zoomed(2, 1, LIST_SIZES)).toBe(2);
  });
});
