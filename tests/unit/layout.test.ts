import { describe, expect, test } from 'bun:test';
import { DOCK_W, TOP_BAR, workArea } from '../../src/desktop/shell/layout';

describe('shell layout', () => {
  test('the work area sits right of the dock and below the top bar', () => {
    expect(TOP_BAR).toBe(32);
    expect(DOCK_W).toBe(66);
    expect(workArea(1280, 800)).toEqual({ x: 66, y: 32, w: 1214, h: 768 });
  });

  test('a tiny window never gives a negative area', () => {
    expect(workArea(40, 20)).toEqual({ x: 66, y: 32, w: 0, h: 0 });
  });
});
