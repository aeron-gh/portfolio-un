import { describe, expect, test } from 'bun:test';
import { APPS, PINNED_DEFAULT, appById, availableApps, isAvailable, testModeFrom } from '../../src/desktop/apps/registry';

describe('app registry', () => {
  test('a visitor gets the apps that are built, and only those', () => {
    expect(availableApps(false).map((a) => a.id)).toEqual(['text-editor']);
    expect(APPS.filter((a) => a.built && !a.testOnly).every((a) => a.load)).toBe(true);
  });

  test('the two test apps exist only in test mode', () => {
    expect(availableApps(true).map((a) => a.id)).toEqual(['text-editor', 'test-window', 'test-utility']);
    expect(isAvailable(appById('test-window'), false)).toBe(false);
    expect(appById('test-utility').folder).toBe('Utilities');
  });

  test('test mode comes from ?test-apps', () => {
    expect(testModeFrom('?test-apps')).toBe(true);
    expect(testModeFrom('?embed=1&test-apps')).toBe(true);
    expect(testModeFrom('?embed=1')).toBe(false);
  });

  test('the dock pins follow Ubuntu order with the owner apps', () => {
    expect(PINNED_DEFAULT).toEqual(['firefox', 'files', 'terminal', 'text-editor', 'music', 'app-center', 'help']);
    for (const id of PINNED_DEFAULT) expect(appById(id).name.length).toBeGreaterThan(0);
  });
});
