import { describe, expect, test } from 'bun:test';
import { addTab, closeTab, moveTab, nextTab, type Tab } from '../../src/desktop/apps/files/tabs';

const t = (id: string, parent: string | null = null): Tab => ({ id, parent });
const ids = (tabs: Tab[]) => tabs.map((x) => x.id);

describe('where a new tab goes (adw_tab_view_add_page)', () => {
  test('right after the tab it came from', () => {
    expect(ids(addTab([t('a'), t('z')], t('b', 'a')))).toEqual(['a', 'b', 'z']);
  });
  test('after what that tab has already opened', () => {
    const tabs = [t('a'), t('b', 'a'), t('z')];
    expect(ids(addTab(tabs, t('c', 'a')))).toEqual(['a', 'b', 'c', 'z']);
  });
  test('and after their children too', () => {
    const tabs = [t('a'), t('b', 'a'), t('d', 'b'), t('z')];
    expect(ids(addTab(tabs, t('c', 'a')))).toEqual(['a', 'b', 'd', 'c', 'z']);
  });
  test('with no parent, at the end', () => {
    expect(ids(addTab([t('a'), t('b')], t('c')))).toEqual(['a', 'b', 'c']);
  });
});

describe('which tab comes forward after closing the selected one (select_previous_page)', () => {
  test('back to the tab it came from when that is next to it', () => {
    expect(closeTab([t('a'), t('b', 'a'), t('z')], 'b', 'b').selected).toBe('a');
  });
  test('a sibling opened from the same tab comes before the next tab', () => {
    expect(closeTab([t('a'), t('b', 'a'), t('c', 'a'), t('z')], 'c', 'c').selected).toBe('b');
  });
  test('with no parent, the next tab', () => {
    expect(closeTab([t('a'), t('b'), t('c')], 'b', 'b').selected).toBe('c');
  });
  test('with no next tab, the previous one', () => {
    expect(closeTab([t('a'), t('b')], 'b', 'b').selected).toBe('a');
  });
  test('a parent that is not next to it does not count', () => {
    expect(closeTab([t('a'), t('x'), t('b', 'a'), t('z')], 'b', 'b').selected).toBe('z');
  });
  test('closing a tab in the background leaves the selection', () => {
    expect(closeTab([t('a'), t('b'), t('c')], 'c', 'a').selected).toBe('a');
  });
  test('the last tab leaves nothing', () => {
    expect(closeTab([t('a')], 'a', 'a')).toEqual({ tabs: [], selected: null });
  });
  test('a closed tab\'s children pass to its own parent (page_parent_weak_notify)', () => {
    const { tabs } = closeTab([t('a'), t('b', 'a'), t('c', 'b')], 'b', 'c');
    expect(tabs).toEqual([t('a'), t('c', 'a')]);
  });
});

test('moving a tab stops at the ends', () => {
  const tabs = [t('a'), t('b'), t('c')];
  expect(ids(moveTab(tabs, 'b', -1))).toEqual(['b', 'a', 'c']);
  expect(ids(moveTab(tabs, 'b', 1))).toEqual(['a', 'c', 'b']);
  expect(ids(moveTab(tabs, 'a', -1))).toEqual(['a', 'b', 'c']);
  expect(ids(moveTab(tabs, 'c', 1))).toEqual(['a', 'b', 'c']);
});

test('nextTab: Ctrl+Page Up and Down wrap round (adw_tab_view_select_next_page with cycling)', () => {
  const tabs = [t('a'), t('b'), t('c')];
  expect(nextTab(tabs, 'a', 1)).toBe('b');
  expect(nextTab(tabs, 'c', 1)).toBe('a');
  expect(nextTab(tabs, 'a', -1)).toBe('c');
});
