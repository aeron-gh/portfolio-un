// The reactive settings store shared by every desktop component.
import { loadSettings, resolveStyle, safeStorage, saveSettings, type Settings } from './settings';

const store = typeof window === 'undefined' ? null : safeStorage();
const media = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)');

export const settings: Settings = $state(loadSettings(store));
export const appearance = $state({ prefersDark: media?.matches ?? false });

media?.addEventListener('change', (e) => {
  appearance.prefersDark = e.matches;
});

export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(settings, patch);
  saveSettings(store, $state.snapshot(settings));
}

export function currentStyle(): 'light' | 'dark' {
  return resolveStyle(settings.style, appearance.prefersDark);
}
