// Markdown highlighting as GtkSourceView 5.18 does it (data/language-specs/markdown.lang): the same contexts in the same
// order. At each point the earliest match wins, and the first listed among equals; then the scan goes on after it.
// Styles are the def: styles the language maps to; the Adwaita scheme colours them (theme/editor CSS).

export type Style =
  | 'heading' | 'list-marker' | 'inline-code' | 'preformatted-section' | 'shebang' | 'link-text' | 'link-destination'
  | 'preprocessor' | 'constant' | 'emphasis' | 'strong-emphasis' | 'special-char' | 'note';
export type Span = { from: number; to: number; style: Style };

type Rule = { re: RegExp; style?: Style; groups?: Partial<Record<number, Style>>; kind?: 'fence' | 'quote' };

// Contexts a blockquote line may hold (markdown.lang "blockquote" includes).
const INLINE: Rule[] = [
  { re: /(?<!`)`[^`]+(`{2,}[^`]+)*`(?!`)/dg, style: 'inline-code' },
  { re: /(?<!`)``[^`]+((`|`{3,})[^`]+)*``(?!`)/dg, style: 'inline-code' },
  { re: /<(((mailto:)?[a-z0-9.-]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)|((https?|ftp):[^'">\s]+))>/dgi, groups: { 1: 'link-destination' } },
  { re: /\[(.*?)\]\([ \t]*(<(.*?)>|(.*?))([ \t]+(".*?"))?[ \t]*\)/dg, groups: { 1: 'link-text', 3: 'link-destination', 4: 'link-destination', 6: 'constant' } },
  { re: /(?<!^ |^ {2}|^ {3})\[(.*?)\]([ \t]?\[(.*?)\])?(?!:)/dg, groups: { 1: 'link-text', 3: 'preprocessor' } },
  { re: /(!)\[(.*?)\][ ]?\([ \t]*(<([^ \t]*?)>|([^ \t]*?))([ \t]+(".*?"))?[ \t]*\)/dg, groups: { 2: 'constant', 4: 'link-destination', 5: 'link-destination', 6: 'constant' } },
  { re: /(!)\[(.*?)\] ?\[(.*?)\]/dg, groups: { 2: 'constant', 3: 'preprocessor' } },
  { re: /(?<!_)_[^_ \t].*?(?<!\\|_| |\t)_(?!_)/dg, style: 'emphasis' },
  { re: /(?<!\*)\*[^* \t].*?(?<!\\|\*| |\t)\*(?!\*)/dg, style: 'emphasis' },
  { re: /__[^_ \t].*?(?<!\\|_| |\t)__/dg, style: 'strong-emphasis' },
  { re: /\*\*[^* \t].*?(?<!\\|\*| |\t)\*\*/dg, style: 'strong-emphasis' },
  { re: /\\[\\`*_{}[\]()#+-.!]/dg, style: 'special-char' },
  { re: /(?<=[^ \t])([ \t]{2,})$/dg, groups: { 1: 'note' } },
];
const [CODE1, CODE2, AUTOLINK, INLINE_LINK, REF_LINK, INLINE_IMAGE, REF_IMAGE, ...EMPHASIS_TO_BREAK] = INLINE;

// "markdown-syntax": the order matters.
const RULES: Rule[] = [
  { re: /^#+.+/dg, style: 'heading' },
  { re: /^(-+|=+)[ \t]*$/dg, style: 'heading' },
  { re: /^[ ]{0,3}((-[ ]{0,2}){3,}|(_[ ]{0,2}){3,}|(\*[ ]{0,2}){3,})[ \t]*$/dg }, // def:thematic-break: no colour in Adwaita
  { re: /^[ ]{0,3}(\*|\+|-|[0-9]+\.)[ \t]+/dg, style: 'list-marker' },
  { re: /^( {8,}|\t{2,})([^ \t]+.*)/dg, groups: { 2: 'preformatted-section' } },
  CODE1,
  CODE2,
  { re: /^```.*$/dg, kind: 'fence' },
  { re: /^( {0,3}>(?=.)( {0,4}>)*)/dg, groups: { 1: 'shebang' }, kind: 'quote' },
  AUTOLINK,
  INLINE_LINK,
  REF_LINK,
  { re: /^[ ]{0,3}\[(.+?)\]:[ \t]*(<([^ \t]+?)>|([^ \t]+?))([ \t]+(".*?"))?[ \t]*$/dg, groups: { 1: 'preprocessor', 3: 'link-destination', 4: 'link-destination', 6: 'constant' } },
  INLINE_IMAGE,
  REF_IMAGE,
  ...EMPHASIS_TO_BREAK,
];

/** The earliest match at or after `pos`; the first rule wins a tie. */
function next(line: string, pos: number, rules: Rule[]): { rule: Rule; m: RegExpExecArray } | null {
  let best: { rule: Rule; m: RegExpExecArray } | null = null;
  for (const rule of rules) {
    rule.re.lastIndex = pos;
    const m = rule.re.exec(line);
    if (m && (!best || m.index < best.m.index)) best = { rule, m };
  }
  return best;
}

function scan(line: string, offset: number, from: number, rules: Rule[], out: Span[]): Rule | null {
  let pos = from;
  while (pos <= line.length) {
    const hit = next(line, pos, rules);
    if (!hit) return null;
    const { rule, m } = hit;
    if (rule.kind === 'fence') return rule;
    if (rule.style) out.push({ from: offset + m.index, to: offset + m.index + m[0].length, style: rule.style });
    for (const [g, style] of Object.entries(rule.groups ?? {})) {
      const at = m.indices?.[Number(g)];
      if (at && style && at[1] > at[0]) out.push({ from: offset + at[0], to: offset + at[1], style });
    }
    const end = m.index + m[0].length;
    if (rule.kind === 'quote') {
      scan(line, offset, end, INLINE, out); // the rest of the line, with what a quote may hold
      return null;
    }
    pos = end > m.index ? end : end + 1;
  }
  return null;
}

/** Styled stretches of `text`, in order. Plain text is left out. */
export function highlight(text: string): Span[] {
  const out: Span[] = [];
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (scan(line, offset, 0, RULES, out)) {
      // A fence: everything up to and including the closing ``` line is preformatted.
      const start = offset;
      let j = i;
      let end = offset + line.length;
      while (++j < lines.length) {
        end += 1 + lines[j].length;
        if (lines[j] === '```') break;
      }
      out.push({ from: start, to: Math.min(end, text.length), style: 'preformatted-section' });
      for (let k = i; k <= Math.min(j, lines.length - 1); k++) offset += lines[k].length + 1;
      i = j;
      continue;
    }
    offset += line.length + 1;
  }
  return out;
}
