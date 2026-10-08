import { describe, expect, test } from 'bun:test';
import { EDGE, freeTile, popupCandidates, snapFor, snapRect } from '../../src/desktop/wm/tiling';
import { createWm, minimizeWin, openWin, tileRect } from '../../src/desktop/wm/windows';

const AREA = { x: 66, y: 32, w: 1214, h: 768 };
const MID = { x: 400, y: 300, w: 600, h: 400 };
const ATTOP = { ...MID, y: AREA.y };

describe('edge snapping (Tiling Assistant)', () => {
  test('the four edges', () => {
    expect(snapFor(640, AREA.y + EDGE, MID, AREA)).toBe('maximize');
    expect(snapFor(640, AREA.y + AREA.h - EDGE, MID, AREA)).toBe('bottom');
    expect(snapFor(AREA.x + EDGE, 400, MID, AREA)).toBe('left');
    expect(snapFor(AREA.x + AREA.w - EDGE, 400, MID, AREA)).toBe('right');
    expect(snapFor(640, 400, MID, AREA)).toBeNull();
  });

  test('the pointer over the dock or the top bar still counts as the edge', () => {
    expect(snapFor(5, 400, MID, AREA)).toBe('left');
    expect(snapFor(640, 3, MID, AREA)).toBe('maximize');
  });

  test('corners tile to quarters', () => {
    expect(snapFor(AREA.x, AREA.y, MID, AREA)).toBe('tl');
    expect(snapFor(AREA.x + AREA.w, AREA.y, MID, AREA)).toBe('tr');
    expect(snapFor(AREA.x, AREA.y + AREA.h, MID, AREA)).toBe('bl');
    expect(snapFor(AREA.x + AREA.w, AREA.y + AREA.h, MID, AREA)).toBe('br');
  });

  test('a window already touching the top makes a side edge mean the top quarter', () => {
    expect(snapFor(AREA.x + 2, 400, ATTOP, AREA)).toBe('tl');
    expect(snapFor(AREA.x + AREA.w - 2, 400, ATTOP, AREA)).toBe('tr');
  });

  test('preview rectangles', () => {
    expect(snapRect('maximize', AREA)).toEqual(AREA);
    expect(snapRect('left', AREA)).toEqual(tileRect(AREA, 'left'));
    expect(snapRect(null, AREA)).toBeNull();
  });
});

describe('tiling popup', () => {
  test('a half leaves the opposite half free; quarters leave no single free tile', () => {
    expect(freeTile('left')).toBe('right');
    expect(freeTile('top')).toBe('bottom');
    expect(freeTile('tl')).toBeNull();
  });

  test('offers the other visible windows of this workspace, most recent first', () => {
    const wm = createWm({ ...AREA });
    const size = { w: 400, h: 300, minW: 200, minH: 150 };
    const a = openWin(wm, 'test-window', size, 'A');
    const b = openWin(wm, 'test-utility', size, 'B');
    const c = openWin(wm, 'test-window', size, 'C');
    const d = openWin(wm, 'test-window', size, 'D');
    minimizeWin(wm, d);
    expect(popupCandidates(wm, a).map((w) => w.id)).toEqual([c, b]);
  });
});
