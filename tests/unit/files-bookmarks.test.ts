import { describe, expect, test } from 'bun:test';
import { HOME, TRASH } from '../../src/desktop/fs/vfs';
import { addBookmark, bookmarkPlace, canBookmark, DEFAULT_BOOKMARKS, followMove, nameClash, parseBookmarks, removeBookmark, renameBookmark } from '../../src/desktop/apps/files/bookmarks';
import { NETWORK, RECENT, STARRED } from '../../src/desktop/apps/files/places';

const D = `${HOME}/Documents`;

test('a new account has the five xdg-user-dirs-gtk writes, in its order', () => {
  expect(DEFAULT_BOOKMARKS.map((b) => b.path)).toEqual(['Documents', 'Music', 'Pictures', 'Videos', 'Downloads'].map((n) => `${HOME}/${n}`));
});

describe('bookmarkPlace: a sidebar row', () => {
  test('a special folder has its own icon', () => {
    expect(bookmarkPlace({ path: D })).toEqual({ label: 'Documents', icon: 'folder-documents-symbolic', path: D, tooltip: D });
  });
  test('any other folder has the plain one, and the folder\'s name', () => {
    expect(bookmarkPlace({ path: `${HOME}/Projects/x` })).toMatchObject({ label: 'x', icon: 'folder-symbolic' });
  });
  test('a name given by renaming wins', () => {
    expect(bookmarkPlace({ path: D, name: 'Work' })).toMatchObject({ label: 'Work', icon: 'folder-documents-symbolic' });
  });
});

describe('canBookmark (nautilus_bookmark_list_can_bookmark)', () => {
  test('a folder that is not bookmarked yet', () => {
    expect(canBookmark(DEFAULT_BOOKMARKS, `${HOME}/Projects`)).toBe(true);
    expect(canBookmark(DEFAULT_BOOKMARKS, '/etc')).toBe(true);
  });
  test('not twice', () => {
    expect(canBookmark(DEFAULT_BOOKMARKS, D)).toBe(false);
  });
  test('not what is already in the sidebar', () => {
    for (const path of [HOME, TRASH, RECENT, STARRED, NETWORK]) expect(canBookmark([], path)).toBe(false);
  });
});

test('add goes to the end; remove and rename find it by path', () => {
  const list = addBookmark(DEFAULT_BOOKMARKS, '/etc');
  expect(list.at(-1)).toEqual({ path: '/etc' });
  expect(list.length).toBe(6);
  expect(removeBookmark(list, '/etc')).toEqual(DEFAULT_BOOKMARKS);
  expect(renameBookmark(list, '/etc', 'Config').at(-1)).toEqual({ path: '/etc', name: 'Config' });
});

test('renaming back to the folder\'s own name forgets the custom one', () => {
  expect(renameBookmark([{ path: D, name: 'Work' }], D, 'Documents')).toEqual([{ path: D }]);
});

test('nameClash: another bookmark has that name (rename_entry_changed)', () => {
  expect(nameClash(DEFAULT_BOOKMARKS, D, 'Music')).toBe(true);
  expect(nameClash(DEFAULT_BOOKMARKS, D, 'Documents')).toBe(false); // its own
  expect(nameClash(DEFAULT_BOOKMARKS, D, 'Work')).toBe(false);
});

test('parseBookmarks keeps what is good, and starts from the defaults when nothing was saved', () => {
  expect(parseBookmarks(undefined)).toEqual(DEFAULT_BOOKMARKS);
  expect(parseBookmarks('junk')).toEqual(DEFAULT_BOOKMARKS);
  expect(parseBookmarks([])).toEqual([]); // removing them all is a choice
  expect(parseBookmarks([{ path: '/a', name: 'x' }, { path: 3 }, 'no', { path: '/b', name: 5 }])).toEqual([{ path: '/a', name: 'x' }, { path: '/b' }]);
});

test('followMove: stars, bookmarks and Recent keep up with a file or the folder it is in', () => {
  expect(followMove('/a/b', '/a/b', '/x/b')).toBe('/x/b');
  expect(followMove('/a/b/c', '/a/b', '/x/b')).toBe('/x/b/c');
  expect(followMove('/a/bc', '/a/b', '/x/b')).toBe('/a/bc');
});
