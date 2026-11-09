import { describe, expect, test } from 'bun:test';
import { HOME, TRASH, Vfs, type FsNode } from '../../src/desktop/fs/vfs';
import { DISK_SIZE, SYSTEM_USED, freeSpace } from '../../src/desktop/fs/disk';
import { accessWords, describeItems, fullDate, type Subject } from '../../src/desktop/apps/files/properties';

const T = '2026-10-07T10:00:00.000Z';
const file = (name: string, size: number, mime = 'text/plain'): FsNode => ({ name, kind: 'file', mime, content: 'x', size, mtime: T });
const dir = (name: string, kids: FsNode[] = [], extra: Partial<FsNode> = {}): FsNode => ({ name, kind: 'dir', size: 4096, mtime: T, children: Object.fromEntries(kids.map((k) => [k.name, k])), ...extra });
const vfs = new Vfs(
  dir('', [
    dir('etc', [file('hostname', 7)], { readonly: true }),
    dir('root', [], { denied: true, readonly: true }),
    dir('home', [
      dir('ubuntu', [
        dir('Documents', [file('a.txt', 1200), file('b.md', 300, 'text/markdown'), dir('work', [file('c.txt', 1)]), file('.hidden', 5)]),
        dir('Empty'),
        dir('Mixed', [dir('Locked', [file('x', 9)], { denied: true }), file('y.png', 2000, 'image/png')]),
        dir('Pictures', [file('p.png', 5000, 'image/png'), file('q.png', 6000, 'image/png')]),
        dir('.local', [dir('share', [dir('Trash', [dir('files', [{ ...file('old.txt', 42), origin: `${HOME}/Documents/old.txt`, trashed: '2026-11-01T15:04:05.000Z' }]), dir('info')])])]),
      ]),
    ]),
  ]),
  {},
);
const at = (...paths: string[]): Subject[] => paths.map((path) => ({ path, node: vfs.stat(path)! }));
const ctx = { recent: false, clock24: false, free: 57_000_000_000, starrable: (p: string) => p === HOME || p.startsWith(`${HOME}/`) };
const docs = `${HOME}/Documents`;

describe('the free space on the disk (a value this desktop chooses)', () => {
  test('a 64 GiB disk, less what Ubuntu takes, less every file and folder', () => {
    const root = dir('', [file('a', 1000), dir('b', [file('c', 24)])]);
    expect(freeSpace(root)).toBe(DISK_SIZE - SYSTEM_USED - (4096 + 1000 + 4096 + 24));
  });
});

describe('the words for an access level (permission_value_to_string)', () => {
  test('for a file', () => {
    expect(accessWords(6, false)).toBe('Read and Write');
    expect(accessWords(4, false)).toBe('Read-Only');
    expect(accessWords(2, false)).toBe('Write-Only');
    expect(accessWords(0, false)).toBe('None');
  });
  test('for a folder, where execute is the right to go in', () => {
    expect(accessWords(7, true)).toBe('Create and Delete Files');
    expect(accessWords(6, true)).toBe('Read and Write, No Access');
    expect(accessWords(5, true)).toBe('Access Files');
    expect(accessWords(4, true)).toBe('List Files Only');
    expect(accessWords(3, true)).toBe('Write-Only');
    expect(accessWords(2, true)).toBe('Write-Only, No Access');
    expect(accessWords(1, true)).toBe('Access-Only');
    expect(accessWords(0, true)).toBe('None');
  });
  test('items that differ: three dashes', () => expect(accessWords(-1, true)).toBe('---'));
});

test('a full date (ICU skeletons "yMd, hms" and "yMd, Hms" in English)', () => {
  const d = new Date(2026, 10, 9, 21, 36, 5);
  expect(fullDate(d, false)).toBe('11/9/2026, 9:36:05 PM');
  expect(fullDate(new Date(2026, 0, 2, 0, 7, 9), false)).toBe('1/2/2026, 12:07:09 AM');
  expect(fullDate(d, true)).toBe('11/9/2026, 21:36:05');
});

describe('one file (setup_basic_page)', () => {
  const f = describeItems(at(`${docs}/a.txt`), ctx);
  test('its name, type and size, with the exact bytes on hover', () => {
    expect(f.title).toBe('a.txt');
    expect(f.type).toBe('Plain text document');
    expect(f.size).toEqual({ text: '1.2 kB', tip: '1,200 bytes' });
    expect(f.contents).toBeNull();
  });
  test('the folder it is in, as a path ending in a slash; no free space for a file', () => {
    expect(f.parent).toBe(`${docs}/`);
    expect(f.free).toBeNull();
  });
  test('modified, created and accessed', () => {
    const when = fullDate(T, false);
    expect([f.modified, f.created, f.accessed]).toEqual([when, when, when]);
  });
  test('accessed is when Files last opened it, when it did', () => {
    const opened = '2026-11-02T08:00:00.000Z';
    expect(describeItems(at(`${docs}/a.txt`), { ...ctx, opened: () => opened }).accessed).toBe(fullDate(opened, false));
  });
  test('your own file: read and write; others may read it', () => {
    expect(f.permissions?.summary).toBe('Read and Write');
    expect(f.permissions?.banner).toBe(false);
    expect(f.permissions?.rows).toEqual([
      { group: 'owner', name: 'ubuntu', access: [{ title: 'Access', value: 'Read and Write' }] },
      { group: 'group', name: 'ubuntu', access: [{ title: 'Access', value: 'Read-Only' }] },
      { group: 'others', name: null, access: [{ title: 'Access', value: 'Read-Only' }] },
    ]);
  });
  test('text can be made a program; the switch is off', () => expect(f.executable).toBe(false));
  test('an image cannot', () => expect(describeItems(at(`${HOME}/Pictures/p.png`), ctx).executable).toBeNull());
  test('the star, for what is in Home', () => {
    expect(f.star).toBe(true);
    expect(describeItems(at('/etc/hostname'), ctx).star).toBe(false);
  });
});

describe('one folder', () => {
  const f = describeItems(at(docs), ctx);
  test('no type and no size; everything inside counted, hidden files and folders included', () => {
    expect(f.type).toBeNull();
    expect(f.size).toBeNull();
    // a.txt, b.md, work, work/c.txt, .hidden; sizes 1200 + 300 + 4096 + 1 + 5
    expect(f.contents).toEqual({ text: '5 items, totalling 5.6 kB', tip: '5,602 bytes' });
  });
  test('free space on the disk', () => expect(f.free).toBe('57.0 GB Free'));
  test('no accessed date for a folder', () => {
    expect(f.modified).not.toBeNull();
    expect(f.accessed).toBeNull();
  });
  test('your own folder: create and delete files', () => expect(f.permissions?.summary).toBe('Create and Delete Files'));
  test('the pencil to set a custom icon', () => expect(f.customIcon).toBe(true));
  test('an empty folder; one with a folder you may not open', () => {
    expect(describeItems(at(`${HOME}/Empty`), ctx).contents?.text).toBe('Empty folder');
    expect(describeItems(at(`${HOME}/Mixed`), ctx).contents?.text).toBe('2 items, totalling 6.1 kB\n(some contents unreadable)');
    expect(describeItems(at(`${HOME}/Mixed/Locked`), ctx).contents?.text).toBe('Contents unreadable');
  });
  test('one item: the singular form', () => expect(describeItems(at(`${docs}/work`), ctx).contents?.text).toBe('1 item, with size 1 byte'));
  test('Home itself is private: the group may look in, others may not', () => {
    const rows = describeItems(at(HOME), ctx).permissions?.rows;
    expect(rows?.map((r) => r.access[0].value)).toEqual(['Create and Delete Files', 'Access Files', 'None']);
  });
});

describe('what you do not own', () => {
  test('a system file: you may only read it, and only root may change that', () => {
    const f = describeItems(at('/etc/hostname'), ctx);
    expect(f.permissions?.summary).toBe('Read-Only');
    expect(f.permissions?.banner).toBe(true);
    expect(f.permissions?.rows.map((r) => r.name)).toEqual(['root', 'root', null]);
  });
  test('root’s own folder: no access', () => expect(describeItems(at('/root'), ctx).permissions?.summary).toBe('None'));
});

describe('the computer itself: /', () => {
  const f = describeItems(at('/'), ctx);
  test('named after the system, with the disk instead of contents and free space', () => {
    expect(f.title).toBe('Ubuntu');
    expect(f.contents).toBeNull();
    expect(f.free).toBeNull();
    expect(f.parent).toBeNull();
    expect(f.customIcon).toBe(false);
    expect(f.volume).toEqual({ total: '68.7 GB', used: '11.7 GB', free: '57.0 GB', fraction: (DISK_SIZE - 57_000_000_000) / DISK_SIZE });
  });
});

describe('in the Trash', () => {
  const f = describeItems(at(`${TRASH}/old.txt`), ctx);
  test('where it came from and when it went; no type, no folder, no permissions', () => {
    expect(f.trash).toEqual({ original: `${docs}/`, on: fullDate('2026-11-01T15:04:05.000Z', false) });
    expect(f.type).toBeNull();
    expect(f.parent).toBeNull();
    expect(f.permissions).toBeNull();
    expect(f.size?.text).toBe('42 bytes');
  });
});

test('from Recent: the real folder, but no permissions', () => {
  const f = describeItems(at(`${docs}/a.txt`), { ...ctx, recent: true });
  expect(f.parent).toBe(`${docs}/`);
  expect(f.permissions).toBeNull();
});

describe('several items', () => {
  test('two to five: their names; the type when they share one; contents for all of them', () => {
    const f = describeItems(at(`${HOME}/Pictures/p.png`, `${HOME}/Pictures/q.png`), ctx);
    expect(f.title).toBe('p.png, q.png');
    expect(f.type).toBe('PNG image');
    expect(f.size).toBeNull();
    expect(f.contents?.text).toBe('2 items, totalling 11.0 kB');
    expect(f.parent).toBe(`${HOME}/Pictures/`);
    expect([f.modified, f.created, f.accessed]).toEqual([null, null, null]);
    expect(f.executable).toBeNull();
    expect(f.star).toBe(false);
  });
  test('a folder counts what is inside it, not itself', () => {
    expect(describeItems(at(`${docs}/a.txt`, `${docs}/work`), ctx).contents?.text).toBe('2 items, totalling 1.2 kB');
  });
  test('types that differ: no type; parents that differ: no folder', () => {
    const f = describeItems(at(`${docs}/a.txt`, `${HOME}/Pictures/p.png`), ctx);
    expect(f.type).toBeNull();
    expect(f.parent).toBeNull();
  });
  test('more than five: a count', () => {
    const six = at(`${docs}/a.txt`, `${docs}/b.md`, `${docs}/work`, `${docs}/.hidden`, `${HOME}/Pictures/p.png`, `${HOME}/Pictures/q.png`);
    expect(describeItems(six, ctx).title).toBe('6 Selected Items');
  });
  test('free space only when they are all folders', () => {
    expect(describeItems(at(docs, `${HOME}/Empty`), ctx).free).toBe('57.0 GB Free');
    expect(describeItems(at(docs, `${docs}/a.txt`), ctx).free).toBeNull();
  });
  test('files and folders together: a folder and a file access row for each', () => {
    const f = describeItems(at(`${docs}/a.txt`, `${docs}/work`), ctx);
    expect(f.permissions?.summary).toBeNull();
    expect(f.permissions?.rows[0].access).toEqual([
      { title: 'Folder Access', value: 'Create and Delete Files' },
      { title: 'File Access', value: 'Read and Write' },
    ]);
  });
  test('owners that differ: Multiple', () => {
    expect(describeItems(at(`${docs}/a.txt`, '/etc/hostname'), ctx).permissions?.rows[0].name).toBe('Multiple');
  });
});
