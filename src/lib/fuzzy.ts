export type Command = { id: string; label: string; keywords?: string; hint?: string };

/** Higher is better. null means no match. prefix > word start > anywhere > letters in order. */
export function scoreMatch(text: string, query: string): number | null {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  if (t.startsWith(q)) return 1000 - t.length;
  const wordAt = t.indexOf(` ${q}`);
  if (wordAt >= 0) return 800 - wordAt;
  const at = t.indexOf(q);
  if (at >= 0) return 600 - at;
  let pos = -1;
  let gaps = 0;
  for (const ch of q) {
    const next = t.indexOf(ch, pos + 1);
    if (next < 0) return null;
    gaps += next - pos - 1;
    pos = next;
  }
  return 300 - gaps;
}

/** Matching commands, best first. Any label match ranks above any keyword-only match. Ties keep list order. */
export function filterCommands<T extends Command>(cmds: T[], query: string): T[] {
  return cmds
    .map((c, i) => {
      const label = scoreMatch(c.label, query);
      const keys = c.keywords ? scoreMatch(c.keywords, query) : null;
      const best = Math.max(label ?? -Infinity, keys === null ? -Infinity : keys - 1000);
      return { c, i, best };
    })
    .filter((x) => x.best > -Infinity)
    .sort((a, b) => b.best - a.best || a.i - b.i)
    .map((x) => x.c);
}
