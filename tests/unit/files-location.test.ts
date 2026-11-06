import { describe, expect, test } from 'bun:test';
import { commonPrefix, completions, typedLocation } from '../../src/desktop/apps/files/location';

const dirs: Record<string, { name: string; dir: boolean }[]> = {
  '/': [{ name: 'bin', dir: true }, { name: 'etc', dir: true }, { name: 'home', dir: true }],
  '/home/ubuntu': [
    { name: 'Desktop', dir: true },
    { name: 'Documents', dir: true },
    { name: 'Downloads', dir: true },
    { name: 'notes.txt', dir: false },
    { name: '.bashrc', dir: false },
    { name: '.config', dir: true },
  ],
  '/home/ubuntu/Documents': [{ name: 'about.md', dir: false }],
};
const list = (path: string) => dirs[path] ?? null;
const HOME = '/home/ubuntu';
const c = (typed: string, current = HOME) => completions(typed, current, list);

describe('completions (completer_get_completions_thread)', () => {
  test('names in the current folder, folders with a slash', () => {
    expect(c('Do')).toEqual(['Documents/', 'Downloads/']);
    expect(c('n')).toEqual(['notes.txt']);
  });
  test('case does not matter', () => {
    expect(c('do')).toEqual(['Documents/', 'Downloads/']);
  });
  test('hidden names only once a dot is typed', () => {
    expect(c('.')).toEqual(['.bashrc', '.config/']);
    expect(c('~/')).not.toContain('~/.bashrc');
  });
  test('an absolute path keeps what was typed in front', () => {
    expect(c('/')).toEqual(['/bin/', '/etc/', '/home/']);
    expect(c('/e')).toEqual(['/etc/']);
  });
  test('~/ means home', () => {
    expect(c('~/Do')).toEqual(['~/Documents/', '~/Downloads/']);
    expect(c('~/Documents/a')).toEqual(['~/Documents/about.md']);
  });
  test('a path relative to the current folder', () => {
    expect(c('Documents/a')).toEqual(['Documents/about.md']);
    expect(c('a', `${HOME}/Documents`)).toEqual(['about.md']);
  });
  test('a folder that cannot be read has nothing to offer', () => {
    expect(c('/nope/x')).toEqual([]);
  });
});

test('commonPrefix: what every completion starts with (gtk_entry_completion_insert_prefix)', () => {
  expect(commonPrefix(['Documents/', 'Downloads/'])).toBe('Do');
  expect(commonPrefix(['Documents/'])).toBe('Documents/');
  expect(commonPrefix([])).toBe('');
});

describe('typedLocation: what the text means (g_file_parse_name)', () => {
  const at = (t: string) => typedLocation(t, HOME);
  test('absolute, ~ and relative to home', () => {
    expect(at('/etc/skel')).toBe('/etc/skel');
    expect(at('~')).toBe(HOME);
    expect(at('~/Documents')).toBe(`${HOME}/Documents`);
    expect(at('Documents')).toBe(`${HOME}/Documents`);
  });
  test('tidied', () => {
    expect(at('/etc/')).toBe('/etc');
    expect(at('  /etc  ')).toBe('/etc');
    expect(at('/etc/../home')).toBe('/home');
  });
});
