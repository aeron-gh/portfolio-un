// PANGO_ELLIPSIZE_MIDDLE with a limit on lines (GtkLabel lines, ellipsize middle): the text wraps as usual, and what will
// not fit on the last line loses its middle. CSS can only cut at the end. A cut name gets a "\n" between its lines.
const MARK = '…';

/** How many characters of `text` fit in `width`. */
function fitting(text: string, width: number, measure: (s: string) => number): number {
  let [low, high] = [0, text.length];
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (measure(text.slice(0, mid)) <= width) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** PANGO_WRAP_WORD_CHAR: at a space or hyphen if there is one on the line, or else between characters. */
function firstLine(text: string, width: number, measure: (s: string) => number): number {
  const n = Math.max(1, fitting(text, width, measure));
  if (n >= text.length) return n;
  const breaks = [...text.slice(0, n + 1).matchAll(/[\s-]/g)].map((m) => m.index + 1);
  const last = breaks.filter((at) => at <= n).at(-1);
  return last ?? n;
}

function cutMiddle(text: string, width: number, measure: (s: string) => number): string {
  const room = width - measure(MARK);
  if (room <= 0) return MARK;
  const start = fitting(text, room / 2, measure);
  const used = measure(text.slice(0, start));
  let end = 0;
  while (end < text.length - start && used + measure(text.slice(text.length - end - 1)) <= room) end++;
  return text.slice(0, start) + MARK + text.slice(text.length - end);
}

export function ellipsize(text: string, lines: number, width: number, measure: (s: string) => number): string {
  if (width <= 0) return text;
  const kept: string[] = [];
  let rest = text;
  while (kept.length < lines - 1 && measure(rest) > width) {
    const n = firstLine(rest, width, measure);
    kept.push(rest.slice(0, n).trimEnd());
    rest = rest.slice(n);
  }
  if (measure(rest) <= width) return text;
  return [...kept, cutMiddle(rest, width, measure)].join('\n');
}
