import { describe, expect, test } from 'bun:test';
import { splitLetters, splitWords } from '../../src/lib/split';

describe('splitWords', () => {
  test('splits on any whitespace and drops empty parts', () => {
    expect(splitWords('  I work\non  compilers ')).toEqual(['I', 'work', 'on', 'compilers']);
  });

  test('blank text gives no words', () => {
    expect(splitWords('   ')).toEqual([]);
  });
});

describe('splitLetters', () => {
  test('one entry per visible character, spaces kept', () => {
    expect(splitLetters('Ab c')).toEqual(['A', 'b', ' ', 'c']);
  });

  test('an accented letter made of two code points stays together', () => {
    expect(splitLetters('éx')).toEqual(['é', 'x']);
  });
});
