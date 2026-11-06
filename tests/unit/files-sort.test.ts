import { describe, expect, test } from 'bun:test';
import { defaultSort, SORTS, sortEntries, sortsFor, type Entry, type Sort } from '../../src/desktop/apps/files/sort';
import { HOME, TRASH, type FsNode } from '../../src/desktop/fs/vfs';
import { RECENT } from '../../src/desktop/apps/files/places';

const file = (name: string, size = 0, mtime = '2026-01-01T00:00:00Z', mime = 'text/plain'): Entry => ({
  path: `/home/ubuntu/${name}`,
  node: { name, kind: 'file', size, mtime, mime } as FsNode,
  count: 0,
});
const dir = (name: string, count = 0, mtime = '2026-01-01T00:00:00Z'): Entry => ({
  path: `/home/ubuntu/${name}`,
  node: { name, kind: 'dir', size: 0, mtime } as FsNode,
  count,
});
const names = (entries: Entry[], sort: Sort) => sortEntries(entries, sort).map((e) => e.node.name);
const AZ: Sort = { key: 'name', reversed: false };
const ZA: Sort = { key: 'name', reversed: true };

test('the sort menu (nautilus-toolbar-view-menu.ui): each label and its order', () => {
  expect(SORTS.map((s) => [s.label, s.sort.key, s.sort.reversed])).toEqual([
    ['A-Z', 'name', false],
    ['Z-A', 'name', true],
    ['Last Modified', 'date_modified', true],
    ['First Modified', 'date_modified', false],
    ['Size', 'size', true],
    ['Type', 'type', false],
  ]);
});

describe('by name', () => {
  test('folders come first, even when reversed (sort-directories-first)', () => {
    expect(names([file('a'), dir('z'), dir('b')], AZ)).toEqual(['b', 'z', 'a']);
    expect(names([file('a'), file('c'), dir('z'), dir('b')], ZA)).toEqual(['z', 'b', 'c', 'a']);
  });
  test('natural order: numbers compare as numbers (g_utf8_collate_key_for_filename)', () => {
    expect(names([file('a10'), file('a9'), file('a1')], AZ)).toEqual(['a1', 'a9', 'a10']);
  });
  test('case does not split the alphabet', () => {
    expect(names([file('Banana'), file('apple'), file('cherry')], AZ)).toEqual(['apple', 'Banana', 'cherry']);
  });
  test('names starting with "." or "#" go last (SORT_LAST_CHAR1, SORT_LAST_CHAR2), and first when reversed', () => {
    // Among themselves a dot still comes first: its key is the lowest there is (see the next test).
    expect(names([file('.bashrc'), file('notes'), file('#draft'), file('zebra')], AZ)).toEqual(['notes', 'zebra', '.bashrc', '#draft']);
    expect(names([file('.bashrc'), file('notes')], ZA)).toEqual(['.bashrc', 'notes']);
  });
  test('a dot sorts below every other character (gunicollate.c), so README.md comes before README-old.md', () => {
    expect(names([file('aa.a'), file('a-.a'), file('a.a')], AZ)).toEqual(['a.a', 'a-.a', 'aa.a']);
    expect(names([file('README-old.md'), file('README2.md'), file('README.md')], AZ)).toEqual(['README.md', 'README-old.md', 'README2.md']);
  });
  test('does not change the list it is given', () => {
    const list = [file('b'), file('a')];
    sortEntries(list, AZ);
    expect(list.map((e) => e.node.name)).toEqual(['b', 'a']);
  });
});

describe('by size', () => {
  const SIZE: Sort = { key: 'size', reversed: true };
  test('largest first; equal sizes fall back to the name', () => {
    expect(names([file('small', 1), file('big', 9), file('b', 5), file('a', 5)], SIZE)).toEqual(['big', 'b', 'a', 'small']);
  });
  test('folders stay first, the fullest first (compare_directories_by_count)', () => {
    expect(names([file('big', 999), dir('one', 1), dir('three', 3)], SIZE)).toEqual(['three', 'one', 'big']);
  });
});

describe('by date', () => {
  const old = '2020-01-01T00:00:00Z';
  const recent = '2026-01-01T00:00:00Z';
  test('Last Modified puts the newest first, First Modified the oldest', () => {
    const list = [file('old', 0, old), file('new', 0, recent)];
    expect(names(list, { key: 'date_modified', reversed: true })).toEqual(['new', 'old']);
    expect(names(list, { key: 'date_modified', reversed: false })).toEqual(['old', 'new']);
  });
});

test('by the time it went to the Trash', () => {
  const t = (name: string, trashed: string) => ({ ...file(name), node: { ...file(name).node, trashed } });
  expect(names([t('first', '2026-01-01T00:00:00Z'), t('last', '2026-02-01T00:00:00Z')], { key: 'trashed_on', reversed: true })).toEqual(['last', 'first']);
});

test('the Trash adds Last Trashed to the sort menu', () => {
  expect(sortsFor(true).map((s) => s.label)).toEqual([...SORTS.map((s) => s.label), 'Last Trashed']);
  expect(sortsFor(false)).toEqual(SORTS);
});

describe('by type (compare_by_type)', () => {
  test('groups by the type name people read, then by name', () => {
    const list = [file('z.txt'), file('a.md', 0, undefined, 'text/markdown'), file('b.txt'), dir('folder')];
    // "Folder" < "Markdown document" < "Plain text document"
    expect(names(list, { key: 'type', reversed: false })).toEqual(['folder', 'a.md', 'b.txt', 'z.txt']);
  });
});

describe('defaultSort (nautilus_file_get_default_sort_type)', () => {
  test('Downloads opens with the newest first', () => {
    expect(defaultSort(`${HOME}/Downloads`)).toEqual({ key: 'date_modified', reversed: true });
  });
  test('the Trash by when things went, Recent by when they were used', () => {
    expect(defaultSort(TRASH)).toEqual({ key: 'trashed_on', reversed: true });
    expect(defaultSort(RECENT)).toEqual({ key: 'recency', reversed: true });
  });
  test('anything else by name', () => {
    expect(defaultSort(`${HOME}/Documents`)).toEqual({ key: 'name', reversed: false });
  });
});

describe('Recent', () => {
  const used = (name: string, at: string, dir = false): Entry => ({ ...(dir ? { ...file(name), node: { ...file(name).node, kind: 'dir' as const } } : file(name)), at });
  const R: Sort = { key: 'recency', reversed: true };
  test('the last used comes first', () => {
    expect(sortEntries([used('old', '2026-01-01T00:00:00Z'), used('new', '2026-02-01T00:00:00Z')], R, false).map((e) => e.node.name)).toEqual(['new', 'old']);
  });
  test('folders are not put first there (update_sort_directories_first)', () => {
    expect(sortEntries([used('a-folder', '2026-01-01T00:00:00Z', true), used('new', '2026-02-01T00:00:00Z')], R, false).map((e) => e.node.name)).toEqual(['new', 'a-folder']);
  });
});
