import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { parseHTML } from 'linkedom';

const html = readFileSync('dist/desktop-next/index.html', 'utf8');
const { document } = parseHTML(html);
const gz = (s: string | Buffer) => gzipSync(s).length;
const KB = 1024;

/** JS files reachable through static imports (dynamic import() is excluded: that code loads on demand). */
function staticGraph(entries: string[]): string[] {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const code = readFileSync(`dist${url}`, 'utf8');
    for (const m of code.matchAll(/(?:import|export)\s*(?:[^'"()]*?from\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g)) {
      queue.push(new URL(m[1], `http://x${url}`).pathname);
    }
  }
  return [...seen];
}

describe('desktop-next budgets', () => {
  test('shell JS is at most 45 KB gzipped', () => {
    const island = document.querySelector('astro-island')!;
    const entries = [island.getAttribute('component-url')!, island.getAttribute('renderer-url')!, ...[...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')!)];
    const total = staticGraph(entries).reduce((sum, url) => sum + gz(readFileSync(`dist${url}`)), 0);
    expect(total).toBeLessThanOrEqual(45 * KB);
  });

  test('page CSS is at most 20 KB gzipped', () => {
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent ?? '').join('\n');
    expect(gz(css)).toBeLessThanOrEqual(20 * KB);
  });

  test('preloaded Ubuntu Sans files are at most 60 KB', () => {
    const fonts = [...document.querySelectorAll('link[rel="preload"][as="font"]')].map((l) => l.getAttribute('href')!);
    const total = fonts.reduce((sum, href) => sum + statSync(`dist${href}`).size, 0);
    expect(total).toBeLessThanOrEqual(60 * KB);
  });

  test('the inlined seed is at most 15 KB gzipped', () => {
    const props = document.querySelector('astro-island')!.getAttribute('props')!;
    expect(gz(props)).toBeLessThanOrEqual(15 * KB);
  });
});
