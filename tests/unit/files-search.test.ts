import { describe, expect, test } from 'bun:test';
import { HOME, TRASH, Vfs, type FsNode } from '../../src/desktop/fs/vfs';
import { hasActiveFilter, isEmptyQuery, NO_SEARCH, searchTitle, type SearchText } from '../../src/desktop/apps/files/query';
import { bm25, dateStart, indexQuery, indexWords, matchRank, relevance, searchFolder, snippet, wordsOf, type SearchFrom } from '../../src/desktop/apps/files/search';
import { sortEntries, type Entry } from '../../src/desktop/apps/files/sort';

const NOW = new Date(2026, 9, 7, 12, 0, 0);
const OLD = new Date(2020, 0, 1).toISOString();
const file = (name: string, content?: string, mtime = OLD, mime = 'text/plain'): FsNode => ({ name, kind: 'file', mime, content, size: 1, mtime });
const dir = (name: string, kids: FsNode[] = [], extra: Partial<FsNode> = {}): FsNode => ({ name, kind: 'dir', size: 0, mtime: OLD, children: Object.fromEntries(kids.map((k) => [k.name, k])), ...extra });

const vfs = new Vfs(
  dir('', [
    dir('etc', [file('report.conf', 'the report settings')]),
    dir('home', [
      dir('ubuntu', [
        file('report.txt', 'nothing here'),
        file('contact.md', 'Write to me', OLD, 'text/markdown'),
        file('.report-hidden', 'report'),
        file('report.tmp', 'x'), // an ignored-files pattern
        dir('Documents', [
          file('old report.md', 'a yearly report', OLD, 'text/markdown'),
          file('notes.md', 'The quarterly Report is due on Friday, so please read it before then.', OLD, 'text/markdown'),
          file('photo.png', undefined, OLD, 'image/png'),
          file('photo.webp', undefined, OLD, 'image/webp'),
          file('run.sh', 'echo quarterly', OLD, 'text/x-shellscript'),
          dir('reports', [file('deep.txt', 'x')]),
        ]),
        dir('Code', [dir('.git'), file('app.txt', 'quarterly numbers')]), // a folder the index leaves out the contents of
        dir('Locked', [file('report-secret.txt', 'x')], { denied: true }),
        dir('.config', [file('report.ini', 'x')]),
        dir('.local', [dir('share', [dir('Trash', [dir('files', [dir('old', [file('report-draft.txt', 'x')])]), dir('info')])])]),
      ]),
    ]),
  ]),
  {},
);
const from = (extra: Partial<SearchFrom> = {}): SearchFrom => ({
  list: (d, hidden) => vfs.list(d, { hidden }),
  stat: (p) => vfs.stat(p),
  recents: [],
  hidden: false,
  content: true,
  timeType: 'last_modified',
  now: NOW,
  ...extra,
});
const q = (text: string, extra: Partial<SearchText> = {}): SearchText => ({ ...NO_SEARCH, text, ...extra });
const rel = (p: string) => (p.startsWith(`${HOME}/`) ? p.slice(HOME.length + 1) : p);
const found = (hits: { path: string }[]) => hits.map((h) => rel(h.path)).sort();

describe('matching a name, as the folder walk does (nautilus_query_matches_string)', () => {
  test('no text matches anything, at rank 0', () => expect(matchRank(null, 'anything')).toBe(0));
  test('every word has to be there, anywhere and in any order', () => {
    expect(matchRank(wordsOf('md about'), 'about.md')).toBeGreaterThan(-1);
    expect(matchRank(wordsOf('bou'), 'about.md')).toBeGreaterThan(-1);
    expect(matchRank(wordsOf('about txt'), 'about.md')).toBe(-1);
  });
  test('case does not matter, and both sides are decomposed', () => {
    expect(matchRank(wordsOf('ABOUT'), 'about.md')).toBeGreaterThan(-1);
    expect(matchRank(wordsOf('café'), 'Café.txt')).toBeGreaterThan(-1);
  });
  test('50, less what comes before the last word, less a hundredth of what follows each word', () => {
    expect(matchRank(wordsOf('ab'), 'about.md')).toBeCloseTo(50 - 0 - 6 / 100, 5);
    expect(matchRank(wordsOf('md'), 'about.md')).toBeCloseTo(50 - 6 - 0 / 100, 5);
  });
  test('it never goes under 10', () => expect(matchRank(wordsOf('z'), `${'a'.repeat(200)}z`)).toBe(10));
  test('text is trimmed, and only spaces is no text', () => {
    expect(wordsOf('  a b ')).toEqual(['a', 'b']);
    expect(wordsOf('   ')).toBeNull();
  });
});

describe('the index: its words (tracker-parser-libicu.c)', () => {
  const words = (s: string) => indexWords(s).map((w) => w.word);
  test('ICU finds the words, and every "." breaks one too, so extensions can be searched', () => {
    expect(words('about.md')).toEqual(['about', 'md']);
    expect(words('Open-Source')).toEqual(['open', 'sourc']);
    expect(words('file_name.txt')).toEqual(['file_nam', 'txt']); // _ joins a word; its final e is then stemmed away
  });
  test('folded, unaccented and stemmed', () => expect(words('Café Straße Reports')).toEqual(['cafe', 'strass', 'report']));
  test('a word starts with a letter, a digit or _, and is under 200 bytes', () => {
    expect(words('2026 notes, -- $5')).toEqual(['2026', 'note', '5']);
    expect(words(`${'a'.repeat(200)} ok`)).toEqual(['ok']);
  });
  test('where each word is in the text', () => {
    expect(indexWords('see about.md').map((w) => [w.start, w.end])).toEqual([[0, 3], [4, 9], [10, 12]]);
  });
});

describe('the index: what is typed (SparqlFtsTokenize, and the * after it)', () => {
  test('each space-separated part is a phrase of index words', () => expect(indexQuery(' quarterly  about.md ')).toEqual([['quarter'], ['about', 'md']]));
  test('a part with no words in it is dropped, as FTS5 drops an empty phrase', () => {
    expect(indexQuery('about -')).toEqual([['about']]);
    expect(indexQuery('- ,')).toEqual([]);
  });
});

describe('bm25 (fts5_aux.c), weighted per column as tinysparql sets it', () => {
  const rows = [['a', 'b'], ['c'], ['d'], ['e'], ['f', 'g', 'h']];
  test('IDF, the weight and the row length, worked out by hand', () => {
    const scores = bm25(rows, 7, [['a']]);
    expect(scores[0]).toBeCloseTo(2.00815, 4);
    expect(scores.slice(1)).toEqual([0, 0, 0, 0]);
  });
  test('the last word only has to begin a word', () => expect(bm25([['report'], ['x'], ['y']], 7, [['rep']])[0]).toBeGreaterThan(0));
  test('a phrase in more than half the rows counts for almost nothing, never less', () => {
    const scores = bm25([['a'], ['a'], ['a'], ['b'], ['c']], 7, [['a']]);
    expect(scores[0]).toBeGreaterThan(0);
    expect(scores[0]).toBeLessThan(1e-5);
  });
});

describe('relevance (nautilus_search_hit_compute_scores)', () => {
  const at = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
  test('straight in the folder: 10000 and the name match, however new it is', () => expect(relevance({ levels: 0, mtime: at(0), rank: 40 }, NOW)).toBe(10000 + 400));
  test('each folder deeper costs 1000, and freshness counts', () => expect(relevance({ levels: 1, mtime: at(0), rank: 40 }, NOW)).toBe(9000 + 100 + 400));
  test('ten folders deep has no closeness left', () => expect(relevance({ levels: 10, mtime: at(100), rank: 10 }, NOW)).toBe(100));
  test('Search Everywhere has no closeness at all', () => expect(relevance({ levels: null, mtime: at(0), rank: 10 }, NOW)).toBe(100 + 100));
  test('the match counts ten times, up to 500', () => expect(relevance({ levels: null, mtime: at(100), rank: 60 }, NOW)).toBe(500));
  test('freshness goes by whole days', () => {
    const bonus = (days: number) => relevance({ levels: null, mtime: at(days), rank: 0 }, NOW);
    expect([1, 2, 7, 8, 14, 15, 30, 31, 90, 91].map(bonus)).toEqual([100, 70, 70, 50, 50, 30, 30, 10, 10, 0]);
  });
  test('used lately counts as much as changed lately', () => expect(relevance({ levels: null, mtime: at(100), atime: at(1), rank: 0 }, NOW)).toBe(100));
});

describe('the snippet (fts5SnippetFunction, 20 words)', () => {
  const text = (parts: { text: string }[]) => parts.map((p) => p.text).join('');
  const bold = (parts: { text: string; bold: boolean }[]) => parts.filter((p) => p.bold).map((p) => p.text);
  test('a short text comes whole, the match in bold', () => {
    const parts = snippet('Hello big World.', indexQuery('world'));
    expect(text(parts)).toBe('Hello big World.');
    expect(bold(parts)).toEqual(['World']);
  });
  test('a match that only begins a word, and a stemmed one', () => {
    expect(bold(snippet('The quarterly Report is due.', indexQuery('reports quart')))).toEqual(['quarterly', 'Report']);
  });
  test('a phrase is one bold run; words next to each other are not', () => {
    expect(bold(snippet('see about.md now', indexQuery('about.md')))).toEqual(['about.md']);
    expect(bold(snippet('see about md now', indexQuery('md see')))).toEqual(['see', 'md']);
  });
  test('a long text: the match in the middle of 20 words, … at each cut end', () => {
    const words = Array.from({ length: 100 }, (_, i) => `w${i}`);
    words[50] = 'needle';
    const shown = text(snippet(words.join(' '), indexQuery('needle')));
    expect(shown).toBe(`…${words.slice(41, 61).join(' ')}…`); // 50 − (20 − 1) / 2, in C's whole numbers
  });
  test('the start of the match’s sentence is preferred when the match still fits', () => {
    const words = Array.from({ length: 60 }, (_, i) => `w${i}`);
    words[29] = 'end.';
    words[38] = 'needle';
    expect(text(snippet(words.join(' '), indexQuery('needle')))).toBe(`…${words.slice(30, 50).join(' ')}…`);
  });
  test('at the end of the text the rest is kept, with no …', () => {
    const words = Array.from({ length: 40 }, (_, i) => `w${i}`);
    expect(text(snippet(`${words.join(' ')} needle!`, indexQuery('needle')))).toBe(`…${words.slice(21).join(' ')} needle!`);
  });
});

describe('searching a folder: the four engines', () => {
  test('by name: any part of it, in every folder below; hidden items and folders it cannot read stay out', () => {
    expect(found(searchFolder(q('report'), HOME, from({ content: false })))).toEqual(['Documents/old report.md', 'Documents/reports', 'report.tmp', 'report.txt']);
    expect(found(searchFolder(q('epor'), HOME, from({ content: false })))).toEqual(['Documents/old report.md', 'Documents/reports', 'report.tmp', 'report.txt']);
  });
  test('showing hidden files searches them too', () => {
    const all = found(searchFolder(q('report'), HOME, from({ content: false, hidden: true })));
    expect(all).toContain('.report-hidden');
    expect(all).toContain('.config/report.ini');
  });
  test('the index adds names by the root of the word', () => {
    expect(found(searchFolder(q('contacts'), HOME, from({ content: false })))).toEqual(['contact.md']);
  });
  test('what is inside text and Markdown files, by word, with a snippet', () => {
    const hits = searchFolder(q('quarter'), HOME, from());
    expect(found(hits)).toEqual(['Documents/notes.md']); // run.sh is not text/plain; Code holds .git
    expect(hits[0].snippet?.filter((p) => p.bold).map((p) => p.text)).toEqual(['quarterly']);
  });
  test('only the last word may be part of a word', () => {
    expect(found(searchFolder(q('quarte report'), HOME, from()))).not.toContain('Documents/notes.md');
    expect(found(searchFolder(q('report quarte'), HOME, from()))).toContain('Documents/notes.md');
  });
  test('Only Filename leaves what is inside out', () => expect(searchFolder(q('quarter'), HOME, from({ content: false }))).toEqual([]));
  test('outside Home nothing is indexed, so only names are found', () => {
    expect(found(searchFolder(q('settings'), '/etc', from()))).toEqual([]);
    expect(found(searchFolder(q('report'), '/etc', from()))).toEqual(['/etc/report.conf']);
  });
  test('the folder you are in reports its own items first, by name; the index has deeper ones', () => {
    const hits = searchFolder(q('report'), `${HOME}/Documents`, from());
    const own = hits.find((h) => h.path.endsWith('old report.md'))!;
    const inside = hits.find((h) => h.path.endsWith('notes.md'))!;
    expect(own.snippet).toBeUndefined();
    expect(inside.snippet).toBeDefined();
    expect(own.relevance).toBeGreaterThan(inside.relevance);
  });
  test('a nearer item outranks a deeper one', () => {
    const hits = searchFolder(q('report'), HOME, from({ content: false }));
    const score = (name: string) => hits.find((h) => h.path.endsWith(name))!.relevance;
    expect(score('report.txt')).toBeGreaterThan(score('old report.md'));
  });
});

describe('Search Everywhere: the index and recent files', () => {
  test('all of Home by word, never a hidden or ignored item, and Home itself', () => {
    expect(found(searchFolder(q('report'), null, from({ content: false })))).toEqual(['Documents/old report.md', 'Documents/reports', 'report.txt']);
    expect(found(searchFolder(q('ubuntu'), null, from()))).toEqual([HOME]);
  });
  test('the last word may be the start of one', () => expect(found(searchFolder(q('repor'), null, from({ content: false })))).toContain('report.txt'));
  test('but not the middle of one', () => expect(searchFolder(q('epor'), null, from({ content: false }))).toEqual([]));
  test('a recent file matches by any part of its name, wherever it is', () => {
    const recents = [{ path: '/etc/report.conf', at: NOW.toISOString() }];
    expect(found(searchFolder(q('epor'), null, from({ recents })))).toEqual(['/etc/report.conf']);
  });
  test('with no text, recent files add nothing; the index lists all it holds', () => {
    const recents = [{ path: '/etc/report.conf', at: NOW.toISOString() }];
    const all = found(searchFolder(q('', { types: ['Text'] }), null, from({ recents })));
    expect(all).not.toContain('/etc/report.conf');
    expect(all).toEqual(['Documents/notes.md', 'Documents/old report.md', 'Documents/reports/deep.txt', 'contact.md', 'report.txt']);
  });
});

describe('Recent, Starred and the Trash', () => {
  test('their own items are searched by name, as if all were in one folder', () => {
    const top = [{ path: `${HOME}/report.txt`, node: vfs.stat(`${HOME}/report.txt`)! }, { path: `${HOME}/contact.md`, node: vfs.stat(`${HOME}/contact.md`)! }];
    const hits = searchFolder(q('cont'), 'recent:///', from(), top);
    expect(hits.map((h) => h.path)).toEqual([`${HOME}/contact.md`]);
    expect(hits[0].relevance).toBeGreaterThan(10000);
  });
  test('in the Trash the folder walk goes into trashed folders', () => {
    const top = [{ path: `${TRASH}/old`, node: vfs.stat(`${TRASH}/old`)! }];
    expect(found(searchFolder(q('draft'), TRASH, from(), top))).toEqual(['.local/share/Trash/files/old/report-draft.txt']);
  });
});

describe('the filters', () => {
  const inDocs = (types: SearchText['types']) => found(searchFolder(q('', { types }), `${HOME}/Documents`, from())).map((p) => p.split('/').pop()).sort();
  test('with no text a filter lists all it matches; types are by exact mime type', () => {
    expect(inDocs(['Text'])).toEqual(['deep.txt', 'notes.md', 'old report.md']);
    expect(inDocs(['Documents'])).toEqual(['notes.md', 'old report.md']);
    expect(inDocs(['Folders'])).toEqual(['reports']);
    expect(inDocs(['Images'])).toEqual(['photo.png']); // image/webp is not in the real list
  });
  test('more than one type is any of them', () => expect(inDocs(['Images', 'Folders'])).toEqual(['photo.png', 'reports']));
  test('dates start at midnight, and months keep to the month', () => {
    expect(dateStart('Today', NOW)).toEqual(new Date(2026, 9, 7));
    expect(dateStart('Yesterday', NOW)).toEqual(new Date(2026, 9, 6));
    expect(dateStart('Past Week', NOW)).toEqual(new Date(2026, 8, 30));
    expect(dateStart('Past Month', new Date(2026, 2, 31, 9))).toEqual(new Date(2026, 1, 28));
    expect(dateStart('Past Year', new Date(2028, 1, 29, 9))).toEqual(new Date(2027, 1, 28));
  });
  test('a date filter looks at the time chosen: Used goes by when it was opened', () => {
    const recents = [{ path: `${HOME}/Documents/notes.md`, at: new Date(2026, 9, 7, 9).toISOString() }];
    const where = (timeType: SearchFrom['timeType']) => found(searchFolder(q('', { date: 'Today' }), `${HOME}/Documents`, from({ recents, timeType })));
    expect(where('last_used')).toEqual(['Documents/notes.md']);
    expect(where('last_modified')).toEqual([]);
  });
  test('a query with no text and no filter is no search', () => {
    expect(isEmptyQuery(NO_SEARCH)).toBe(true);
    expect(isEmptyQuery(q('   '))).toBe(true);
    expect(isEmptyQuery(q('a'))).toBe(false);
    expect(isEmptyQuery(q('', { date: 'Today' }))).toBe(false);
    expect(isEmptyQuery(q('', { types: ['PDF'] }))).toBe(false);
  });
  test('the filter button lights for a date, a type, or names only (nautilus_query_has_active_filter)', () => {
    expect(hasActiveFilter(q('a'), true)).toBe(false);
    expect(hasActiveFilter(q('a', { date: 'Today' }), true)).toBe(true);
    expect(hasActiveFilter(q('a', { types: ['PDF'] }), true)).toBe(true);
    expect(hasActiveFilter(q('a'), false)).toBe(true);
  });
});

test('the title (nautilus_search_directory_file_update_display_name)', () => {
  expect(searchTitle('  report ')).toBe('Search for “report”');
  expect(searchTitle('')).toBe('Search');
});

describe('results order', () => {
  const entry = (path: string, relevance: number, kind: 'file' | 'dir' = 'file'): Entry => ({ path, node: { ...file(path.split('/').pop()!), kind }, count: 0, relevance });
  test('best first, folders not ahead of files; equal scores by full path', () => {
    const sorted = sortEntries([entry('/z/c', 5), entry('/a/d', 5), entry('/a/b', 9, 'dir'), entry('/q/a', 10)], { key: 'relevance', reversed: true }, false);
    expect(sorted.map((e) => e.path)).toEqual(['/q/a', '/a/b', '/a/d', '/z/c']);
  });
});
