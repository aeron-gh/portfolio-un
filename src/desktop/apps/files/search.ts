// What a search finds, and in what order (nautilus-search-engine.c and the engines it starts). Four engines look at once
// and a file is listed by the first one to report it. In the order they usually answer:
//   model: the folder searched, already loaded, by any part of a name;
//   recent: files used lately inside it, by any part of a name, and only when there is text to match;
//   localsearch: the index of Home, by word, for names and for what is inside text files, with a snippet;
//   simple: every folder below, by any part of a name, half a second after the others.
// This module loads the first time a search is needed.
import { byteLength, dirname, HOME, type FsNode } from '../../fs/vfs';
import type { Recent } from './prefs';
import type { DateFilter, SearchText, SnippetPart, TimeType, TypeFilter } from './query';
import { stem } from './stem';

export type SearchFrom = {
  list: (dir: string, hidden: boolean) => FsNode[];
  stat: (path: string) => FsNode | null | undefined;
  recents: Recent[];
  hidden: boolean;
  /** fts-enabled: what is inside files counts too. */
  content: boolean;
  timeType: TimeType;
  now: Date;
};
export type Hit = { path: string; node: FsNode; relevance: number; snippet?: SnippetPart[] };
type Item = { path: string; node: FsNode };

const prepare = (s: string) => s.normalize('NFD').toLowerCase();
/** nautilus_query_set_text: stripped; nothing left is no text. Split on single spaces. */
export const wordsOf = (text: string): string[] | null => (text.trim() ? prepare(text.trim()).split(' ') : null);

const MIN_RANK = 10;
const MAX_RANK = 50;
const RANK_SCALE_FACTOR = 100;
/** nautilus_query_matches_string: -1 for no match. Counted in bytes, so prefix matches sort first. */
export function matchRank(words: string[] | null, name: string): number {
  if (!words) return 0;
  const prepared = prepare(name);
  let at = 0;
  let malus = 0;
  for (const word of words) {
    at = prepared.indexOf(word);
    if (at < 0) return -1;
    malus += byteLength(prepared.slice(at)) - byteLength(word);
  }
  return Math.max(MIN_RANK, MAX_RANK - byteLength(prepared.slice(0, at)) - malus / RANK_SCALE_FACTOR);
}

const DAY = 86_400_000;
function recencyBonus(mtime: string | undefined, atime: string | undefined, now: Date): number {
  const age = (t?: string) => (t ? Math.trunc((now.getTime() - Date.parse(t)) / DAY) : Infinity);
  const days = Math.min(age(mtime), age(atime));
  return days > 90 ? 0 : days > 30 ? 10 : days > 14 ? 30 : days > 7 ? 50 : days > 1 ? 70 : 100;
}

/** nautilus_search_hit_compute_scores. `levels`: folders between it and where the search began; null for Search Everywhere. */
export function relevance(hit: { levels: number | null; mtime?: string; atime?: string; rank: number }, now: Date): number {
  const proximity = hit.levels !== null && hit.levels < 10 ? 10000 - 1000 * hit.levels : 0;
  // Straight in the folder, only the name decides: prefix matches first.
  const recent = hit.levels === 0 ? 0 : recencyBonus(hit.mtime, hit.atime, now);
  const match = hit.rank > 0 ? Math.min(500, 10 * hit.rank) : 0;
  return proximity + recent + match;
}

// mimetype_groups in nautilus-mime-actions.c, compared exactly (nautilus_query_matches_mime_type). The Audio and Video groups
// name about a hundred types one by one; a prefix gives the same answer for every type a file here can have.
const GROUPS: Record<TypeFilter, (mime: string) => boolean> = {
  Audio: (m) => m.startsWith('audio/'),
  Documents: (m) =>
    [
      'application/rtf', 'application/msword', 'application/vnd.sun.xml.writer', 'application/vnd.sun.xml.writer.global', 'application/vnd.sun.xml.writer.template',
      'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.text-template', 'application/x-abiword', 'application/x-applix-word',
      'application/x-mswrite', 'application/docbook+xml', 'application/x-kword', 'application/x-kword-crypt', 'application/x-lyx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown',
    ].includes(m),
  Folders: (m) => m === 'inode/directory',
  Images: (m) =>
    [
      'application/vnd.oasis.opendocument.image', 'application/x-krita', 'image/bmp', 'image/cgm', 'image/gif', 'image/jpeg', 'image/jpeg2000', 'image/png', 'image/svg+xml',
      'image/tiff', 'image/x-compressed-xcf', 'image/x-pcx', 'image/x-photo-cd', 'image/x-psd', 'image/x-tga', 'image/x-xcf',
    ].includes(m),
  PDF: (m) => ['application/pdf', 'application/postscript', 'application/x-dvi', 'image/x-eps', 'image/vnd.djvu+multipage'].includes(m),
  Spreadsheets: (m) =>
    [
      'application/vnd.lotus-1-2-3', 'application/vnd.ms-excel', 'application/vnd.stardivision.calc', 'application/vnd.sun.xml.calc', 'application/vnd.oasis.opendocument.spreadsheet',
      'application/x-applix-spreadsheet', 'application/x-gnumeric', 'application/x-kspread', 'application/x-kspread-crypt', 'application/x-quattropro', 'application/x-sc',
      'application/x-siag', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(m),
  Text: (m) => m === 'text/plain' || m === 'text/markdown',
  Videos: (m) => m.startsWith('video/'),
};
const matchesType = (types: TypeFilter[], node: FsNode) => !types.length || types.some((t) => GROUPS[t](node.kind === 'dir' ? 'inode/directory' : (node.mime ?? '')));

/** g_date_time_add_months: the day stays inside the month. */
function monthsBack(date: Date, by: number): Date {
  const last = new Date(date.getFullYear(), date.getMonth() - by + 1, 0).getDate();
  return new Date(date.getFullYear(), date.getMonth() - by, Math.min(date.getDate(), last));
}
/** nautilus_search_popover_init: each button's first day, from the start of today. */
export function dateStart(filter: DateFilter, now: Date): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'Past Month') return monthsBack(today, 1);
  if (filter === 'Past Year') return monthsBack(today, 12);
  const days = { Today: 0, Yesterday: 1, 'Past Week': 7 }[filter];
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
}
/** nautilus_date_time_is_between_dates, up to now. */
function inDateRange(q: SearchText, time: string | undefined, now: Date): boolean {
  if (!q.date) return true;
  if (!time || Date.parse(time) === 0) return false;
  const at = Date.parse(time);
  return at - dateStart(q.date, now).getTime() > 0 && Math.trunc((now.getTime() - at) / DAY) > -1;
}
/** No file here keeps its own created or last-used time, so those fall back to when it last changed. */
const timeOf = (node: FsNode, used: string | undefined, from: SearchFrom) => (from.timeType === 'last_used' ? (used ?? node.mtime) : node.mtime);

// ---- the index ------------------------------------------------------------------------------------------------------
// localsearch 3.11 as Ubuntu sets it up: all of Home but hidden items and its ignore lists, words split by ICU and at every
// ".", folded, unaccented and stemmed (tracker-parser-libicu.c), ranked by bm25 with the ontology's weights.

const glob = (p: string) => new RegExp(`^${p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*').replaceAll('?', '.')}$`);
/** org.freedesktop.Tracker.Miner.Files ignored-files: for files only. */
const IGNORED_FILES = [
  '*~', '*.o', '*.la', '*.lo', '*.loT', '*.in', '*.m4', '*.rej', '*.gmo', '*.orig', '*.pc', '*.omf', '*.aux', '*.tmp', '*.vmdk', '*.vm*', '*.nvram',
  '*.part', '*.rcore', '*.lzo', 'autom4te', 'conftest', 'confstat', 'Makefile', 'SCCS', 'ltmain.sh', 'libtool', 'config.status', 'confdefs.h',
  'configure', '#*#', '~$*.doc?', '~$*.dot?', '~$*.xls?', '~$*.xlt?', '~$*.xlam', '~$*.ppt?', '~$*.pot?', '~$*.ppam', '~$*.ppsm', '~$*.ppsx',
  '~$*.vsd?', '~$*.vss?', '~$*.vst?', '*.directory',
].map(glob);
/** ignored-directories: for folders, and so for all in them. */
const IGNORED_DIRS = ['po', 'CVS', 'core-dumps', 'lost+found'];
/** ignored-directories-with-content: a folder holding one of these is indexed, but nothing in it is. */
const KEEP_OUT = ['.trackerignore', '.git', '.hg', '.nomedia'];
/** 15-text.rule: what the text extractor reads, by exact type. */
const TEXT = ['text/plain', 'text/markdown'];
/** nrl:weight of nfo:fileName and nie:plainTextContent: bm25's weight for each. */
const NAME_WEIGHT = 7;
const CONTENT_WEIGHT = 2;
const isHidden = (n: FsNode) => n.hidden === true || n.name.startsWith('.');

export type Word = { word: string; start: number; end: number };
const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
const WORD_START = /^[\p{L}\p{N}_]/u;
const MARKS = /[̀-ͯ᷀-᷿⃐-⃿︠-︯]/g;
/** MAX_WORD_LENGTH in bytes, and MAX_WORDS a text is cut at (tracker-fts-tokenizer.c). */
const MAX_WORD_BYTES = 200;
const MAX_WORDS = 10000;

/** process_word_uchar: case folded (lowercase, but for the two letters folding treats otherwise), NFKD, unaccented, stemmed. */
const indexForm = (w: string) => stem(w.toLowerCase().replaceAll('ß', 'ss').replaceAll('ς', 'σ').normalize('NFKD').toLowerCase().replace(MARKS, ''));

const cache = new Map<string, Word[]>();
/** tracker_parser_next: ICU's words, broken again at every ".", each starting with a letter, a digit or _. */
export function indexWords(text: string): Word[] {
  const known = cache.get(text);
  if (known) return known;
  const out: Word[] = [];
  outer: for (const { segment, index } of segmenter.segment(text)) {
    let at = index;
    for (const piece of segment.split(/(\.)/)) {
      if (piece && WORD_START.test(piece) && byteLength(piece) < MAX_WORD_BYTES) out.push({ word: indexForm(piece), start: at, end: at + piece.length });
      at += piece.length;
      if (out.length === MAX_WORDS) break outer;
    }
  }
  if (cache.size > 5000) cache.clear();
  cache.set(text, out);
  return out;
}
const wordsIn = (text: string) => indexWords(text).map((w) => w.word);

/** SparqlFtsTokenize and the `|| '*'` after it: each space-separated part is a phrase, and the last word of the last
 *  phrase only has to begin a word. A part with no words is dropped, as FTS5 drops an empty phrase. (Double quotes typed
 *  to group words are taken as any other character.) */
export function indexQuery(text: string): string[][] {
  return text.trim().split(' ').flatMap((part) => {
    const words = wordsIn(part);
    return words.length ? [words] : [];
  });
}

type Instance = { phrase: number; at: number };
/** Where each phrase is, in order of position (xInst). */
function instances(words: string[], query: string[][]): Instance[] {
  const out: Instance[] = [];
  const last = query.length - 1;
  for (let at = 0; at < words.length; at++) {
    query.forEach((phrase, p) => {
      const fits = phrase.every((term, k) => {
        const word = words[at + k];
        return word !== undefined && (p === last && k === phrase.length - 1 ? word.startsWith(term) : word === term);
      });
      if (fits) out.push({ phrase: p, at });
    });
  }
  return out;
}

/** fts5Bm25Function, for a table of one column: each row's score (the index's -rank), 0 where not every phrase is. */
export function bm25(rows: string[][], weight: number, query: string[][]): number[] {
  const found = rows.map((row) => instances(row, query));
  const avgdl = rows.reduce((sum, row) => sum + row.length, 0) / rows.length;
  const idf = query.map((_, p) => {
    const hits = found.filter((inst) => inst.some((i) => i.phrase === p)).length;
    const value = Math.log((rows.length - hits + 0.5) / (hits + 0.5));
    return value <= 0 ? 1e-6 : value;
  });
  return rows.map((row, r) => {
    if (!query.length || !query.every((_, p) => found[r].some((i) => i.phrase === p))) return 0;
    return query.reduce((score, _, p) => {
      const f = weight * found[r].filter((i) => i.phrase === p).length;
      return score + (idf[p] * (f * 2.2)) / (f + 1.2 * (1 - 0.75 + (0.75 * row.length) / avgdl));
    }, 0);
  });
}

/** fts5SnippetFunction with the index's arguments (…, 20 words): the window with the most matches, moved to the start of
 *  their sentence when that still holds them, the matches in bold, and … where the text was cut. */
export function snippet(text: string, query: string[][], size = 20): SnippetPart[] {
  const words = indexWords(text);
  const found = instances(words.map((w) => w.word), query);
  const n = words.length;
  const phraseSize = (p: number) => query[p].length;

  // fts5SentenceFinderCb: a word starts a sentence after a . or : and some space.
  const firsts: number[] = [];
  words.forEach((w, i) => {
    if (i === 0) return void firsts.push(0);
    let j = w.start - 1;
    while (j >= 0 && ' \t\n\r'.includes(text[j])) j--;
    if (j !== w.start - 1 && (text[j] === '.' || text[j] === ':')) firsts.push(i);
  });
  // fts5SnippetScore
  const score = (from: number) => {
    const seen = new Set<number>();
    let total = 0;
    let first = -1;
    let last = 0;
    for (const i of found) {
      if (i.at < from || i.at >= from + size) continue;
      total += seen.has(i.phrase) ? 1 : 1000;
      seen.add(i.phrase);
      if (first < 0) first = i.at;
      last = i.at + phraseSize(i.phrase);
    }
    let adjusted = first - Math.trunc((size - (last - first)) / 2);
    if (adjusted + size > n) adjusted = n - size;
    return { total, adjusted: Math.max(0, adjusted) };
  };
  let best = 0;
  let start = 0;
  for (const inst of found) {
    const window = score(inst.at);
    if (window.total > best) [best, start] = [window.total, window.adjusted];
    if (firsts.length && n > size) {
      let jj = 0;
      while (jj < firsts.length - 1 && firsts[jj + 1] <= inst.at) jj++;
      if (firsts[jj] < inst.at) {
        const sentence = score(firsts[jj]).total + (firsts[jj] === 0 ? 120 : 100);
        if (sentence > best) [best, start] = [sentence, firsts[jj]];
      }
    }
  }

  // fts5CInstIterNext: overlapping instances are one run.
  let next = 0;
  const run = { start: -1, end: -1 };
  const advance = () => {
    run.start = -1;
    run.end = -1;
    for (; next < found.length; next++) {
      const end = found[next].at - 1 + phraseSize(found[next].phrase);
      if (run.start < 0) [run.start, run.end] = [found[next].at, end];
      else if (found[next].at <= run.end) run.end = Math.max(run.end, end);
      else break;
    }
  };
  advance();
  // fts5HighlightCb
  const parts: SnippetPart[] = [];
  let bold = false;
  const put = (s: string) => {
    const last = parts.at(-1);
    if (!s) return;
    if (last && last.bold === bold) last.text += s;
    else parts.push({ text: s, bold });
  };
  const end = start + size - 1;
  let off = 0;
  if (start > 0) put('…');
  while (run.start >= 0 && run.start < start) advance();
  words.forEach((w, pos) => {
    if (pos < start || pos > end) return;
    if (start && pos === start) off = w.start;
    if (bold && (pos <= run.start || run.start < 0) && w.start > off) bold = false;
    if (pos === run.start && !bold) {
      put(text.slice(off, w.start));
      [bold, off] = [true, w.start];
    }
    if (pos === run.end) {
      bold = true;
      put(text.slice(off, w.end));
      off = w.end;
      advance();
    }
    if (pos === end) {
      if (bold && run.start >= 0 && pos >= run.start) {
        put(text.slice(off, w.end));
        off = w.end;
      }
      bold = false;
      put(text.slice(off, w.end));
      off = w.end;
    }
  });
  bold = false;
  put(end >= n - 1 ? text.slice(off) : '…');
  return parts;
}

/** What localsearch holds: Home itself and all in it but hidden and ignored items. */
function indexed(from: SearchFrom): Item[] {
  const home = from.stat(HOME);
  const items: Item[] = home ? [{ path: HOME, node: home }] : [];
  const visit = (dir: string) => {
    let nodes: FsNode[];
    try {
      nodes = from.list(dir, true);
    } catch {
      return; // cannot be read
    }
    if (nodes.some((n) => KEEP_OUT.includes(n.name))) return; // tracker_indexing_tree_parent_is_indexable
    for (const node of nodes) {
      if (isHidden(node) || (node.kind === 'dir' ? IGNORED_DIRS.includes(node.name) : IGNORED_FILES.some((re) => re.test(node.name)))) continue;
      const path = `${dir}/${node.name}`;
      items.push({ path, node });
      if (node.kind === 'dir') visit(path);
    }
  };
  visit(HOME);
  return items;
}

/** All that matches, in no order. `location`: null for Search Everywhere. `own`: the items of a place that is not a real
 *  folder (Recent, Starred, the Trash), each with the name it is shown by. */
export function searchFolder(q: SearchText, location: string | null, from: SearchFrom, own?: Item[]): Hit[] {
  const words = wordsOf(q.text);
  const used = new Map(from.recents.map((r) => [r.path, r.at]));
  const hits = new Map<string, Hit>();
  const below = (path: string) => (location === '/' ? path !== '/' : location !== null && path.startsWith(`${location}/`)); // g_file_has_prefix
  const levelsOf = (path: string) => (location === null ? null : path.slice(location === '/' ? 1 : location.length + 1).split('/').length - 1);
  function add(item: Item, rank: number, levels: number | null, part?: SnippetPart[]) {
    const { path, node } = item;
    if (hits.has(path) || !matchesType(q.types, node)) return;
    const atime = used.get(path);
    if (!inDateRange(q, timeOf(node, atime, from), from.now)) return;
    hits.set(path, { path, node, relevance: relevance({ levels, mtime: node.mtime, atime, rank }, from.now), ...(part ? { snippet: part } : {}) });
  }
  const list = (dir: string, hidden: boolean): Item[] => {
    try {
      return from.list(dir, hidden).map((node) => ({ path: `${dir === '/' ? '' : dir}/${node.name}`, node }));
    } catch {
      return [];
    }
  };

  // model: the folder searched, by name. Its hidden items are there, for the view to hide.
  if (location !== null) {
    for (const item of own ?? list(location, true)) {
      const rank = matchRank(words, item.node.name);
      if (rank > -1 && (from.hidden || !isHidden(item.node))) add(item, rank, 0);
    }
  }

  // recent: is_file_valid_recursive turns away a file in a hidden folder too.
  const hiddenOnTheWay = (path: string) => {
    for (let p = path; p.length > 1 && p.startsWith('/'); p = dirname(p)) {
      const node = from.stat(p);
      if (node && isHidden(node)) return true;
    }
    return false;
  };
  for (const { path } of from.recents) {
    const node = from.stat(path);
    if (!node || (location !== null && !below(path)) || (!from.hidden && hiddenOnTheWay(path))) continue;
    const rank = matchRank(words, node.name);
    if (rank > 0) add({ path, node }, rank, levelsOf(path));
  }

  // localsearch: STRSTARTS (url, location + '/'), which leaves out the location itself, and all of / with it. What is inside
  // comes before names, in the order of its UNION.
  if (location === null || location === HOME || location.startsWith(`${HOME}/`)) {
    const all = indexed(from);
    const inScope = (path: string) => location === null || path.startsWith(`${location}/`);
    const query = words && indexQuery(q.text);
    if (!query) for (const item of all) if (inScope(item.path)) add(item, 0, levelsOf(item.path));
    if (query?.length && from.content) {
      const docs = all.filter((i) => i.node.kind === 'file' && TEXT.includes(i.node.mime ?? '') && i.node.content);
      const scores = bm25(docs.map((i) => wordsIn(i.node.content!)), CONTENT_WEIGHT, query);
      docs.forEach((item, i) => scores[i] > 0 && inScope(item.path) && add(item, scores[i], levelsOf(item.path), snippet(item.node.content!, query)));
    }
    if (query?.length) {
      const scores = bm25(all.map((i) => wordsIn(i.node.name)), NAME_WEIGHT, query);
      all.forEach((item, i) => scores[i] > 0 && inScope(item.path) && add(item, scores[i], levelsOf(item.path)));
    }
  }

  // simple: every folder below, by name. A place's own items were the model's to report, by the names they are shown by.
  const walk = (dir: string, levels: number) => {
    for (const item of list(dir, from.hidden)) {
      const rank = matchRank(words, item.node.name);
      if (rank > -1 && !(own && levels === 0)) add(item, rank, levels);
      if (item.node.kind === 'dir') walk(item.path, levels + 1);
    }
  };
  if (location !== null) walk(location, 0);
  return [...hits.values()];
}
