import { describe, expect, test } from 'bun:test';
import { ARRANGE_DEFAULTS, ARRANGE_KEY, arrangeOrder, loadArrange, type Arrangeable } from '../../src/desktop/shell/desktop-arrange';
import { backgroundMenu, copyName, extensionAt, fileMenu, uniqueName, validName, type GtkItem } from '../../src/desktop/shell/desktop-menu';

const labels = (items: GtkItem[]) => items.map((i) => (i.kind === 'separator' ? '|' : `${i.label}${'disabled' in i && i.disabled ? '(x)' : ''}`));
const memory = (v: string | null) => ({ getItem: () => v, setItem: () => {} });

describe('Desktop Icons NG menus and arranging', () => {
  test('the background menu, in DING\'s order; apps that do not exist yet are disabled', () => {
    expect(labels(backgroundMenu({ canPaste: false, arrange: ARRANGE_DEFAULTS }))).toEqual([
      'New Folder', '|', 'Paste(x)', '|', 'Select All', '|', 'Arrange Icons', 'Arrange By...', '|',
      'Show Desktop in Files(x)', 'Open in Terminal(x)', '|', 'Change Background…(x)', '|', 'Desktop Icons Settings(x)', 'Display Settings(x)',
    ]);
    const sub = backgroundMenu({ canPaste: true, arrange: { ...ARRANGE_DEFAULTS, keepArranged: true } });
    expect(labels(sub)[2]).toBe('Paste');
    expect(labels(sub)[6]).toBe('Arrange Icons(x)');
    const by = sub[7].kind === 'item' ? sub[7].submenu! : [];
    expect(labels(by)).toEqual(['Keep Arranged...', 'Keep Stacked by type...(x)', 'Sort Home/Drives/Trash...', '|', 'Sort by Name', 'Sort by Name Descending', 'Sort by Modified Time', 'Sort by Type', 'Sort by Size']);
    expect(by.filter((i) => i.kind === 'radio' && i.checked).map((i) => i.kind !== 'separator' && i.label)).toEqual(['Sort by Name Descending']);
  });

  test('the icon menu: one file, two files, a folder, Home', () => {
    expect(labels(fileMenu({ count: 1, special: false, folders: 0, canRename: true }))).toEqual([
      'Open', 'Open With Other Application(x)', '|', 'Cut', 'Copy', 'Rename…', '|', 'Move to Trash', '|',
      'Send to...(x)', 'Compress 1 file(x)', 'New Folder with 1 item', '|', 'Properties(x)', '|', 'Show in Files(x)',
    ]);
    const two = labels(fileMenu({ count: 2, special: false, folders: 0, canRename: true }));
    expect(two).toContain('Open All...');
    expect(two).not.toContain('Rename…');
    expect(two).toContain('Compress 2 files(x)');
    expect(two).toContain('Show All in Files(x)');
    const folder = labels(fileMenu({ count: 1, special: false, folders: 1, canRename: true }));
    expect(folder).not.toContain('Send to...(x)');
    expect(folder).toContain('Compress 1 folder(x)');
    expect(folder.at(-1)).toBe('Open in Terminal(x)');
    expect(labels(fileMenu({ count: 1, special: true, folders: 1, canRename: false }))).toEqual([
      'Open', 'Open With Other Application(x)', '|', 'Cut(x)', 'Copy(x)', '|', 'Move to Trash(x)', '|', 'Properties(x)', '|', 'Show in Files(x)', 'Open in Terminal(x)',
    ]);
  });

  test('sort orders: name both ways (numbers in order), oldest first, smallest first, and by type', () => {
    const it = (path: string, extra: Partial<Arrangeable> = {}): Arrangeable => ({ path, label: path, special: false, dir: false, launcher: false, mime: 'text/plain', mtime: '2026-01-01', size: 1, ...extra });
    const items = [it('b10.txt', { size: 5, mtime: '2026-03-01' }), it('b2.txt', { size: 9, mtime: '2026-01-01' }), it('a', { dir: true, size: 2, mtime: '2026-02-01', mime: 'inode/directory' }), it('x.md', { mime: 'text/markdown', size: 1, mtime: '2026-04-01' })];
    expect(arrangeOrder(items, 'NAME')).toEqual(['a', 'b2.txt', 'b10.txt', 'x.md']);
    expect(arrangeOrder(items, 'DESCENDINGNAME')).toEqual(['x.md', 'b10.txt', 'b2.txt', 'a']);
    expect(arrangeOrder(items, 'MODIFIEDTIME')).toEqual(['b2.txt', 'a', 'b10.txt', 'x.md']);
    expect(arrangeOrder(items, 'SIZE')).toEqual(['x.md', 'a', 'b10.txt', 'b2.txt']);
    expect(arrangeOrder(items, 'KIND')).toEqual(['a', 'x.md', 'b2.txt', 'b10.txt']);
  });

  test('bad desktop arrangement falls back to Ubuntu\'s defaults', () => {
    expect(loadArrange(null)).toEqual(ARRANGE_DEFAULTS);
    expect(loadArrange(memory('{oops'))).toEqual(ARRANGE_DEFAULTS);
    expect(loadArrange(memory(JSON.stringify({ order: 'COLOUR', keepArranged: 'yes', keepStacked: true, sortSpecial: true })))).toEqual({ ...ARRANGE_DEFAULTS, sortSpecial: true });
    expect(loadArrange({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toEqual(ARRANGE_DEFAULTS);
    expect(ARRANGE_KEY).toBe('ubuntu.desktop-arrange.v1');
  });

  test('names: New Folder 1, copies, the selected part of a name, and what the rename box accepts', () => {
    const taken = (names: string[]) => (n: string) => names.includes(n);
    expect(uniqueName('New Folder', taken([]))).toBe('New Folder');
    expect(uniqueName('New Folder', taken(['New Folder', 'New Folder 1']))).toBe('New Folder 2');
    expect(copyName('README.md', false, taken([]))).toBe('README (Copy).md');
    expect(copyName('README.md', false, taken(['README (Copy).md']))).toBe('README (Copy 2).md');
    expect(copyName('README (Copy).md', false, taken([]))).toBe('README (Copy 2).md');
    expect(copyName('my.dir', true, taken([]))).toBe('my.dir (Copy)');
    expect(extensionAt('notes.tar.gz', false)).toBe(9);
    expect(extensionAt('.bashrc', false)).toBe(7);
    expect(validName('', 'a', taken([]), false)).toBe(false);
    expect(validName('a/b', 'a', taken([]), false)).toBe(false);
    expect(validName('a', 'a', taken(['a']), false)).toBe(false);
    expect(validName('New Folder', 'New Folder', taken(['New Folder']), true)).toBe(true);
    expect(validName('README.md', 'x', taken(['README.md']), false)).toBe(false);
    expect(validName('b', 'a', taken(['a']), false)).toBe(true);
  });
});
