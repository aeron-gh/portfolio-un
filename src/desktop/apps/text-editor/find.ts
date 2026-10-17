// Finding and replacing in a document, as GtkSourceSearchContext does with Text Editor's search settings: not case
// sensitive, plain text, whole words off by default; moving wraps round; regex replacements use \0 … \9.

export type FindOptions = { regex: boolean; caseSensitive: boolean; wholeWord: boolean };
export type Match = { from: number; to: number };

function pattern(query: string, o: FindOptions): RegExp | null {
  if (!query) return null;
  let source = o.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (o.wholeWord) source = `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`;
  try {
    return new RegExp(source, `gmu${o.caseSensitive ? '' : 'i'}`);
  } catch {
    return null; // a pattern that is still being typed finds nothing
  }
}

export function findAll(text: string, query: string, o: FindOptions): Match[] {
  const re = pattern(query, o);
  if (!re) return [];
  const out: Match[] = [];
  for (const m of text.matchAll(re)) if (m[0].length) out.push({ from: m.index, to: m.index + m[0].length });
  return out;
}

/** Forward: the first match starting at or after `from`; backward: the last ending at or before it. Wraps round. */
export function step(matches: Match[], from: number, dir: 1 | -1): number {
  if (!matches.length) return -1;
  if (dir === 1) {
    const i = matches.findIndex((m) => m.from >= from);
    return i < 0 ? 0 : i;
  }
  for (let i = matches.length - 1; i >= 0; i--) if (matches[i].to <= from) return i;
  return matches.length - 1;
}

/** The replacement text: literal, or with \0 … \9 for the match and its groups when searching by regular expression. */
export function replacement(text: string, regex: boolean): string {
  return regex ? text.replace(/\$/g, '$$$$').replace(/\\(\d)/g, (_, d: string) => (d === '0' ? '$&' : `$${d}`)) : text.replace(/\$/g, '$$$$');
}

export function replaceAll(text: string, query: string, by: string, o: FindOptions): { text: string; count: number } {
  const re = pattern(query, o);
  if (!re) return { text, count: 0 };
  let count = 0;
  const out = text.replace(re, (...args) => {
    count++;
    return (args[0] as string).replace(new RegExp(re.source, re.flags.replace('g', '')), replacement(by, o.regex));
  });
  return { text: out, count };
}
