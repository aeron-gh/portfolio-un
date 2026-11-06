import { describe, expect, test } from 'bun:test';
import { HOME, TRASH, Vfs, type FsNode } from '../../src/desktop/fs/vfs';
import { insertBookmark, moveBookmark } from '../../src/desktop/apps/files/bookmarks';
import { chooseAction, preferredAction, stackLayout } from '../../src/desktop/apps/files/drop';
import { edgeDelta } from '../../src/desktop/apps/files/selection';
import { NETWORK, RECENT, STARRED } from '../../src/desktop/apps/files/places';

const T = '2026-10-07T10:00:00.000Z';
const file = (name: string): FsNode => ({ name, kind: 'file', mime: 'text/plain', content: 'x', size: 1, mtime: T });
const dir = (name: string, kids: FsNode[] = [], extra: Partial<FsNode> = {}): FsNode => ({ name, kind: 'dir', size: 0, mtime: T, children: Object.fromEntries(kids.map((k) => [k.name, k])), ...extra });
const vfs = new Vfs(
  dir('', [
    dir('etc', [file('hostname')], { readonly: true }),
    dir('home', [
      dir('ubuntu', [
        dir('Documents', [file('a.txt'), dir('work')]),
        dir('Locked', [], { denied: true }),
        file('notes.txt'),
        dir('.local', [dir('share', [dir('Trash', [dir('files', [file('old.txt'), dir('box')]), dir('info')])])]),
      ]),
    ]),
  ]),
  {},
);
const look = { stat: (p: string) => vfs.stat(p), canDelete: (p: string) => !vfs.stat(p)?.readonly && !vfs.stat(p.slice(0, p.lastIndexOf('/')) || '/')?.readonly };
const docs = `${HOME}/Documents`;

describe('what a drop would do (nautilus_dnd_get_preferred_action)', () => {
  test('into a folder on the same disk: move', () => expect(preferredAction(`${docs}/work`, `${docs}/a.txt`, look)).toBe('move'));
  test('what cannot be deleted where it is: copy', () => expect(preferredAction(docs, '/etc/hostname', look)).toBe('copy'));
  test('onto itself: nothing', () => expect(preferredAction(`${docs}/work`, `${docs}/work`, look)).toBeNull());
  test('out of the Trash: move', () => expect(preferredAction(docs, `${TRASH}/old.txt`, look)).toBe('move'));
  test('into the Trash: move; into a folder in it: nothing', () => {
    expect(preferredAction(TRASH, `${docs}/a.txt`, look)).toBe('move');
    expect(preferredAction(`${TRASH}/box`, `${docs}/a.txt`, look)).toBeNull();
  });
  test('onto Starred: copy, which stars, for what is in Home only', () => {
    expect(preferredAction(STARRED, `${docs}/a.txt`, look)).toBe('copy');
    expect(preferredAction(STARRED, '/etc/hostname', look)).toBeNull();
    expect(preferredAction(STARRED, `${TRASH}/old.txt`, look)).toBeNull();
  });
  test('not a folder, not writable, or not a folder at all: nothing', () => {
    expect(preferredAction(`${HOME}/notes.txt`, `${docs}/a.txt`, look)).toBeNull();
    expect(preferredAction('/etc', `${docs}/a.txt`, look)).toBeNull();
    expect(preferredAction(`${HOME}/Locked`, `${docs}/a.txt`, look)).toBeNull();
    expect(preferredAction(RECENT, `${docs}/a.txt`, look)).toBeNull();
    expect(preferredAction(NETWORK, `${docs}/a.txt`, look)).toBeNull();
    expect(preferredAction(`${HOME}/gone`, `${docs}/a.txt`, look)).toBeNull();
  });
});

describe('the action the compositor settles on (Mutter: data_source_update_user_dnd_action, data_offer_choose_action)', () => {
  const both = { source: ['copy', 'move'] as const, target: ['copy', 'move'] as const };
  const none = { shift: false, ctrl: false };
  test('no key: the target’s choice', () => expect(chooseAction('move', both, none)).toBe('move'));
  test('Ctrl copies, Shift moves, and Shift wins when both are held', () => {
    expect(chooseAction('move', both, { shift: false, ctrl: true })).toBe('copy');
    expect(chooseAction('copy', both, { shift: true, ctrl: false })).toBe('move');
    expect(chooseAction('copy', both, { shift: true, ctrl: true })).toBe('move');
  });
  test('a key asks only for what both sides allow', () => {
    const copyOnly = { source: ['copy'] as const, target: ['copy', 'move'] as const };
    expect(chooseAction('copy', copyOnly, { shift: true, ctrl: false })).toBe('copy');
  });
  test('when the target’s choice is not allowed, the first allowed, copy before move', () => {
    expect(chooseAction('move', { source: ['copy'], target: ['copy', 'move'] }, none)).toBe('copy');
  });
  test('a target that refuses stays refused', () => expect(chooseAction(null, both, { shift: true, ctrl: false })).toBeNull());
});

describe('bookmarks (nautilus-bookmark-list.c)', () => {
  const list = ['A', 'B', 'C', 'D'].map((n) => ({ path: `/${n}` }));
  const order = (l: { path: string }[]) => l.map((b) => b.path.slice(1)).join('');
  test('added at a position; one already there stays where it is', () => {
    expect(order(insertBookmark(list, '/E', 0))).toBe('EABCD');
    expect(order(insertBookmark(list, '/E', 2))).toBe('ABECD');
    expect(insertBookmark(list, '/C', 0)).toBe(list);
  });
  test('moved before what was at the place it goes to, before it was taken out', () => {
    expect(order(moveBookmark(list, '/A', 2))).toBe('BACD');
    expect(order(moveBookmark(list, '/D', 1))).toBe('ADBC');
    expect(order(moveBookmark(list, '/B', 99))).toBe('ACDB');
    expect(moveBookmark(list, '/B', 1)).toBe(list);
  });
});

describe('the drag picture (nautilus_ui_draw_stacked_icons)', () => {
  test('one icon, then a pile: each further down by less the more there are, left and right in turn', () => {
    expect(stackLayout(1)).toEqual([{ x: 7, y: 10 }]);
    expect(stackLayout(2)).toEqual([{ x: 7, y: 10 }, { x: 13, y: 20 }]);
    expect(stackLayout(3).map((p) => p.y)).toEqual([10, 16, 22]);
    expect(stackLayout(5).map((p) => [p.x, p.y])).toEqual([[7, 10], [13, 14], [7, 18], [13, 22], [7, 26]]);
  });
});

test('autoscroll near an edge (update_autoscroll): within 30px, a third of how far in, each frame', () => {
  expect(edgeDelta(100, 400)).toBe(0);
  expect(edgeDelta(0, 400)).toBe(-10);
  expect(edgeDelta(15, 400)).toBe(-5);
  expect(edgeDelta(385, 400)).toBe(5);
  expect(edgeDelta(30, 400)).toBe(0);
});
