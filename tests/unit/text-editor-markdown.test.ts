import { describe, expect, test } from 'bun:test';
import { highlight } from '../../src/desktop/apps/text-editor/markdown';

// Each span is [text, style]; plain text between spans is left out.
const spans = (md: string) => highlight(md).map((s) => [md.slice(s.from, s.to), s.style]);

describe('Markdown highlighting (GtkSourceView 5 markdown.lang)', () => {
  test('ATX and setext headings, list markers and rules', () => {
    expect(spans('# Welcome\n')).toEqual([['# Welcome', 'heading']]);
    expect(spans('Title\n=====\n')).toEqual([['=====', 'heading']]);
    expect(spans('- item\n1. first\n')).toEqual([['- ', 'list-marker'], ['1. ', 'list-marker']]);
    expect(spans('- - -\n')).toEqual([]); // a thematic break: its style is not in the Adwaita scheme
  });

  test('code spans, fenced and indented code', () => {
    expect(spans('try `cat ~/x`.')).toEqual([['`cat ~/x`', 'inline-code']]);
    expect(spans('``a ` b``')).toEqual([['``a ` b``', 'inline-code']]);
    expect(spans('```\nlet x\n```\nafter')).toEqual([['```\nlet x\n```', 'preformatted-section']]);
    expect(spans('        indented code')).toEqual([['indented code', 'preformatted-section']]);
  });

  test('links, automatic links and images', () => {
    expect(spans('see [docs](https://x.dev "T")')).toEqual([['docs', 'link-text'], ['https://x.dev', 'link-destination'], ['"T"', 'constant']]);
    expect(spans('<https://x.dev/>')).toEqual([['https://x.dev/', 'link-destination']]);
    // reference-link ends with (?!:), so a label followed by a colon is a link definition instead.
    expect(spans('[label]: https://x.dev')).toEqual([['label', 'preprocessor'], ['https://x.dev', 'link-destination']]);
    // The image starts at the "!", before the link could start at "[": the earliest match wins. "!" has no style here.
    expect(spans('![alt](pic.png)')).toEqual([['alt', 'constant'], ['pic.png', 'link-destination']]);
  });

  test('emphasis, strong emphasis, escapes, quotes and hard line breaks', () => {
    expect(spans('an *em* and **strong**')).toEqual([['*em*', 'emphasis'], ['**strong**', 'strong-emphasis']]);
    expect(spans('_a_ __b__')).toEqual([['_a_', 'emphasis'], ['__b__', 'strong-emphasis']]);
    expect(spans('a \\* b')).toEqual([['\\*', 'special-char']]);
    expect(spans('> quoted `code`')).toEqual([['>', 'shebang'], ['`code`', 'inline-code']]);
    expect(spans('end  ')).toEqual([['  ', 'note']]);
  });

  test("the desktop's README", () => {
    const md = "# Welcome to Abhishek's computer\n\nThis is Ubuntu.\n\n- Documents/about.md: who I am\n- Terminal: try `cat ~/Documents/contact.md`\n";
    expect(spans(md)).toEqual([
      ["# Welcome to Abhishek's computer", 'heading'],
      ['- ', 'list-marker'],
      ['- ', 'list-marker'],
      ['`cat ~/Documents/contact.md`', 'inline-code'],
    ]);
  });
});
