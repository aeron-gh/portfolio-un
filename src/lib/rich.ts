export type RichToken =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'link'; text: string; href: string };

/**
 * Turns a tiny markup into tokens: **bold**, [text](href) and {var}.
 * No nesting. Unknown {var} names throw, so content typos break the build loudly.
 */
export function formatRich(input: string, vars: Record<string, string> = {}): RichToken[] {
  const filled = input.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!(name in vars)) throw new Error(`formatRich: missing variable "${name}"`);
    return vars[name];
  });

  const tokens: RichToken[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const m of filled.matchAll(pattern)) {
    const at = m.index ?? 0;
    if (at > last) tokens.push({ kind: 'text', text: filled.slice(last, at) });
    if (m[1] !== undefined) tokens.push({ kind: 'strong', text: m[1] });
    else tokens.push({ kind: 'link', text: m[2], href: m[3] });
    last = at + m[0].length;
  }
  if (last < filled.length) tokens.push({ kind: 'text', text: filled.slice(last) });
  return tokens;
}

export function toPlainText(tokens: RichToken[]): string {
  return tokens.map((t) => t.text).join('');
}
