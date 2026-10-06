// Always-loaded keyboard/click wiring. The command menu itself is loaded on first use.
import { toast } from './toast';

type Menu = typeof import('./command-menu');
let menu: Promise<Menu> | undefined;
const loadMenu = () => (menu ??= import('./command-menu'));

if (/Mac|iPhone|iPad/.test(navigator.platform)) {
  document.querySelectorAll('.k-keys').forEach((k) => { k.textContent = '⌘ K'; });
}

const palRoot = document.querySelector<HTMLElement>('[data-pal]');
const palInput = palRoot?.querySelector<HTMLInputElement>('[data-pal-input]');

async function toggleMenu(trigger: Element | null) {
  if (!menu && palRoot && palInput) {
    // First use: show the box and take focus now, so keys typed while the code downloads land in it.
    palRoot.hidden = false;
    palInput.focus();
  }
  let m: Menu;
  try {
    m = await loadMenu();
  } catch {
    menu = undefined; // forget the failed load so the next Ctrl K tries again
    if (palRoot) palRoot.hidden = true;
    toast('Menu failed to load. Try again.');
    return;
  }
  if (m.isOpen()) m.close();
  else m.open(trigger as HTMLElement | null);
}

function requestBoot() {
  window.dispatchEvent(new CustomEvent('machine:boot'));
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || !!el.closest('input, textarea, select'));
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (document.documentElement.classList.contains('desk-open')) return; // the desktop has the keyboard
    void toggleMenu(document.activeElement);
    return;
  }
  if (e.key.toLowerCase() !== 'u' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (isTyping(e.target)) return;
  if (document.querySelector('[data-pal]:not([hidden])')) return;
  requestBoot();
});

document.addEventListener('click', (e) => {
  const target = e.target as Element;
  const cmdk = target.closest('[data-cmdk]');
  if (cmdk) { void toggleMenu(cmdk); return; }
  if (target.closest('[data-boot]')) requestBoot();
});
