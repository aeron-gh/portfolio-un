import { describe, expect, test } from 'bun:test';
import { HOME, TRASH } from '../../src/desktop/fs/vfs';
import { BOOKMARKS, LOCATIONS, NETWORK, RECENT, STARRED, isSpecial, segments, titleFor } from '../../src/desktop/apps/files/places';

test('the sidebar: built-in places, then the bookmarks a new Ubuntu account gets', () => {
  expect(LOCATIONS.map((p) => [p.label, p.icon])).toEqual([
    ['Home', 'user-home-symbolic'],
    ['Recent', 'document-open-recent-symbolic'],
    ['Starred', 'starred-symbolic'],
    ['Network', 'network-computer-symbolic'],
    ['Trash', 'user-trash-symbolic'],
  ]);
  // xdg-user-dirs-gtk update.c: this order, not the alphabet.
  expect(BOOKMARKS.map((p) => [p.label, p.icon])).toEqual([
    ['Documents', 'folder-documents-symbolic'],
    ['Music', 'folder-music-symbolic'],
    ['Pictures', 'folder-pictures-symbolic'],
    ['Videos', 'folder-videos-symbolic'],
    ['Downloads', 'folder-download-symbolic'],
  ]);
  expect(BOOKMARKS[0].path).toBe(`${HOME}/Documents`);
  // nautilus-sidebar.c add_place: each row's tooltip.
  expect(LOCATIONS.map((p) => p.tooltip)).toEqual(['Open Personal Folder', 'Recent Files', 'Starred Files', 'Open Network Locations', 'Open Trash']);
  expect(BOOKMARKS[0].tooltip).toBe(`${HOME}/Documents`);
});

describe('path bar segments (nautilus-pathbar.c)', () => {
  const show = (path: string) => segments(path).map((s) => [s.label, s.icon ?? null, s.path]);
  test('inside Home it starts at Home', () => {
    expect(show(`${HOME}/Documents/work`)).toEqual([
      ['Home', 'user-home-symbolic', HOME],
      ['Documents', null, `${HOME}/Documents`],
      ['work', null, `${HOME}/Documents/work`],
    ]);
    expect(show(HOME)).toEqual([['Home', 'user-home-symbolic', HOME]]);
  });
  test('outside Home it starts at the operating system', () => {
    expect(show('/etc/skel')).toEqual([
      ['Ubuntu', 'drive-harddisk-symbolic', '/'],
      ['etc', null, '/etc'],
      ['skel', null, '/etc/skel'],
    ]);
    expect(show('/')).toEqual([['Ubuntu', 'drive-harddisk-symbolic', '/']]);
    expect(show('/home')).toEqual([['Ubuntu', 'drive-harddisk-symbolic', '/'], ['home', null, '/home']]);
  });
  test('the Trash and folders inside it', () => {
    expect(show(TRASH)).toEqual([['Trash', 'user-trash-symbolic', TRASH]]);
    expect(show(`${TRASH}/old`)).toEqual([['Trash', 'user-trash-symbolic', TRASH], ['old', null, `${TRASH}/old`]]);
  });
  test('the special places are one button', () => {
    expect(show(RECENT)).toEqual([['Recent', 'document-open-recent-symbolic', RECENT]]);
    expect(show(STARRED)).toEqual([['Starred', 'starred-symbolic', STARRED]]);
    expect(show(NETWORK)).toEqual([['Network', 'folder-remote-symbolic', NETWORK]]);
  });
});

test('titleFor: what the window is called', () => {
  expect(titleFor(HOME)).toBe('Home');
  expect(titleFor(`${HOME}/Documents/work`)).toBe('work');
  expect(titleFor(TRASH)).toBe('Trash');
  expect(titleFor(RECENT)).toBe('Recent');
  expect(titleFor('/')).toBe('Ubuntu');
});

test('isSpecial: places that are not folders', () => {
  expect(isSpecial(RECENT)).toBe(true);
  expect(isSpecial(NETWORK)).toBe(true);
  expect(isSpecial(HOME)).toBe(false);
  expect(isSpecial(TRASH)).toBe(false);
});
