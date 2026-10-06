import { getTheme, nextTheme, setTheme } from './theme';

const NAMES = { system: 'System', light: 'Light', dark: 'Dark' } as const;
const label = document.querySelector<HTMLElement>('[data-theme-label]');
const sync = () => { if (label) label.textContent = NAMES[getTheme()]; };

sync();
window.addEventListener('theme:change', sync);
document.querySelector('[data-theme-toggle]')?.addEventListener('click', (e) => {
  const m = e as MouseEvent;
  setTheme(nextTheme(getTheme()), { x: m.clientX, y: m.clientY });
});
