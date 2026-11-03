import { describe, expect, test } from 'bun:test';
import { checkName, nameEnd } from '../../src/desktop/apps/files/names';

const none = () => false;
const taken = (...names: string[]) => (n: string) => names.includes(n);

describe('checkName (nautilus-filename-validator.c)', () => {
  test('empty is not accepted and says nothing', () => {
    expect(checkName('', { folder: true, exists: none })).toEqual({ passed: false, feedback: null, duplicate: false });
    expect(checkName('   ', { folder: true, exists: none })).toEqual({ passed: false, feedback: null, duplicate: false });
  });
  test('a good name passes', () => {
    expect(checkName('Reports', { folder: true, exists: none })).toEqual({ passed: true, feedback: null, duplicate: false });
  });
  test('spaces at the ends do not count', () => {
    expect(checkName('  Reports ', { folder: true, exists: taken('Reports') }).duplicate).toBe(true);
  });
  test('the real messages, for folders and for files', () => {
    expect(checkName('a/b', { folder: true, exists: none }).feedback).toBe('Folder names cannot contain “/”');
    expect(checkName('a/b', { folder: false, exists: none }).feedback).toBe('File names cannot contain “/”');
    expect(checkName('.', { folder: true, exists: none }).feedback).toBe('A folder cannot be called “.”');
    expect(checkName('..', { folder: false, exists: none }).feedback).toBe('A file cannot be called “..”');
    expect(checkName('x'.repeat(256), { folder: true, exists: none }).feedback).toBe('Folder name is too long');
    expect(checkName('x'.repeat(256), { folder: true, exists: none }).passed).toBe(false);
    expect(checkName('x'.repeat(255), { folder: true, exists: none }).passed).toBe(true);
    expect(checkName('é'.repeat(128), { folder: true, exists: none }).passed).toBe(false); // the limit is in bytes
  });
  test('a leading dot is allowed, with a warning about what it does', () => {
    expect(checkName('.secret', { folder: true, exists: none })).toEqual({
      passed: true,
      feedback: 'Folders with “.” at the beginning of their name are hidden',
      duplicate: false,
    });
    expect(checkName('.secret', { folder: false, exists: none }).feedback).toBe('Files with “.” at the beginning of their name are hidden');
  });
  test('a name already in use does not pass', () => {
    expect(checkName('Reports', { folder: true, exists: taken('Reports') })).toEqual({ passed: false, feedback: null, duplicate: true });
  });
  test('renaming: the old name itself is not a clash', () => {
    expect(checkName('a.txt', { folder: false, exists: taken('a.txt'), original: 'a.txt' })).toEqual({ passed: true, feedback: null, duplicate: false });
  });
});

describe('nameEnd: where the name stops and the extension starts (nautilus_filename_get_extension)', () => {
  test('the last dot', () => {
    expect(nameEnd('report.pdf')).toBe(6);
    expect(nameEnd('my.report.pdf')).toBe(9);
  });
  test('no extension', () => {
    expect(nameEnd('README')).toBe(6);
    expect(nameEnd('trailing.')).toBe(9);
  });
  test('a leading dot is part of the name', () => {
    expect(nameEnd('.bashrc')).toBe(7);
    expect(nameEnd('.config.old')).toBe(7);
  });
  test('whitespace means it is not an extension', () => {
    expect(nameEnd('Mr. Smith')).toBe(9);
  });
  test('.tar.* counts as one extension', () => {
    expect(nameEnd('backup.tar.gz')).toBe(6);
  });
});
