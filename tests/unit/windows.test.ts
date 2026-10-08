import { describe, expect, test } from 'bun:test';
import {
  CASCADE, HEADER_KEEP, appWindows, closeWin, createWm, focusWin, grabFromMaximized, minimizeWin, moveToWorkspace,
  moveWin, openWin, resizeRect, runningApps, setArea, switchWorkspace, tileRect, tileWin, toggleMaximize, topmost, unmaximizeWin,
  visibleWins, workspaceCount, type Wm,
} from '../../src/desktop/wm/windows';

const AREA = { x: 66, y: 32, w: 1214, h: 768 };
const SIZE = { w: 600, h: 400, minW: 300, minH: 200 };
const fresh = (): Wm => createWm({ ...AREA });
const win = (wm: Wm, id: string) => wm.wins.find((w) => w.id === id)!;

describe('opening and focus', () => {
  test('new windows open centred in the work area, then cascade by 30px', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    expect(win(wm, a).rect).toEqual({ x: 66 + 307, y: 32 + 184, w: 600, h: 400 });
    const b = openWin(wm, 'test-window', SIZE, 'B');
    expect(win(wm, b).rect).toEqual({ x: 66 + 307 + CASCADE, y: 32 + 184 + CASCADE, w: 600, h: 400 });
    expect(wm.focused).toBe(b);
  });

  test('a window larger than the work area is shrunk to fit', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', { w: 5000, h: 5000, minW: 300, minH: 200 }, 'Big');
    expect(win(wm, a).rect).toEqual({ ...AREA });
  });

  test('focus raises, un-minimises and follows the window to its workspace', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    const b = openWin(wm, 'test-window', SIZE, 'B');
    minimizeWin(wm, a);
    focusWin(wm, a);
    expect(win(wm, a).minimized).toBe(false);
    expect(topmost(wm)?.id).toBe(a);
    expect(visibleWins(wm).map((w) => w.id)).toEqual([b, a]);
  });

  test('closing the focused window focuses the next one in front', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    const b = openWin(wm, 'test-utility', SIZE, 'B');
    closeWin(wm, b);
    expect(wm.focused).toBe(a);
    closeWin(wm, a);
    expect(wm.focused).toBeNull();
  });

  test('minimising moves focus; minimising an already minimised window does nothing', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    const b = openWin(wm, 'test-window', SIZE, 'B');
    minimizeWin(wm, b);
    expect(wm.focused).toBe(a);
    const z = win(wm, b).z;
    minimizeWin(wm, b);
    expect(win(wm, b).z).toBe(z);
    expect(wm.focused).toBe(a);
  });

  test('app windows are listed most recent first; running apps in launch order', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    openWin(wm, 'test-utility', SIZE, 'U');
    const c = openWin(wm, 'test-window', SIZE, 'C');
    focusWin(wm, a);
    expect(appWindows(wm, 'test-window').map((w) => w.id)).toEqual([a, c]);
    expect(runningApps(wm)).toEqual(['test-window', 'test-utility']);
  });
});

describe('maximise, tile, restore', () => {
  test('maximise fills the work area and restores the previous frame', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    const before = { ...win(wm, a).rect };
    toggleMaximize(wm, a);
    expect(win(wm, a).state).toBe('maximized');
    expect(win(wm, a).rect).toEqual(AREA);
    toggleMaximize(wm, a);
    expect(win(wm, a).state).toBe('normal');
    expect(win(wm, a).rect).toEqual(before);
  });

  test('tiling takes half the work area; tiling the same side again restores', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    const before = { ...win(wm, a).rect };
    tileWin(wm, a, 'left');
    expect(win(wm, a).rect).toEqual(tileRect(AREA, 'left'));
    expect(tileRect(AREA, 'right')).toEqual({ x: 66 + 607, y: 32, w: 607, h: 768 });
    tileWin(wm, a, 'right');
    expect(win(wm, a).state).toBe('tiled-right');
    tileWin(wm, a, 'right');
    expect(win(wm, a).rect).toEqual(before);
  });

  test('quarters and top/bottom halves split the work area', () => {
    expect(tileRect(AREA, 'tl')).toEqual({ x: 66, y: 32, w: 607, h: 384 });
    expect(tileRect(AREA, 'br')).toEqual({ x: 673, y: 416, w: 607, h: 384 });
    expect(tileRect(AREA, 'top')).toEqual({ x: 66, y: 32, w: 1214, h: 384 });
    expect(tileRect(AREA, 'bottom')).toEqual({ x: 66, y: 416, w: 1214, h: 384 });
  });

  test('maximising a tiled window still restores the original normal frame', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    const before = { ...win(wm, a).rect };
    tileWin(wm, a, 'left');
    toggleMaximize(wm, a);
    toggleMaximize(wm, a);
    expect(win(wm, a).rect).toEqual(before);
  });

  test('Super+Down restores a maximised or tiled window and leaves a normal one alone', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    const before = { ...win(wm, a).rect };
    unmaximizeWin(wm, a);
    expect(win(wm, a).rect).toEqual(before);
    toggleMaximize(wm, a);
    unmaximizeWin(wm, a);
    expect(win(wm, a).state).toBe('normal');
    expect(win(wm, a).rect).toEqual(before);
  });

  test('grabbing a maximised window restores its size under the pointer', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    toggleMaximize(wm, a);
    // pointer at 25% across the maximised header bar
    const px = AREA.x + AREA.w * 0.25;
    grabFromMaximized(wm, a, px);
    const r = win(wm, a).rect;
    expect(win(wm, a).state).toBe('normal');
    expect(r.w).toBe(600);
    expect(r.x).toBe(Math.round(px - 600 * 0.25));
    expect(r.y).toBe(AREA.y);
  });
});

describe('moving and resizing', () => {
  test('moving clamps so the header bar stays reachable', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    moveWin(wm, a, -5000, -5000);
    expect(win(wm, a).rect.x).toBe(AREA.x - 600 + HEADER_KEEP);
    expect(win(wm, a).rect.y).toBe(AREA.y);
    moveWin(wm, a, 99999, 99999);
    expect(win(wm, a).rect.x).toBe(AREA.x + AREA.w - HEADER_KEEP);
    expect(win(wm, a).rect.y).toBe(AREA.y + AREA.h - HEADER_KEEP);
  });

  test('resizing keeps the minimum size from every edge', () => {
    const start = { x: 400, y: 300, w: 600, h: 400 };
    expect(resizeRect(start, 'se', 100, 50, 300, 200, AREA)).toEqual({ x: 400, y: 300, w: 700, h: 450 });
    expect(resizeRect(start, 'w', 500, 0, 300, 200, AREA)).toEqual({ x: 700, y: 300, w: 300, h: 400 });
    expect(resizeRect(start, 'n', 0, 300, 300, 200, AREA)).toEqual({ x: 400, y: 500, w: 600, h: 200 });
  });

  test('the top edge cannot be dragged above the work area', () => {
    const start = { x: 400, y: 100, w: 600, h: 400 };
    expect(resizeRect(start, 'n', 0, -500, 300, 200, AREA)).toEqual({ x: 400, y: 32, w: 600, h: 468 });
  });

  test('a smaller browser re-fits maximised and tiled windows and pulls normal ones back in', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    const b = openWin(wm, 'test-window', SIZE, 'B');
    const c = openWin(wm, 'test-window', SIZE, 'C');
    toggleMaximize(wm, a);
    tileWin(wm, b, 'right');
    moveWin(wm, c, AREA.x + AREA.w - HEADER_KEEP, AREA.y + 500);
    const small = { x: 66, y: 32, w: 600, h: 400 };
    setArea(wm, small);
    expect(win(wm, a).rect).toEqual(small);
    expect(win(wm, b).rect).toEqual(tileRect(small, 'right'));
    const r = win(wm, c).rect;
    expect(r.w).toBeLessThanOrEqual(600);
    expect(r.x).toBeLessThanOrEqual(small.x + small.w - HEADER_KEEP);
    expect(r.y).toBeLessThanOrEqual(small.y + small.h - HEADER_KEEP);
  });
});

describe('dynamic workspaces', () => {
  test('there is always exactly one empty workspace at the end', () => {
    const wm = fresh();
    expect(workspaceCount(wm)).toBe(1);
    const a = openWin(wm, 'test-window', SIZE, 'A');
    expect(workspaceCount(wm)).toBe(2);
    moveToWorkspace(wm, a, 1); // the active workspace is empty now, but it stays until we leave it
    expect(win(wm, a).workspace).toBe(1);
    expect(workspaceCount(wm)).toBe(3);
    expect(wm.focused).toBeNull();
  });

  test('moving a window to the trailing workspace adds a new empty one', () => {
    const wm = fresh();
    openWin(wm, 'test-window', SIZE, 'A');
    const b = openWin(wm, 'test-window', SIZE, 'B');
    moveToWorkspace(wm, b, 1);
    expect(win(wm, b).workspace).toBe(1);
    expect(workspaceCount(wm)).toBe(3);
    expect(wm.focused).not.toBe(b);
  });

  test('a workspace left empty disappears once it is not the active one', () => {
    const wm = fresh();
    const a = openWin(wm, 'test-window', SIZE, 'A');
    const b = openWin(wm, 'test-window', SIZE, 'B');
    moveToWorkspace(wm, b, 1); // [A] [B] [empty]
    switchWorkspace(wm, 1);
    closeWin(wm, a); // workspace 0 is empty and not active: it goes away
    expect(win(wm, b).workspace).toBe(0);
    expect(wm.workspace).toBe(0);
    expect(workspaceCount(wm)).toBe(2);
  });

  test('switching is clamped to existing workspaces', () => {
    const wm = fresh();
    switchWorkspace(wm, 7);
    expect(wm.workspace).toBe(0);
  });
});
