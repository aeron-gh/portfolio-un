import { describe, expect, test } from 'bun:test';
import { HOME, TRASH, type FsNode } from '../../src/desktop/fs/vfs';
import { iconFor } from '../../src/desktop/shell/file-icons';
import { fromFolder } from '../../src/desktop/apps/files/places';

const dir = { name: 'x', kind: 'dir', size: 0, mtime: '' } as FsNode;
const file = (mime: string) => ({ name: 'x', kind: 'file', mime, size: 0, mtime: '' }) as FsNode;

describe('iconFor: the icon a real Ubuntu shows', () => {
  test('the special folders of a home folder', () => {
    expect(iconFor(HOME, dir)).toBe('user-home');
    expect(iconFor(`${HOME}/Desktop`, dir)).toBe('user-desktop');
    expect(iconFor(`${HOME}/Documents`, dir)).toBe('folder-documents');
    expect(iconFor(`${HOME}/Downloads`, dir)).toBe('folder-download');
    expect(iconFor(`${HOME}/Music`, dir)).toBe('folder-music');
    expect(iconFor(`${HOME}/Pictures`, dir)).toBe('folder-pictures');
    expect(iconFor(`${HOME}/Public`, dir)).toBe('folder-publicshare');
    expect(iconFor(`${HOME}/Templates`, dir)).toBe('folder-templates');
    expect(iconFor(`${HOME}/Videos`, dir)).toBe('folder-videos');
    expect(iconFor(TRASH, dir)).toBe('user-trash');
  });
  test('any other folder', () => {
    expect(iconFor(`${HOME}/Projects`, dir)).toBe('folder');
    expect(iconFor(`${HOME}/Documents/Documents`, dir)).toBe('folder');
  });
  test('files by type, with the generic icon shared-mime-info names', () => {
    expect(iconFor('/a', file('text/markdown'))).toBe('text-markdown');
    expect(iconFor('/a', file('application/pdf'))).toBe('application-pdf');
    expect(iconFor('/a', file('image/avif'))).toBe('image-x-generic');
    expect(iconFor('/a', file('text/x-shellscript'))).toBe('text-x-script');
    expect(iconFor('/a', file('text/javascript'))).toBe('application-javascript');
    expect(iconFor('/a', file('application/json'))).toBe('application-json');
    expect(iconFor('/a', file('application/x-desktop'))).toBe('application-x-desktop');
    expect(iconFor('/a', file('application/octet-stream'))).toBe('application-octet-stream');
    expect(iconFor('/a', file('text/plain'))).toBe('text-x-generic');
  });
});

describe('fromFolder: going up selects the folder you came from (nautilus-window-slot.c)', () => {
  test('one level and several levels', () => {
    expect(fromFolder('/a/b', '/a')).toBe('/a/b');
    expect(fromFolder('/a/b/c/d', '/a')).toBe('/a/b');
    expect(fromFolder('/a/b', '/')).toBe('/a');
  });
  test('nothing when the new place is not above the old one', () => {
    expect(fromFolder('/a', '/a/b')).toBeNull();
    expect(fromFolder('/a/b', '/a/c')).toBeNull();
    expect(fromFolder('/a', '/a')).toBeNull();
    expect(fromFolder('/ab', '/a')).toBeNull(); // a shared start of the name is not a parent
  });
  test('special places have no parents', () => {
    expect(fromFolder('recent:///', '/')).toBeNull();
    expect(fromFolder('/a', 'recent:///')).toBeNull();
  });
});
