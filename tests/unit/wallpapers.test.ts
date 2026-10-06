import { expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';

const config = readFileSync('desktop/src/js/config.js', 'utf8');
const listed = [...config.matchAll(/"(assets\/wallpapers\/[^"]+)"/g)].map((m) => m[1]);

test('config lists nine AVIF wallpapers', () => {
  expect(listed.length).toBe(9);
  for (const p of listed) expect(p).toMatch(/^assets\/wallpapers\/wallpaper-0\d\.avif$/);
});

test('every listed wallpaper exists and is at most 250 KB', () => {
  for (const p of listed) expect(statSync(`desktop/${p}`).size).toBeLessThanOrEqual(250 * 1024);
});

test('no PNG or JPEG wallpapers remain', () => {
  expect(readdirSync('desktop/assets/wallpapers').filter((f) => !f.endsWith('.avif'))).toEqual([]);
});

test('the default wallpaper is the first one', () => {
  expect(config).toContain(`defaultWallpaper: "url('assets/wallpapers/wallpaper-01.avif')"`);
});

test('the Settings display preview uses the AVIF too', () => {
  const css = readFileSync('desktop/src/css/apps.css', 'utf8');
  expect(css).not.toMatch(/wallpapers\/[^)'"]+\.(png|jpe?g)/);
  expect(css).toContain("url('../../assets/wallpapers/wallpaper-01.avif')");
});

test('the desktop no longer carries a fallback list of old or remote wallpapers', () => {
  const desktop = readFileSync('desktop/src/js/desktop.js', 'utf8');
  expect(desktop).not.toContain('unsplash.com');
  expect(desktop).not.toContain('wallpaperflare');
});
