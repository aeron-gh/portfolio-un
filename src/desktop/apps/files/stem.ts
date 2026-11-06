// Snowball's English stemmer as Ubuntu ships it (libstemmer 3.0.1, algorithms/english.sbl), which the search index runs
// on every word it stores and every word it is asked for. Ported rule by rule; the comments name the Snowball routines.
// Translated from Snowball, whose licence follows at the end of this file.

const isV = (c: string | undefined) => c !== undefined && 'aeiouy'.includes(c);
const isVWXY = (c: string | undefined) => isV(c) || c === 'w' || c === 'x' || c === 'Y';

/** The longest of `list` that ends at `end` (Snowball's `substring ... among` going backwards). */
function suffix(w: string[], end: number, list: readonly string[]): string | null {
  let best: string | null = null;
  for (const s of list) {
    const chars = [...s];
    if (chars.length > end || (best !== null && chars.length <= [...best].length)) continue;
    if (chars.every((c, i) => w[end - chars.length + i] === c)) best = s;
  }
  return best;
}
const len = (s: string) => [...s].length;
const replace = (w: string[], start: number, by: string) => [...w.slice(0, start), ...by];

/** shortv: a short syllable ends at `at`. */
const shortv = (w: string[], at: number) =>
  (at >= 3 && !isVWXY(w[at - 1]) && isV(w[at - 2]) && !isV(w[at - 3])) || (at === 2 && !isV(w[at - 1]) && isV(w[at - 2])) || suffix(w, at, ['past']) !== null;

const EXCEPTIONS: Record<string, string> = {
  skies: 'sky', idly: 'idl', gently: 'gentl', ugly: 'ugli', early: 'earli', only: 'onli', singly: 'singl',
  sky: 'sky', news: 'news', howe: 'howe', atlas: 'atlas', cosmos: 'cosmos', bias: 'bias', andes: 'andes',
};
const PREFIXES = ['gener', 'commun', 'arsen', 'past', 'univers', 'later', 'emerg', 'organ'];

/** mark_regions: where R1 and R2 begin. */
function regions(w: string[]): [number, number] {
  const gopast = (from: number, test: (c: string) => boolean) => {
    for (let i = from; i < w.length; i++) if (test(w[i])) return i + 1;
    return -1;
  };
  const vowelThenNot = (from: number) => {
    const v = gopast(from, isV);
    return v < 0 ? -1 : gopast(v, (c) => !isV(c));
  };
  const prefix = PREFIXES.find((p) => w.slice(0, len(p)).join('') === p);
  const p1 = prefix ? len(prefix) : vowelThenNot(0);
  if (p1 < 0) return [w.length, w.length];
  const p2 = vowelThenNot(p1);
  return [p1, p2 < 0 ? w.length : p2];
}

function step1a(w: string[]): string[] {
  const apostrophe = suffix(w, w.length, ["'", "'s", "'s'"]);
  if (apostrophe) w = w.slice(0, w.length - len(apostrophe));
  const s = suffix(w, w.length, ['sses', 'ied', 'ies', 's', 'us', 'ss']);
  if (!s) return w;
  const start = w.length - len(s);
  if (s === 'sses') return replace(w, start, 'ss');
  if (s === 'ied' || s === 'ies') return replace(w, start, start >= 2 ? 'i' : 'ie');
  // 's': next gopast v delete — a vowel somewhere before the letter in front of it.
  if (s === 's' && start >= 1 && w.slice(0, start - 1).some(isV)) return w.slice(0, start);
  return w;
}

function step1b(w: string[], p1: number): string[] {
  const s = suffix(w, w.length, ['eed', 'eedly', 'ed', 'edly', 'ingly', 'ing', ''])!;
  const start = w.length - len(s);
  if (s === '') return w;
  if (s === 'eed' || s === 'eedly') {
    const pre = suffix(w, start, ['proc', 'exc', 'succ']);
    if (pre && start === len(pre)) return w;
    return start >= p1 ? replace(w, start, 'ee') : w;
  }
  if (s === 'ing') {
    const pre = suffix(w, start, ['y', 'inn', 'out', 'cann', 'herr', 'earr', 'even']);
    if (pre === 'y' && start === 2 && !isV(w[0])) return replace(w, start - 1, 'ie'); // dying, lying, tying, vying
    if (pre && pre !== 'y' && start === len(pre)) return w; // inning, outing, canning…
  }
  // ed, edly, ing, ingly: gone if a vowel comes before them, then the stem is tidied.
  if (!w.slice(0, start).some(isV)) return w;
  w = w.slice(0, start);
  const end = w.length;
  const tail = suffix(w, end, ['at', 'bl', 'iz', 'bb', 'dd', 'ff', 'gg', 'mm', 'nn', 'pp', 'rr', 'tt', ''])!;
  if (tail === 'at' || tail === 'bl' || tail === 'iz') return [...w, 'e'];
  if (tail !== '') return end === 3 && 'aeo'.includes(w[0]) ? w : w.slice(0, -1);
  return end === p1 && shortv(w, end) ? [...w, 'e'] : w;
}

function step1c(w: string[]): string[] {
  const n = w.length;
  return (w[n - 1] === 'y' || w[n - 1] === 'Y') && n >= 3 && !isV(w[n - 2]) ? replace(w, n - 1, 'i') : w;
}

const STEP2: Record<string, string> = {
  tional: 'tion', enci: 'ence', anci: 'ance', abli: 'able', entli: 'ent', izer: 'ize', ization: 'ize', ational: 'ate', ation: 'ate',
  ator: 'ate', alism: 'al', aliti: 'al', alli: 'al', fulness: 'ful', ousli: 'ous', ousness: 'ous', iveness: 'ive', iviti: 'ive',
  biliti: 'ble', bli: 'ble', ogist: 'og', ogi: 'og', fulli: 'ful', lessli: 'less', li: '',
};
function step2(w: string[], p1: number): string[] {
  const s = suffix(w, w.length, Object.keys(STEP2));
  const start = s ? w.length - len(s) : -1;
  if (!s || start < p1) return w;
  if (s === 'ogi') return w[start - 1] === 'l' ? replace(w, start, 'og') : w;
  if (s === 'li') return 'cdeghkmnrt'.includes(w[start - 1] ?? '-') ? w.slice(0, start) : w;
  return replace(w, start, STEP2[s]);
}

const STEP3: Record<string, string> = { tional: 'tion', ational: 'ate', alize: 'al', icate: 'ic', iciti: 'ic', ical: 'ic', ful: '', ness: '', ative: '' };
function step3(w: string[], p1: number, p2: number): string[] {
  const s = suffix(w, w.length, Object.keys(STEP3));
  const start = s ? w.length - len(s) : -1;
  if (!s || start < p1 || (s === 'ative' && start < p2)) return w;
  return replace(w, start, STEP3[s]);
}

const STEP4 = ['al', 'ance', 'ence', 'er', 'ic', 'able', 'ible', 'ant', 'ement', 'ment', 'ent', 'ism', 'ate', 'iti', 'ous', 'ive', 'ize', 'ion'];
function step4(w: string[], p2: number): string[] {
  const s = suffix(w, w.length, STEP4);
  const start = s ? w.length - len(s) : -1;
  if (!s || start < p2) return w;
  if (s === 'ion' && w[start - 1] !== 's' && w[start - 1] !== 't') return w;
  return w.slice(0, start);
}

function step5(w: string[], p1: number, p2: number): string[] {
  const s = suffix(w, w.length, ['e', 'l']);
  const start = s ? w.length - 1 : -1;
  if (s === 'e' && (start >= p2 || (start >= p1 && !shortv(w, start)))) return w.slice(0, start);
  if (s === 'l' && start >= p2 && w[start - 1] === 'l') return w.slice(0, start);
  return w;
}

export function stem(word: string): string {
  if (word in EXCEPTIONS) return EXCEPTIONS[word];
  let w = [...word];
  if (w.length < 3) return word;
  // prelude: a y that starts the word or follows a vowel is a consonant (Y).
  if (w[0] === "'") w = w.slice(1);
  let yFound = false;
  for (let i = 0; i < w.length; i++) {
    if (w[i] === 'y' && (i === 0 || isV(w[i - 1]))) {
      w[i] = 'Y';
      yFound = true;
    }
  }
  const [p1, p2] = regions(w);
  w = step5(step4(step3(step2(step1c(step1b(step1a(w), p1)), p1), p1, p2), p2), p1, p2);
  // postlude
  return (yFound ? w.map((c) => (c === 'Y' ? 'y' : c)) : w).join('');
}

/*
 * Copyright (c) 2001, Dr Martin Porter
 * Copyright (c) 2004,2005, Richard Boulton
 * Copyright (c) 2013, Yoshiki Shibukawa
 * Copyright (c) 2006,2007,2009,2010,2011,2014-2019, Olly Betts
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice,
 *      this list of conditions and the following disclaimer.
 *   2. Redistributions in binary form must reproduce the above copyright notice,
 *      this list of conditions and the following disclaimer in the documentation
 *      and/or other materials provided with the distribution.
 *   3. Neither the name of the Snowball project nor the names of its contributors
 *      may be used to endorse or promote products derived from this software
 *      without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
