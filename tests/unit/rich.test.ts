import { describe, expect, test } from 'bun:test';
import { formatRich, toPlainText } from '../../src/lib/rich';

describe('formatRich', () => {
  test('plain text is one text token', () => {
    expect(formatRich('Hello there')).toEqual([{ kind: 'text', text: 'Hello there' }]);
  });

  test('bold and links become their own tokens, in order', () => {
    expect(formatRich('A **b** [c](https://c.dev) d')).toEqual([
      { kind: 'text', text: 'A ' },
      { kind: 'strong', text: 'b' },
      { kind: 'text', text: ' ' },
      { kind: 'link', text: 'c', href: 'https://c.dev' },
      { kind: 'text', text: ' d' },
    ]);
  });

  test('variables are filled in, including inside bold', () => {
    expect(formatRich('Since {since}, **{total} merged**', { since: 'June', total: '70+' })).toEqual([
      { kind: 'text', text: 'Since June, ' },
      { kind: 'strong', text: '70+ merged' },
    ]);
  });

  test('a missing variable is a loud error, not a silent blank', () => {
    expect(() => formatRich('Since {since}', {})).toThrow('missing variable "since"');
  });

  test('brackets that are not a link stay as text', () => {
    expect(formatRich('see [this] (ok)')).toEqual([{ kind: 'text', text: 'see [this] (ok)' }]);
  });
});

describe('toPlainText', () => {
  test('drops formatting and keeps the words', () => {
    expect(toPlainText(formatRich('A **b** [c](https://c.dev)'))).toBe('A b c');
  });
});
