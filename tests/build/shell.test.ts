import { describe, expect, test } from 'bun:test';
import { document, html } from './dom';

describe('page shell', () => {
  test('has title, description and language', () => {
    expect(document.title).toBe('Abhishek Agarwal · Compilers & cloud-native');
    const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(desc.length).toBeGreaterThan(50);
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });

  test('CSS is inlined and no script blocks rendering', () => {
    expect(document.querySelectorAll('link[rel="stylesheet"]').length).toBe(0);
    expect(document.querySelectorAll('style').length).toBeGreaterThan(0);
    for (const s of document.querySelectorAll('script[src]')) {
      expect(s.getAttribute('type')).toBe('module');
    }
  });

  test('theme script runs in the head and adds the js class', () => {
    const first = document.head.querySelector('script:not([src])');
    expect(first?.textContent).toContain("classList.add('js')");
    expect(first?.textContent).toContain('localStorage');
  });

  test('fonts are self-hosted and at most two files are preloaded', () => {
    expect(html).not.toContain('fonts.googleapis.com');
    const preloads = document.querySelectorAll('link[rel="preload"][as="font"]');
    expect(preloads.length).toBeGreaterThan(0);
    expect(preloads.length).toBeLessThanOrEqual(2);
  });

  test('has a skip link to the main content', () => {
    expect(document.querySelector('a.skip')?.getAttribute('href')).toBe('#main');
    expect(document.querySelector('main#main')).not.toBeNull();
  });
});
