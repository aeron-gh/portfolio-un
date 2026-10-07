import { describe, expect, test } from 'bun:test';
import { CELL, MARGIN, cellAt, cellToXY, gridSize, layout, nearestFree } from '../../src/desktop/shell/desktop-grid';
import { iconFor, noAppDialog, typeLabel } from '../../src/desktop/shell/file-icons';

describe('desktop icon grid', () => {
  test('grid size from the area left under the top bar', () => {
    expect(gridSize(1280, 768)).toEqual({ cols: Math.floor((1280 - 2 * MARGIN) / CELL.w), rows: Math.floor((768 - 2 * MARGIN) / CELL.h) });
  });

  test('icons fill from the bottom-right corner upwards, then leftwards', () => {
    const l = layout(['home', 'a', 'b'], {}, 3, 2);
    expect(l).toEqual({ home: { col: 0, row: 0 }, a: { col: 0, row: 1 }, b: { col: 1, row: 0 } });
  });

  test('saved positions win; clashes and off-grid cells are re-placed', () => {
    const l = layout(['home', 'a', 'b'], { a: { col: 2, row: 1 }, b: { col: 2, row: 1 } }, 3, 2);
    expect(l.a).toEqual({ col: 2, row: 1 });
    expect(l.home).toEqual({ col: 0, row: 0 });
    expect(l.b).toEqual({ col: 0, row: 1 });
  });

  test('saved cells outside the grid are re-placed', () => {
    const l = layout(['home', 'a'], { a: { col: 12, row: 9 } }, 4, 3);
    expect(l.a).toEqual({ col: 0, row: 1 });
  });

  test('cell ↔ pixel position', () => {
    expect(cellToXY({ col: 0, row: 0 }, 1280, 768)).toEqual({ x: 1280 - MARGIN - CELL.w, y: 768 - MARGIN - CELL.h });
    expect(cellAt(1280 - MARGIN - CELL.w / 2, 768 - MARGIN - CELL.h / 2, 1280, 768, 13, 6)).toEqual({ col: 0, row: 0 });
  });

  test('nearest free cell spirals out from the target', () => {
    const used = new Set(['0,0', '0,1']);
    expect(nearestFree({ col: 0, row: 0 }, used, 3, 3)).toEqual({ col: 1, row: 0 });
  });
});

describe('file icons', () => {
  const T = '2026-10-07T00:00:00Z';
  test('folders, home, markdown, PDF, images, other', () => {
    expect(iconFor('/home/ubuntu', { name: 'ubuntu', kind: 'dir', size: 0, mtime: T })).toBe('user-home');
    expect(iconFor('/home/ubuntu/Desktop', { name: 'Desktop', kind: 'dir', size: 0, mtime: T })).toBe('user-desktop');
    expect(iconFor('/x/a.md', { name: 'a.md', kind: 'file', mime: 'text/markdown', size: 0, mtime: T })).toBe('text-markdown');
    expect(iconFor('/x/r.pdf', { name: 'r.pdf', kind: 'file', mime: 'application/pdf', size: 0, mtime: T })).toBe('application-pdf');
    expect(iconFor('/x/p.avif', { name: 'p.avif', kind: 'file', mime: 'image/avif', size: 0, mtime: T })).toBe('image-x-generic');
    expect(iconFor('/x/f', { name: 'f', kind: 'dir', size: 0, mtime: T })).toBe('folder');
    expect(typeLabel({ name: 'a.md', kind: 'file', mime: 'text/markdown', size: 0, mtime: T })).toBe('Markdown document');
    expect(typeLabel({ name: 'p.webp', kind: 'file', mime: 'image/webp', size: 0, mtime: T })).toBe('WebP image');
    expect(typeLabel({ name: 'f', kind: 'dir', size: 0, mtime: T })).toBe('Folder');
  });

  test('the no-app dialog uses the Nautilus wording', () => {
    expect(noAppDialog('README.md', { name: 'README.md', kind: 'file', mime: 'text/markdown', size: 0, mtime: T })).toEqual({
      title: 'Could Not Display “README.md”',
      body: 'There is no app installed for “Markdown document” files',
    });
    expect(noAppDialog('blob', { name: 'blob', kind: 'file', mime: 'application/octet-stream', size: 0, mtime: T }).body).toBe('The file is of an unknown type');
  });
});
