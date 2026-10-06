/** Words of a sentence. Any run of whitespace separates words. */
export function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Visible characters ("graphemes"), so accents and emoji are never cut in half. */
export function splitLetters(text: string): string[] {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(seg.segment(text), (s) => s.segment);
}
