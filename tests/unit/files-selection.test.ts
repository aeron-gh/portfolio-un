import { describe, expect, test } from 'bun:test';
import { clickItem, invert, moveCursor, none, selectAll, targetIndex, type Selection } from '../../src/desktop/apps/files/selection';

const ORDER = ['a', 'b', 'c', 'd', 'e'];
const sel = (selected: string[], anchor: string | null = selected[0] ?? null, cursor: string | null = selected.at(-1) ?? null): Selection => ({ selected, anchor, cursor });

describe('clicking (gtk_list_base: select, modify, extend)', () => {
  test('a plain click selects only that item', () => {
    expect(clickItem(ORDER, sel(['a', 'b']), 'd', {})).toEqual(sel(['d']));
  });
  test('Ctrl toggles one item and keeps the rest', () => {
    expect(clickItem(ORDER, sel(['a']), 'c', { ctrl: true }).selected).toEqual(['a', 'c']);
    expect(clickItem(ORDER, sel(['a', 'c']), 'a', { ctrl: true }).selected).toEqual(['c']);
  });
  test('Shift selects from the anchor to the item, in either direction, and the anchor stays', () => {
    const start = clickItem(ORDER, none, 'b', {});
    const down = clickItem(ORDER, start, 'd', { shift: true });
    expect(down.selected).toEqual(['b', 'c', 'd']);
    expect(down.anchor).toBe('b');
    expect(clickItem(ORDER, down, 'a', { shift: true }).selected).toEqual(['a', 'b']);
  });
  test('Shift with nothing selected before acts like a plain click', () => {
    expect(clickItem(ORDER, none, 'c', { shift: true }).selected).toEqual(['c']);
  });
  test('Ctrl+Shift adds the range to what is already selected', () => {
    const start = clickItem(ORDER, clickItem(ORDER, none, 'a', {}), 'c', { ctrl: true });
    expect(clickItem(ORDER, start, 'e', { ctrl: true, shift: true }).selected).toEqual(['a', 'c', 'd', 'e']);
  });
});

describe('arrow keys', () => {
  test('moving selects only the new item', () => {
    expect(moveCursor(ORDER, sel(['b']), 'c', {})).toEqual(sel(['c']));
  });
  test('Shift extends from the anchor', () => {
    const one = moveCursor(ORDER, sel(['b']), 'c', { shift: true });
    expect(one.selected).toEqual(['b', 'c']);
    expect(moveCursor(ORDER, one, 'd', { shift: true }).selected).toEqual(['b', 'c', 'd']);
  });
  test('Ctrl moves the cursor and leaves the selection alone', () => {
    expect(moveCursor(ORDER, sel(['b']), 'd', { ctrl: true })).toEqual({ selected: ['b'], anchor: 'b', cursor: 'd' });
  });
});

describe('targetIndex: where a key lands in a grid of `cols` columns', () => {
  const at = (from: number, key: string, cols = 3, len = 8, page = 2) => targetIndex(from, key, cols, len, page);
  test('left and right step one item, and stop at the ends', () => {
    expect(at(4, 'ArrowLeft')).toBe(3);
    expect(at(4, 'ArrowRight')).toBe(5);
    expect(at(0, 'ArrowLeft')).toBe(0);
    expect(at(7, 'ArrowRight')).toBe(7);
  });
  test('up and down jump a row and stay put when there is none', () => {
    expect(at(4, 'ArrowUp')).toBe(1);
    expect(at(1, 'ArrowDown')).toBe(4);
    expect(at(1, 'ArrowUp')).toBe(1);
  });
  test('down from a row above a short last row lands on the last item', () => {
    expect(at(5, 'ArrowDown')).toBe(7);
  });
  test('Home and End', () => {
    expect(at(4, 'Home')).toBe(0);
    expect(at(4, 'End')).toBe(7);
  });
  test('Page keys jump a screenful of rows', () => {
    expect(at(1, 'PageDown')).toBe(7);
    expect(at(7, 'PageUp')).toBe(1);
  });
  test('with nothing focused, any key starts at the first item', () => {
    expect(at(-1, 'ArrowDown')).toBe(0);
    expect(at(-1, 'End')).toBe(7);
  });
  test('a list is a grid of one column', () => {
    expect(at(2, 'ArrowDown', 1)).toBe(3);
    expect(at(2, 'ArrowUp', 1)).toBe(1);
  });
  test('a key that does not move returns null', () => {
    expect(at(2, 'a')).toBeNull();
  });
});

test('selectAll and invert', () => {
  expect(selectAll(ORDER).selected).toEqual(ORDER);
  expect(invert(ORDER, sel(['a', 'c'])).selected).toEqual(['b', 'd', 'e']);
});
