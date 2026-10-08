import { describe, expect, test } from 'bun:test';
import { APPS } from '../../src/desktop/apps/registry';
import { MAX_ROWS, fileHits, score, searchApps, searchPanels, terms } from '../../src/desktop/shell/search';

describe('overview search', () => {
  test('terms are lower-case words', () => {
    expect(terms('  Text  EDitor ')).toEqual(['text', 'editor']);
  });

  test('a name prefix beats a keyword, every term must match', () => {
    expect(score('Text Editor', ['notes'], ['te'])).toBeGreaterThan(score('Settings', ['preferences'], ['te']));
    expect(score('Text Editor', ['notes'], ['notes'])).toBeGreaterThan(0);
    expect(score('Text Editor', ['notes'], ['text', 'zzz'])).toBe(0);
  });

  test('app results are ranked and only include the apps given', () => {
    const test = APPS.filter((a) => a.testOnly);
    expect(searchApps(test, 'test').map((a) => a.id)).toEqual(['test-utility', 'test-window']);
    expect(searchApps(test, 'utility').map((a) => a.id)).toEqual(['test-utility']);
    expect(searchApps([], 'test')).toEqual([]);
  });

  test('settings panels match names and keywords, at most five', () => {
    expect(searchPanels('wallpaper').map((p) => p.name)).toEqual(['Appearance']);
    expect(searchPanels('s').length).toBeLessThanOrEqual(MAX_ROWS);
  });

  test('file hits show the name and the folder with ~ for home', () => {
    expect(fileHits(['/home/ubuntu/Desktop/README.md'])).toEqual([{ path: '/home/ubuntu/Desktop/README.md', name: 'README.md', parent: '~/Desktop' }]);
  });
});
