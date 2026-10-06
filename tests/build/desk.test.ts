import { expect, test } from 'bun:test';
import { document } from './dom';

test('the desktop layer is a hidden modal dialog until boot', () => {
  const desk = document.querySelector('[data-desk]');
  expect(desk).not.toBeNull();
  expect(desk?.hasAttribute('hidden')).toBe(true);
  expect(desk?.getAttribute('role')).toBe('dialog');
  expect(desk?.getAttribute('aria-modal')).toBe('true');
  expect(desk?.querySelector('iframe')).toBeNull();
  expect(desk?.querySelector('[data-desk-retry]')).not.toBeNull();
  expect(desk?.querySelector('[data-desk-close]')).not.toBeNull();
});
