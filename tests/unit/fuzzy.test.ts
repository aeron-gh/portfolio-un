import { describe, expect, test } from 'bun:test';
import { filterCommands } from '../../src/lib/fuzzy';

const cmds = [
  { id: 'boot', label: 'Boot Ubuntu machine', keywords: 'desktop start' },
  { id: 'email', label: 'Copy email', keywords: 'contact mail' },
  { id: 'go-contact', label: 'Go to Contact' },
  { id: 'go-oss', label: 'Go to Open source' },
  { id: 'theme-dark', label: 'Theme: Dark' },
  { id: 'theme-light', label: 'Theme: Light' },
];

describe('filterCommands', () => {
  test('a blank query keeps the original order', () => {
    expect(filterCommands(cmds, '  ').map((c) => c.id)).toEqual(cmds.map((c) => c.id));
  });

  test('prefix matches come first, shorter label first', () => {
    expect(filterCommands(cmds, 'go').map((c) => c.id)).toEqual(['go-contact', 'go-oss']);
  });

  test('a word-start match is found', () => {
    expect(filterCommands(cmds, 'dark')[0].id).toBe('theme-dark');
  });

  test('letters in order match, tightest first', () => {
    const ids = filterCommands(cmds, 'gtc').map((c) => c.id);
    expect(ids[0]).toBe('go-contact');
  });

  test('any label match beats any keyword match', () => {
    expect(filterCommands(cmds, 'contact')[0].id).toBe('go-contact');
  });

  test('keywords match too', () => {
    expect(filterCommands(cmds, 'desktop').map((c) => c.id)).toEqual(['boot']);
  });

  test('case does not matter', () => {
    expect(filterCommands(cmds, 'COPY')[0].id).toBe('email');
  });

  test('no match gives an empty list', () => {
    expect(filterCommands(cmds, 'zzz')).toEqual([]);
  });
});
