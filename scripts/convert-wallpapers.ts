// One-time conversion of the desktop wallpapers to AVIF (at most 2560 px wide). Starts at quality 60 and
// steps down only for images that are still over the 250 KB budget.
// Needs ImageMagick (`magick`) and libavif (`avifenc`). Run: bun scripts/convert-wallpapers.ts
import { $ } from 'bun';
import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = 'desktop/assets/wallpapers';
const BUDGET = 250 * 1024;
const QUALITIES = [60, 52, 45, 38];
// Same order as the old CONFIG.backgrounds. The first one is the default wallpaper.
const SOURCES = [
  'ubuntu-logo-magenta-3840x2160-18138.png',
  'wp12561378-4k-ubuntu-wallpapers.jpg',
  'wp12561483-4k-ubuntu-wallpapers.jpg',
  'wp8398476-ubuntu-2004-wallpapers.jpg',
  'wp8398504-ubuntu-2004-wallpapers.jpg',
  'wp10240930-ubuntu-mate-wallpapers.jpg',
  'wallpaperflare.com_wallpaper.jpg',
  'wallpaperflare.com_wallpaper-un.jpg',
  'wallpaperflare.com_wallpaper .jpg',
];

const tmp = mkdtempSync(join(tmpdir(), 'wallpapers-'));
for (const [i, name] of SOURCES.entries()) {
  const out = `${DIR}/wallpaper-${String(i + 1).padStart(2, '0')}.avif`;
  const png = join(tmp, `${i}.png`);
  await $`magick ${`${DIR}/${name}`} -resize ${'2560x2560>'} ${png}`;
  let q = QUALITIES[0];
  for (q of QUALITIES) {
    await $`avifenc --speed 6 -q ${q} ${png} ${out}`.quiet();
    if (statSync(out).size <= BUDGET) break;
  }
  console.log(`${name} → ${out} (q${q}, ${Math.round(statSync(out).size / 1024)} KB)`);
}
