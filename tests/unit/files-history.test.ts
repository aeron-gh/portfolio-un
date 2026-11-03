import { describe, expect, test } from 'bun:test';
import { back, forward, goTo, startAt } from '../../src/desktop/apps/files/history';

describe('history (nautilus-window-slot.c)', () => {
  test('starts with nowhere to go', () => {
    const h = startAt('/a');
    expect(h).toEqual({ past: [], current: '/a', future: [] });
    expect(back(h)).toBe(h);
    expect(forward(h)).toBe(h);
  });
  test('going somewhere new puts the old place in the past', () => {
    expect(goTo(startAt('/a'), '/b')).toEqual({ past: ['/a'], current: '/b', future: [] });
  });
  test('going to where you already are changes nothing', () => {
    const h = startAt('/a');
    expect(goTo(h, '/a')).toBe(h);
  });
  test('back and forward walk the list', () => {
    const h = goTo(goTo(startAt('/a'), '/b'), '/c');
    const b = back(h);
    expect(b).toEqual({ past: ['/a'], current: '/b', future: ['/c'] });
    expect(forward(b)).toEqual(h);
  });
  test('the Back and Forward menus jump several places at once (slot.back-n, slot.forward-n)', () => {
    const h = goTo(goTo(goTo(startAt('/a'), '/b'), '/c'), '/d');
    expect(back(h, 2)).toEqual({ past: ['/a'], current: '/b', future: ['/c', '/d'] });
    expect(forward(back(h, 2), 2)).toEqual({ past: ['/a', '/b', '/c'], current: '/d', future: [] });
  });
  test('going somewhere new from the middle clears the way forward (handle_go_elsewhere)', () => {
    const h = back(goTo(goTo(startAt('/a'), '/b'), '/c'));
    expect(goTo(h, '/d')).toEqual({ past: ['/a', '/b'], current: '/d', future: [] });
  });
});
