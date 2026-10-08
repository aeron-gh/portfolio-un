import { describe, expect, test } from 'bun:test';
import { appOrder, firstIndex, groupOrder, step, windowOrder } from '../../src/desktop/wm/switcher';
import { createWm, focusWin, minimizeWin, moveToWorkspace, openWin } from '../../src/desktop/wm/windows';

const size = { w: 400, h: 300, minW: 200, minH: 150 };

describe('switcher order', () => {
  test('Alt+Tab lists this workspace\'s windows, minimised ones too, most recent first', () => {
    const wm = createWm({ x: 66, y: 32, w: 1214, h: 768 });
    const a = openWin(wm, 'test-window', size, 'A');
    const b = openWin(wm, 'test-utility', size, 'B');
    const c = openWin(wm, 'test-window', size, 'C');
    const d = openWin(wm, 'test-window', size, 'D');
    moveToWorkspace(wm, d, 1);
    minimizeWin(wm, b);
    focusWin(wm, a);
    expect(windowOrder(wm).map((w) => w.id)).toEqual([a, c, b]);
  });

  test('Super+Tab lists apps from every workspace, most recent first', () => {
    const wm = createWm({ x: 66, y: 32, w: 1214, h: 768 });
    const a = openWin(wm, 'test-window', size, 'A');
    const u = openWin(wm, 'test-utility', size, 'U');
    moveToWorkspace(wm, u, 1);
    focusWin(wm, a);
    expect(appOrder(wm)).toEqual(['test-window', 'test-utility']);
  });

  test('Alt+` lists the focused app\'s windows on this workspace', () => {
    const wm = createWm({ x: 66, y: 32, w: 1214, h: 768 });
    const a = openWin(wm, 'test-window', size, 'A');
    openWin(wm, 'test-utility', size, 'U');
    const c = openWin(wm, 'test-window', size, 'C');
    expect(groupOrder(wm).map((w) => w.id)).toEqual([c, a]);
  });

  test('the first press picks the previous entry; stepping wraps both ways', () => {
    expect(firstIndex(3)).toBe(1);
    expect(firstIndex(1)).toBe(0);
    expect(step(2, 3, 1)).toBe(0);
    expect(step(0, 3, -1)).toBe(2);
    expect(step(0, 0, 1)).toBe(0);
  });
});
