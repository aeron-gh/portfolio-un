import { describe, expect, test } from 'bun:test';
import { DEFAULTS, GRID_SIZES, LIST_SIZES, parsePrefs, zoomed } from '../../src/desktop/apps/files/prefs';

describe('parsePrefs: what a new account starts with, and what saved data may change', () => {
  test('nothing saved: the gschema defaults, with Ubuntu\'s small grid icons', () => {
    expect(parsePrefs(null)).toEqual(DEFAULTS);
    expect(DEFAULTS).toEqual({ view: 'grid', gridZoom: 0, listZoom: 1, hidden: false, sorts: {} });
    expect(GRID_SIZES[DEFAULTS.gridZoom]).toBe(48);
    expect(LIST_SIZES[DEFAULTS.listZoom]).toBe(32);
  });
  test('good values are kept', () => {
    const saved = { view: 'list', gridZoom: 2, listZoom: 0, hidden: true, sorts: { '/a': { key: 'size', reversed: true } } };
    expect(parsePrefs(saved)).toEqual(saved as never);
  });
  test('bad values fall back, one by one', () => {
    expect(parsePrefs('junk')).toEqual(DEFAULTS);
    expect(parsePrefs({ view: 'tree', gridZoom: 9, listZoom: -1, hidden: 'yes', sorts: 3 })).toEqual(DEFAULTS);
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
