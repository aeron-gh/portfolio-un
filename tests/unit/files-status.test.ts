import { describe, expect, test } from 'bun:test';
import { selectionStatus, type Picked } from '../../src/desktop/apps/files/status';

const f = (name: string, size: number): Picked => ({ name, dir: false, size, items: 0 });
const d = (name: string, items: number): Picked => ({ name, dir: true, size: 0, items });

describe('selectionStatus (nautilus_files_view_display_selection_info)', () => {
  test('nothing selected: nothing to show', () => {
    expect(selectionStatus([])).toBeNull();
  });
  test('one file: its name, then its size', () => {
    expect(selectionStatus([f('README.md', 2100)])).toEqual({ primary: '“README.md” selected', detail: '(2.1 kB)' });
  });
  test('several files: the count, then the total size', () => {
    expect(selectionStatus([f('a', 1000), f('b', 500)])).toEqual({ primary: '2 items selected', detail: '(1.5 kB)' });
  });
  test('one folder: its name, then what it holds', () => {
    expect(selectionStatus([d('Documents', 3)])).toEqual({ primary: '“Documents” selected', detail: '(containing 3 items)' });
    expect(selectionStatus([d('Documents', 1)])).toEqual({ primary: '“Documents” selected', detail: '(containing 1 item)' });
  });
  test('a folder that cannot be read: no count (folder_item_count_known)', () => {
    expect(selectionStatus([d('root', -1)])).toEqual({ primary: '“root” selected', detail: '' });
    expect(selectionStatus([d('root', -1), d('a', 2)])).toEqual({ primary: '2 folders selected', detail: '' });
    expect(selectionStatus([d('root', -1), f('b', 1000)])).toEqual({ primary: '1 folder selected, 1 other item selected (1.0 kB)', detail: null });
  });
  test('several folders: the count and the total they hold', () => {
    expect(selectionStatus([d('a', 2), d('b', 1)])).toEqual({ primary: '2 folders selected', detail: '(containing a total of 3 items)' });
  });
  test('folders and files together: one line, in the real wording', () => {
    expect(selectionStatus([d('a', 2), f('b', 1000)])).toEqual({
      primary: '1 folder selected (containing 2 items), 1 other item selected (1.0 kB)',
      detail: null,
    });
    expect(selectionStatus([d('a', 2), d('c', 1), f('b', 1000), f('e', 1000)])).toEqual({
      primary: '2 folders selected (containing a total of 3 items), 2 other items selected (2.0 kB)',
      detail: null,
    });
  });
});
