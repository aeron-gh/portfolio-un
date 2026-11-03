import { describe, expect, test } from 'bun:test';
import { ellipsize } from '../../src/desktop/apps/files/ellipsize';

const chars = (s: string) => s.length; // every character one unit wide

describe('ellipsize: PANGO_ELLIPSIZE_MIDDLE, on the last line allowed', () => {
  test('what fits is left alone', () => {
    expect(ellipsize('short.md', 1, 20, chars)).toBe('short.md');
    expect(ellipsize('fits on two lines', 3, 10, chars)).toBe('fits on two lines');
  });
  test('one line: cut in the middle, keeping both ends', () => {
    expect(ellipsize('abcdefghijklmnopqrstuvwxyz', 1, 11, chars)).toBe('abcde…vwxyz');
    expect(ellipsize('a-very-long-name-of-a-file.pdf', 1, 15, chars)).toBe('a-very-…ile.pdf');
  });
  test('three lines: the first two fill up, the third is cut in the middle', () => {
    expect(ellipsize('abcdefghijklmnopqrstuvwxyz0123456789', 3, 10, chars)).toBe('abcdefghij\nklmnopqrst\nuvwx…56789'.replace('uvwx…56789', 'uvwx…56789'));
  });
  test('words stay whole where they can', () => {
    expect(ellipsize('holiday photos from the summer of two thousand and twenty', 2, 12, chars).split('\n')[0]).toBe('holiday');
  });
  test('no room at all shows just the mark', () => {
    expect(ellipsize('abcdef', 1, 1, chars)).toBe('…');
  });
  test('nothing to measure against leaves the text alone', () => {
    expect(ellipsize('abcdef', 1, 0, chars)).toBe('abcdef');
  });
});
