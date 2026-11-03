import { describe, expect, test } from 'bun:test';
import { dragToScroll, slider } from '../../src/desktop/apps/adw/scrollbar';

describe('the overlay scrollbar (gtkscrollbar, _scrolling.scss)', () => {
  test('nothing to scroll: no slider', () => {
    expect(slider({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 })).toBeNull();
  });
  test('the slider shows how much is in view; 9px is kept at each end of the trough', () => {
    const s = slider({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })!;
    expect(s.top).toBe(9);
    expect(s.length).toBe(241); // half of 482
  });
  test('it travels the rest of the trough', () => {
    expect(slider({ scrollTop: 500, scrollHeight: 1000, clientHeight: 500 })!.top).toBe(250);
    expect(slider({ scrollTop: 250, scrollHeight: 1000, clientHeight: 500 })!.top).toBeCloseTo(129.5);
  });
  test('it is never shorter than 40px', () => {
    const s = slider({ scrollTop: 9500, scrollHeight: 10000, clientHeight: 500 })!;
    expect(s.length).toBe(40);
    expect(s.top).toBe(451);
  });
  test('dragging moves the content in proportion', () => {
    const m = { scrollHeight: 1000, clientHeight: 500 };
    expect(dragToScroll(0, 241, m)).toBe(500);
    expect(dragToScroll(100, 10, m)).toBeCloseTo(120.7, 1);
    expect(dragToScroll(0, -50, m)).toBe(0);
    expect(dragToScroll(500, 900, m)).toBe(500);
  });
});
