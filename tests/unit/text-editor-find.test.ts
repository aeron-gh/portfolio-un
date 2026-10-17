import { describe, expect, test } from 'bun:test';
import { findAll, replaceAll, step } from '../../src/desktop/apps/text-editor/find';

const plain = { regex: false, caseSensitive: false, wholeWord: false };
const at = (text: string, q: string, o = plain) => findAll(text, q, o).map((m) => text.slice(m.from, m.to));

describe('finding (GtkSourceSearchSettings defaults: not case sensitive, plain text, whole words off)', () => {
  test('plain text, any case, every match', () => {
    expect(at('Ubuntu ubuntu UBUNTU', 'ubuntu')).toEqual(['Ubuntu', 'ubuntu', 'UBUNTU']);
    expect(at('a.b axb', 'a.b')).toEqual(['a.b']); // a dot is just a dot
    expect(at('abc', '')).toEqual([]);
  });
  test('case sensitive, whole words, regular expressions', () => {
    expect(at('Ubuntu ubuntu', 'ubuntu', { ...plain, caseSensitive: true })).toEqual(['ubuntu']);
    expect(at('cat category cat.', 'cat', { ...plain, wholeWord: true })).toEqual(['cat', 'cat']);
    expect(at('a1 b22 c', '[a-z]\\d+', { ...plain, regex: true })).toEqual(['a1', 'b22']);
    expect(at('(oops', '(', { ...plain, regex: true })).toEqual([]); // a broken pattern finds nothing
  });
});

describe('moving between matches (wraps round)', () => {
  const m = findAll('x x x', 'x', plain); // at 0, 2, 4
  test('next is the first match starting at or after the position; previous the last ending at or before it', () => {
    expect(step(m, 1, 1)).toBe(1);
    expect(step(m, 4, 1)).toBe(2); // a match starting right where the search starts counts
    expect(step(m, 5, 1)).toBe(0); // past the last: back to the first
    expect(step(m, 2, -1)).toBe(0);
    expect(step(m, 0, -1)).toBe(2); // before the first: round to the last
    expect(step([], 0, 1)).toBe(-1);
  });
});

describe('Replace All', () => {
  test('replaces every match and says how many', () => {
    expect(replaceAll('a A a', 'a', 'b', plain)).toEqual({ text: 'b b b', count: 3 });
    expect(replaceAll('x1 x22', 'x(\\d+)', 'y\\1', { ...plain, regex: true })).toEqual({ text: 'y1 y22', count: 2 });
  });
});
