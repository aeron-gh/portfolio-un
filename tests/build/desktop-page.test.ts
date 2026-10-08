import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';

const html = readFileSync('dist/desktop/index.html', 'utf8');
const { document } = parseHTML(html);

describe('desktop page', () => {
  test('is kept out of search results', () => {
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
  });

  test('paints the boot screen from plain HTML', () => {
    expect(document.querySelector('#plymouth .plymouth-spinner')).not.toBeNull();
    expect(document.querySelector('#plymouth .plymouth-logo')).not.toBeNull();
  });

  test('mounts the Svelte desktop on the client only', () => {
    expect(document.querySelector('astro-island')?.getAttribute('client')).toBe('only');
  });

  test('self-hosts Ubuntu Sans and inlines CSS', () => {
    expect(html).not.toContain('fonts.googleapis.com');
    expect(document.querySelectorAll('link[rel="preload"][as="font"]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('link[rel="stylesheet"]').length).toBe(0);
  });
});
