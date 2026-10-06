import { expect, test } from 'bun:test';
import { nextTheme } from '../../src/scripts/theme';

test('the toggle goes System → Light → Dark → System', () => {
  expect(nextTheme('system')).toBe('light');
  expect(nextTheme('light')).toBe('dark');
  expect(nextTheme('dark')).toBe('system');
});
