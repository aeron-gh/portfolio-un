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

let ready = false; // the menu code has arrived and handles its own keys
let opener: Element | null = null;
// Escape before the code arrives bumps this, which cancels every opening asked for until then.
let cancels = 0;

async function toggleMenu(trigger: Element | null) {
  if (!ready && palRoot && palInput) {
    // First use: show the box and take focus now, so keys typed while the code downloads land in it.
    opener = trigger;
    palRoot.hidden = false;
    palInput.focus();
  }
  const asked = cancels;
  let m: Menu;
  try {
    m = await loadMenu();
  } catch {
    menu = undefined; // forget the failed load so the next Ctrl K tries again
    if (palRoot) palRoot.hidden = true;
    toast('Menu failed to load. Try again.');
    return;
  }
  ready = true;
  if (asked !== cancels) return;
  if (m.isOpen()) m.close();
  else m.open(trigger as HTMLElement | null);
}

palRoot?.addEventListener('keydown', (e) => {
  if (ready || e.key !== 'Escape' || !palInput) return;
  e.preventDefault();
  cancels++;
  palRoot.hidden = true;
  palInput.value = '';
  // Focus goes back to what opened it; <body> (Ctrl K from nothing focused) cannot take focus, so just leave the input.
  if (opener instanceof HTMLElement && opener !== document.body) opener.focus();
  else palInput.blur();
});

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
