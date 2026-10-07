import { describe, expect, test } from 'bun:test';
import { FS_KEY, FsError, HOME, TRASH, Vfs, basename, dirname, loadOverlay, mimeFor, resolvePath, saveOverlay, type FsNode } from '../../src/desktop/fs/vfs';

const T = '2026-10-07T10:00:00.000Z';
const file = (name: string, content: string, extra: Partial<FsNode> = {}): FsNode => ({ name, kind: 'file', mime: mimeFor(name), content, size: content.length, mtime: T, ...extra });
const dir = (name: string, kids: FsNode[], extra: Partial<FsNode> = {}): FsNode => ({ name, kind: 'dir', size: 4096, mtime: T, children: Object.fromEntries(kids.map((k) => [k.name, k])), ...extra });

const seed = (): FsNode =>
  dir('', [
    dir('etc', [file('hostname', 'aeron\n', { readonly: true })], { readonly: true }),
    dir('root', [], { readonly: true, denied: true }),
    dir('tmp', []),
    dir('home', [
      dir('ubuntu', [
        dir('Desktop', [file('README.md', '# Hi')]),
        dir('Documents', [file('about.md', 'about me'), file('Notes été.txt', 'x')]),
        dir('Projects', [dir('partlore', [file('README.md', 'pins')])]),
        file('.bashrc', '# bash', { hidden: false }),
        dir('.local', [dir('share', [dir('Trash', [dir('files', []), dir('info', [])])])]),
      ]),
    ], { readonly: true }),
  ], { readonly: true });

let clock = 0;
const now = () => `2026-10-07T10:00:${String(++clock).padStart(2, '0')}.000Z`;

describe('resolvePath', () => {
  test('home, relative, dot and dot-dot', () => {
    expect(resolvePath('~')).toBe(HOME);
    expect(resolvePath('~/Documents/')).toBe(`${HOME}/Documents`);
    expect(resolvePath('Documents/../Desktop', HOME)).toBe(`${HOME}/Desktop`);
    expect(resolvePath('./a//b///c', '/tmp')).toBe('/tmp/a/b/c');
  });

  test('dot-dot never climbs above /', () => {
    expect(resolvePath('../../../../etc', '/home')).toBe('/etc');
    expect(resolvePath('/..')).toBe('/');
  });

  test('spaces and non-ASCII names survive', () => {
    expect(resolvePath('~/Documents/Notes été.txt')).toBe(`${HOME}/Documents/Notes été.txt`);
  });

  test('dirname and basename', () => {
    expect(dirname('/home/ubuntu/a.md')).toBe('/home/ubuntu');
    expect(dirname('/etc')).toBe('/');
    expect(basename('/home/ubuntu/a.md')).toBe('a.md');
  });
});

describe('reading', () => {
  const fs = new Vfs(seed(), {}, now);

  test('list sorts like GNOME Files: folders first, dotfiles last, hidden unless asked', () => {
    expect(fs.list('~').map((n) => n.name)).toEqual(['Desktop', 'Documents', 'Projects']);
    expect(fs.list('~', { hidden: true }).map((n) => n.name)).toEqual(['Desktop', 'Documents', 'Projects', '.local', '.bashrc']);
  });

  test('read a file; errors for folders, missing and denied paths', () => {
    expect(fs.read('~/Documents/about.md')).toBe('about me');
    expect(() => fs.read('~/Documents')).toThrow(FsError);
    expect(() => fs.read('~/nope')).toThrow('ENOENT');
    expect(() => fs.list('/root')).toThrow('EACCES');
  });

  test('search finds visible files by name, case-insensitive', () => {
    expect(fs.search('readme')).toEqual([`${HOME}/Desktop/README.md`, `${HOME}/Projects/partlore/README.md`]);
    expect(fs.search('bashrc')).toEqual([]);
  });
});

describe('writing', () => {
  test('write creates and updates files with size and time', () => {
    const fs = new Vfs(seed(), {}, now);
    fs.write('~/Documents/todo.txt', 'ship it');
    const n = fs.stat('~/Documents/todo.txt')!;
    expect(n.content).toBe('ship it');
    expect(n.size).toBe(7);
    expect(n.mime).toBe('text/plain');
    fs.write('~/Documents/todo.txt', 'shipped');
    expect(fs.read('~/Documents/todo.txt')).toBe('shipped');
  });

  test('mkdir, and the errors a shell would give', () => {
    const fs = new Vfs(seed(), {}, now);
    fs.mkdir('~/Code');
    expect(fs.stat('~/Code')?.kind).toBe('dir');
    expect(() => fs.mkdir('~/Code')).toThrow('EEXIST');
    expect(() => fs.mkdir('~/missing/child')).toThrow('ENOENT');
    expect(() => fs.write('/etc/passwd', 'x')).toThrow('EACCES');
    expect(() => fs.write('~/Documents', 'x')).toThrow('EISDIR');
    fs.write('/tmp/scratch', 'ok');
    expect(fs.read('/tmp/scratch')).toBe('ok');
  });

  test('move renames, moves into folders, and refuses bad moves', () => {
    const fs = new Vfs(seed(), {}, now);
    fs.move('~/Documents/about.md', '~/Documents/me.md');
    expect(fs.exists('~/Documents/about.md')).toBe(false);
    expect(fs.read('~/Documents/me.md')).toBe('about me');
    fs.move('~/Documents/me.md', '~/Desktop');
    expect(fs.read('~/Desktop/me.md')).toBe('about me');
    expect(() => fs.move('~/Projects', '~/Projects/partlore')).toThrow('EINVAL');
    expect(() => fs.move('~/Desktop/README.md', '~/Desktop/me.md')).toThrow('EEXIST');
  });

  test('trash and restore remember where things came from', () => {
    const fs = new Vfs(seed(), {}, now);
    const t1 = fs.trash('~/Desktop/README.md');
    expect(t1).toBe(`${TRASH}/README.md`);
    expect(fs.stat(t1)?.origin).toBe(`${HOME}/Desktop/README.md`);
    fs.write('~/Desktop/README.md', 'new');
    const t2 = fs.trash('~/Desktop/README.md');
    expect(t2).toBe(`${TRASH}/README (2).md`);
    expect(fs.restore(t1)).toBe(`${HOME}/Desktop/README.md`);
    expect(fs.read('~/Desktop/README.md')).toBe('# Hi');
    expect(() => fs.trash('/etc/hostname')).toThrow('EACCES');
  });

  test('watchers hear changes at or inside their path', () => {
    const fs = new Vfs(seed(), {}, now);
    const all: string[] = [];
    const docs: string[] = [];
    const stop = fs.watch('/', (p) => all.push(p));
    fs.watch('~/Documents', (p) => docs.push(p));
    fs.mkdir('~/A');
    fs.write('~/Documents/b.txt', 'b');
    stop();
    fs.mkdir('~/C');
    expect(all).toEqual([`${HOME}/A`, `${HOME}/Documents/b.txt`]);
    expect(docs).toEqual([`${HOME}/Documents/b.txt`]);
    fs.reset();
    expect(docs.at(-1)).toBe('/');
  });
});

describe('overlay (visitor changes)', () => {
  test('changes replay on a fresh copy of the seed', () => {
    const a = new Vfs(seed(), {}, now);
    a.mkdir('~/Code');
    a.write('~/Code/x.ts', 'let x = 1');
    a.write('~/Documents/about.md', 'edited');
    a.move('~/Projects/partlore', '~/Code');
    a.trash('~/Desktop/README.md');
    const b = new Vfs(seed(), a.overlay(), now);
    expect(b.read('~/Code/x.ts')).toBe('let x = 1');
    expect(b.read('~/Documents/about.md')).toBe('edited');
    expect(b.read('~/Code/partlore/README.md')).toBe('pins');
    expect(b.exists('~/Projects/partlore')).toBe(false);
    expect(b.exists('~/Desktop/README.md')).toBe(false);
    expect(b.exists(`${TRASH}/README.md`)).toBe(true);
  });

  test('a new seed keeps visitor edits and adds new seed files', () => {
    const a = new Vfs(seed(), {}, now);
    a.write('~/Documents/about.md', 'my edit');
    a.write('~/Documents/mine.txt', 'mine');
    const newer = seed();
    newer.children!.home.children!.ubuntu.children!.Documents.children!['new.md'] = file('new.md', 'fresh');
    newer.children!.home.children!.ubuntu.children!.Documents.children!['about.md'] = file('about.md', 'owner update');
    const b = new Vfs(newer, a.overlay(), now);
    expect(b.read('~/Documents/about.md')).toBe('my edit');
    expect(b.read('~/Documents/mine.txt')).toBe('mine');
    expect(b.read('~/Documents/new.md')).toBe('fresh');
  });

  test('changes whose parent no longer exists are dropped quietly', () => {
    const b = new Vfs(seed(), { [`${HOME}/Gone/a.txt`]: file('a.txt', 'x') }, now);
    expect(b.exists('~/Gone/a.txt')).toBe(false);
  });

  test('a folder trashed and restored keeps the file trashed before it out of the folder after reload', () => {
    const a = new Vfs(seed(), {}, now);
    a.trash('~/Documents/about.md');
    a.restore(a.trash('~/Documents'));
    const b = new Vfs(seed(), a.overlay(), now);
    expect(b.exists('~/Documents/about.md')).toBe(false);
    expect(b.stat('/')).toEqual(a.stat('/'));
  });

  test('a folder made where an old one moved away is empty after reload', () => {
    const a = new Vfs(seed(), {}, now);
    a.move('~/Documents', '~/Old');
    a.mkdir('~/Documents');
    const b = new Vfs(seed(), a.overlay(), now);
    expect(b.list('~/Documents')).toEqual([]);
    expect(b.stat('/')).toEqual(a.stat('/'));
  });

  test('reset goes back to the seed', () => {
    const a = new Vfs(seed(), {}, now);
    a.mkdir('~/Code');
    a.reset();
    expect(a.exists('~/Code')).toBe(false);
    expect(a.overlay()).toEqual({});
  });
});

describe('saving the overlay', () => {
  const memory = (initial: Record<string, string> = {}) => {
    const data = { ...initial };
    return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; }, data };
  };

  test('round-trip through storage', () => {
    const m = memory();
    const o = { [`${HOME}/Code`]: { name: 'Code', kind: 'dir' as const, size: 4096, mtime: T, children: {} } };
    expect(saveOverlay(m, o)).toBe(true);
    expect(loadOverlay(m)).toEqual({ overlay: o, corrupt: false });
  });

  test('a corrupt saved overlay is ignored and reported', () => {
    expect(loadOverlay(memory({ [FS_KEY]: '[not json' }))).toEqual({ overlay: {}, corrupt: true });
    expect(loadOverlay(memory({ [FS_KEY]: '"a string"' }))).toEqual({ overlay: {}, corrupt: true });
  });

  test('valid JSON with a malformed entry counts as corrupt', () => {
    const bad = [
      { [`${HOME}/x`]: 'oops' },
      { [`${HOME}/x`]: { name: 'x' } },
      { [`${HOME}/x`]: { name: 'x', kind: 'pipe' } },
      { [`${HOME}/x`]: { name: 'y', kind: 'file' } },
      { [`${HOME}/x`]: { name: 'x', kind: 'dir', children: { a: 5 } } },
      { 'relative/x': null },
    ];
    for (const o of bad) expect(loadOverlay(memory({ [FS_KEY]: JSON.stringify(o) }))).toEqual({ overlay: {}, corrupt: true });
    expect(loadOverlay(memory({ [FS_KEY]: JSON.stringify({ [`${HOME}/Desktop`]: null }) })).corrupt).toBe(false);
  });

  test('no storage, or storage that throws', () => {
    expect(loadOverlay(null)).toEqual({ overlay: {}, corrupt: false });
    expect(saveOverlay({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, {})).toBe(false);
  });
});
