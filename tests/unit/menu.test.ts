import { describe, expect, test } from 'bun:test';
import { nextIndex, tidySeparators, type MenuItem } from '../../src/desktop/shell/menu';

const item = (id: string, disabled = false): MenuItem => ({ kind: 'item', id, label: id, disabled });
const sep = (label?: string): MenuItem => ({ kind: 'separator', label });

describe('menu keyboard movement', () => {
  const items = [sep('Title'), item('a'), sep(), item('b', true), item('c')];

  test('skips separators and disabled items, wrapping round', () => {
    expect(nextIndex(items, -1, 1)).toBe(1);
    expect(nextIndex(items, 1, 1)).toBe(4);
    expect(nextIndex(items, 4, 1)).toBe(1);
    expect(nextIndex(items, 1, -1)).toBe(4);
  });

  test('a menu with nothing selectable gives -1', () => {
    expect(nextIndex([sep(), item('x', true)], -1, 1)).toBe(-1);
  });
});

describe('separators (GNOME hides the redundant ones)', () => {
  test('drops unlabelled separators at the ends or next to another separator', () => {
    expect(tidySeparators([sep(), item('a'), sep(), sep(), item('b'), sep()])).toEqual([item('a'), sep(), item('b')]);
  });

  test('keeps labelled separators; an unlabelled one before a labelled one goes', () => {
    expect(tidySeparators([sep('App'), sep(), item('a'), sep(), sep('Open Windows'), item('w')])).toEqual([
      sep('App'), item('a'), sep('Open Windows'), item('w'),
    ]);
  });
});
