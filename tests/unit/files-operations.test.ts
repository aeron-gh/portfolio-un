import { beforeEach, describe, expect, test } from 'bun:test';
import { HOME, TRASH, Vfs, type FsNode } from '../../src/desktop/fs/vfs';
import { createFolder, deleteFromTrash, emptyTrash, paste, rename, restore, trash } from '../../src/desktop/apps/files/operations';

const T = '2026-10-07T10:00:00.000Z';
const file = (name: string, content = 'x'): FsNode => ({ name, kind: 'file', mime: 'text/plain', content, size: content.length, mtime: T });
const dir = (name: string, kids: FsNode[] = []): FsNode => ({ name, kind: 'dir', size: 0, mtime: T, children: Object.fromEntries(kids.map((k) => [k.name, k])) });
const seed = () =>
  dir('', [
    dir('etc', [file('hostname')]),
    dir('home', [
      dir('ubuntu', [
        dir('Documents', [file('a.txt'), file('b.txt')]),
        dir('Pictures', [file('a.txt', 'other')]),
        dir('.local', [dir('share', [dir('Trash', [dir('files'), dir('info')])])]),
      ]),
    ]),
  ]);
const D = `${HOME}/Documents`;
const P = `${HOME}/Pictures`;
let fs: Vfs;
beforeEach(() => {
  fs = new Vfs(seed(), {});
});
const names = (path: string) => fs.list(path, { hidden: true }).map((n) => n.name);

describe('trash', () => {
  test('moves to the Trash; undo puts back; redo moves again', () => {
    const op = trash(fs, [`${D}/a.txt`, `${D}/b.txt`]);
    expect(names(D)).toEqual([]);
    expect(names(TRASH)).toEqual(['a.txt', 'b.txt']);
    expect([op.undoLabel, op.redoLabel]).toEqual(['Undo Trash', 'Redo Trash']);
    op.undo();
    expect(names(D)).toEqual(['a.txt', 'b.txt']);
    expect(names(TRASH)).toEqual([]);
    op.redo();
    expect(names(TRASH)).toEqual(['a.txt', 'b.txt']);
  });
  test('records when, for the Trashed On column', () => {
    trash(fs, [`${D}/a.txt`]);
    expect(Date.parse(fs.stat(`${TRASH}/a.txt`)!.trashed!)).toBeGreaterThan(0);
  });
  test('toast text: the name for one, the count for more (nautilus-window.c)', () => {
    expect(trash(fs, [`${D}/a.txt`]).toast).toBe('“a.txt” moved to trash');
    expect(trash(fs, [`${D}/b.txt`, `${P}/a.txt`]).toast).toBe('2 files moved to trash');
  });
});

describe('restore', () => {
  test('goes back to where it came from; undo returns it to the Trash', () => {
    trash(fs, [`${D}/a.txt`]);
    const op = restore(fs, [`${TRASH}/a.txt`]);
    expect(names(D)).toContain('a.txt');
    expect(names(TRASH)).toEqual([]);
    expect([op.undoLabel, op.redoLabel]).toEqual(['Undo Restore From Trash', 'Redo Restore From Trash']);
    op.undo();
    expect(names(TRASH)).toEqual(['a.txt']);
    op.redo();
    expect(names(D)).toContain('a.txt');
  });
});

describe('restore, when things have changed since', () => {
  test('its folder has gone: the folder comes back too', () => {
    trash(fs, [`${D}/a.txt`, `${D}/b.txt`]);
    fs.remove(D);
    restore(fs, [`${TRASH}/a.txt`]);
    expect(fs.read(`${D}/a.txt`)).toBe('x');
  });
  test('its name has been taken: both are kept', () => {
    trash(fs, [`${D}/a.txt`]);
    fs.write(`${D}/a.txt`, 'newer');
    const op = restore(fs, [`${TRASH}/a.txt`]);
    expect(fs.read(`${D}/a.txt`)).toBe('newer');
    expect(fs.read(`${D}/a (Copy).txt`)).toBe('x');
    op.undo();
    expect(names(TRASH)).toEqual(['a (Copy).txt']);
  });
});

test('delete from the Trash and Empty Trash remove for good', () => {
  trash(fs, [`${D}/a.txt`, `${D}/b.txt`]);
  deleteFromTrash(fs, [`${TRASH}/a.txt`]);
  expect(names(TRASH)).toEqual(['b.txt']);
  emptyTrash(fs);
  expect(names(TRASH)).toEqual([]);
});

describe('rename', () => {
  test('undo and redo', () => {
    const op = rename(fs, `${D}/a.txt`, 'c.txt');
    expect(names(D)).toEqual(['b.txt', 'c.txt']);
    expect([op.undoLabel, op.redoLabel]).toEqual(['Undo Rename', 'Redo Rename']);
    expect(op.to).toBe(`${D}/c.txt`);
    op.undo();
    expect(names(D)).toEqual(['a.txt', 'b.txt']);
    op.redo();
    expect(names(D)).toEqual(['b.txt', 'c.txt']);
  });
});

describe('create folder', () => {
  test('undo removes it; redo makes it again', () => {
    const op = createFolder(fs, D, 'New');
    expect(fs.stat(`${D}/New`)?.kind).toBe('dir');
    expect([op.undoLabel, op.redoLabel]).toEqual(['Undo Create Folder', 'Redo Create Folder']);
    op.undo();
    expect(fs.exists(`${D}/New`)).toBe(false);
    op.redo();
    expect(fs.exists(`${D}/New`)).toBe(true);
  });
});

describe('paste', () => {
  test('a copy to another folder; the labels name the kind and count', () => {
    const op = paste(fs, P, { paths: [`${D}/b.txt`], cut: false })!;
    expect(names(P)).toEqual(['a.txt', 'b.txt']);
    expect(names(D)).toEqual(['a.txt', 'b.txt']);
    expect(op.created).toEqual([`${P}/b.txt`]);
    expect([op.undoLabel, op.redoLabel]).toEqual(['Undo Copy', 'Redo Copy']);
    op.undo();
    expect(names(P)).toEqual(['a.txt']);
    op.redo();
    expect(names(P)).toEqual(['a.txt', 'b.txt']);
  });
  test('several: the count in the label, with the plural', () => {
    const op = paste(fs, `${HOME}`, { paths: [`${D}/a.txt`, `${D}/b.txt`], cut: false })!;
    expect(op.undoLabel).toBe('Undo Copy 2 items');
  });
  test('a copy into its own folder is a Duplicate, named as Nautilus names it', () => {
    const op = paste(fs, D, { paths: [`${D}/a.txt`], cut: false })!;
    expect(names(D)).toEqual(['a (Copy).txt', 'a.txt', 'b.txt']);
    expect(op.undoLabel).toBe('Undo Duplicate');
    const again = paste(fs, D, { paths: [`${D}/a.txt`], cut: false })!;
    expect(again.created).toEqual([`${D}/a (Copy 2).txt`]);
    expect(paste(fs, D, { paths: [`${D}/a.txt`, `${D}/b.txt`], cut: false })!.undoLabel).toBe('Undo Duplicate 2 items');
  });
  test('a name already taken in another folder gets a new name, and nothing is lost', () => {
    paste(fs, P, { paths: [`${D}/a.txt`], cut: false });
    expect(names(P)).toEqual(['a (Copy).txt', 'a.txt']);
    expect(fs.read(`${P}/a.txt`)).toBe('other');
  });
  test('a cut moves; undo moves back; the labels say Move', () => {
    const op = paste(fs, P, { paths: [`${D}/b.txt`], cut: true })!;
    expect(names(P)).toEqual(['a.txt', 'b.txt']);
    expect(names(D)).toEqual(['a.txt']);
    expect([op.undoLabel, op.redoLabel]).toEqual(['Undo Move', 'Redo Move']);
    op.undo();
    expect(names(D)).toEqual(['a.txt', 'b.txt']);
    op.redo();
    expect(names(D)).toEqual(['a.txt']);
  });
  test('a cut with a name already taken keeps both', () => {
    paste(fs, P, { paths: [`${D}/a.txt`], cut: true });
    expect(names(P)).toEqual(['a (Copy).txt', 'a.txt']);
    expect(fs.read(`${P}/a.txt`)).toBe('other');
  });
  test('a cut into the folder it is in does nothing', () => {
    expect(paste(fs, D, { paths: [`${D}/a.txt`], cut: true })).toBeNull();
    expect(names(D)).toEqual(['a.txt', 'b.txt']);
  });
  test('things that have gone are skipped; a folder cannot go inside itself', () => {
    expect(paste(fs, P, { paths: [`${D}/gone.txt`], cut: false })).toBeNull();
    expect(paste(fs, `${D}`, { paths: [D], cut: true })).toBeNull();
    expect(names(HOME)).toContain('Documents');
  });
});
