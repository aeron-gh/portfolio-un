import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import snapshot from '../../src/data/github.snapshot.json';
import { roundedTotal } from '../../src/lib/github';

const page = readFileSync('dist/desktop/index.html', 'utf8');
const js = readFileSync('dist/desktop/app.js', 'utf8');
const css = readFileSync('dist/desktop/app.css', 'utf8');

describe('built desktop', () => {
  test('the page loads one CSS file and one JS file', () => {
    expect(page.match(/<script src="app\.js"><\/script>/g)?.length).toBe(1);
    expect(page.match(/<link rel="stylesheet" href="app\.css">/g)?.length).toBe(1);
    expect(page).not.toContain('src/js/');
  });

  test('JS is at most 80 KB and CSS at most 25 KB gzipped', () => {
    expect(gzipSync(js).length).toBeLessThanOrEqual(80 * 1024);
    expect(gzipSync(css).length).toBeLessThanOrEqual(25 * 1024);
  });

  test('window.SITE comes first and carries the rounded PR total', () => {
    expect(js.startsWith('window.SITE=')).toBe(true);
    expect(js).toContain(`total:"${roundedTotal(snapshot.total)}"`);
  });

  test('CSS image paths point next to app.css', () => {
    expect(css).not.toContain('../../assets/');
    expect(css).toMatch(/url\(["']?assets\/wallpapers\/wallpaper-01\.avif/);
  });

  test('only AVIF wallpapers are shipped', () => {
    expect(readdirSync('dist/desktop/assets/wallpapers').filter((f) => !f.endsWith('.avif'))).toEqual([]);
  });
});


describe('desktop content', () => {
  test('no song files are shipped or referenced', () => {
    expect(existsSync('dist/desktop/assets/songs')).toBe(false);
    expect(js).not.toContain('assets/songs');
  });

  test('the old placeholders are gone', () => {
    expect(js).not.toContain('your-linkedin-here');
    expect(js).not.toContain('your.email@example.com');
  });

  test('the new facts are in', () => {
    expect(js).toContain('p4lang');
    expect(js).toContain('Partlore');
  });
});
