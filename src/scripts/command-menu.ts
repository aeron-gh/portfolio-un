import { profile } from '../content/profile';
import { filterCommands, type Command } from '../lib/fuzzy';
import { copyText } from './copy-text';
import { setTheme } from './theme';
import { toast } from './toast';

type Action = Command & { run: () => void | Promise<void> };

const root = document.querySelector<HTMLElement>('[data-pal]')!;
const input = root.querySelector<HTMLInputElement>('[data-pal-input]')!;
const list = root.querySelector<HTMLUListElement>('[data-pal-list]')!;
const resume = root.dataset.resume ?? '';

const goTo = (id: string) => () => document.getElementById(id)?.scrollIntoView({ block: 'start' });
const visit = (href: string) => () => { window.location.href = href; };

const actions: Action[] = [
  { id: 'boot', label: 'Boot Ubuntu machine', hint: 'U', keywords: 'desktop start ubuntu', run: () => { window.dispatchEvent(new CustomEvent('machine:boot')); } },
  { id: 'email', label: 'Copy email', keywords: 'contact mail address', run: async () => { toast((await copyText(profile.email)) ? 'Email copied' : 'Press Ctrl C to copy'); } },
  ...(resume ? [{ id: 'resume', label: 'Download resume', keywords: 'cv pdf', run: visit(resume) }] : []),
  { id: 'go-oss', label: 'Go to Open source', keywords: 'prs contributions cncf p4', run: goTo('oss') },
  { id: 'go-building', label: 'Go to Building', keywords: 'projects partlore opentrail', run: goTo('building') },
  { id: 'go-contact', label: 'Go to Contact', keywords: 'email hire', run: goTo('contact') },
  { id: 'theme-system', label: 'Theme: System', keywords: 'auto', run: () => setTheme('system') },
  { id: 'theme-light', label: 'Theme: Light', run: () => setTheme('light') },
  { id: 'theme-dark', label: 'Theme: Dark', run: () => setTheme('dark') },
  ...profile.links.map((l) => ({ id: `open-${l.label.toLowerCase()}`, label: `Open ${l.label}`, run: visit(l.href) })),
];

let shown: Action[] = actions;
let sel = 0;
let opened = false;
let trigger: HTMLElement | null = null;
let hideTimer: number | undefined;

function render() {
  shown = filterCommands(actions, input.value);
  sel = Math.min(sel, Math.max(0, shown.length - 1));
  list.replaceChildren();
  if (shown.length === 0) {
    const li = document.createElement('li');
    li.className = 'pal-empty';
    li.textContent = 'No results';
    list.append(li);
    input.removeAttribute('aria-activedescendant');
    return;
  }
  shown.forEach((a, i) => {
    const li = document.createElement('li');
    li.id = `pal-${a.id}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === sel));
    li.dataset.i = String(i);
    li.textContent = a.label;
    if (a.hint) {
      const k = document.createElement('kbd');
      k.textContent = a.hint;
      li.append(k);
    }
    list.append(li);
  });
  input.setAttribute('aria-activedescendant', `pal-${shown[sel].id}`);
  list.children[sel]?.scrollIntoView({ block: 'nearest' });
}

let inertEls: HTMLElement[] = [];

/** While the menu is open, everything else on the page is inert (no Tab, no screen reader). */
function setPageInert(on: boolean) {
  if (on) {
    inertEls = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== root && el.id !== 'toast' && !el.inert,
    );
    inertEls.forEach((el) => { el.inert = true; });
  } else {
    inertEls.forEach((el) => { el.inert = false; });
    inertEls = [];
  }
}

export function isOpen(): boolean {
  return opened;
}

export function open(from?: HTMLElement | null): void {
  if (opened) return;
  opened = true;
  trigger = from ?? null;
  window.clearTimeout(hideTimer);
  root.hidden = false;
  setPageInert(true);
  sel = 0; // keep anything typed while the menu code was loading
  render();
  input.focus();
  requestAnimationFrame(() => root.classList.add('open'));
}

export function close(): void {
  if (!opened) return;
  opened = false;
  input.value = '';
  root.classList.remove('open');
  hideTimer = window.setTimeout(() => { root.hidden = true; }, 200);
  setPageInert(false); // before focusing: inert elements cannot take focus
  trigger?.focus();
  // Opened with Ctrl K from nothing focused, the trigger is <body>, which cannot take focus.
  // Leave the closing input anyway, or U would count as typing until the browser's next redraw.
  if (root.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
}

async function run(i: number) {
  const a = shown[i];
  if (!a) return;
  close();
  await a.run();
}

input.addEventListener('input', () => { sel = 0; render(); });
root.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); render(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
  else if (e.key === 'Enter') { e.preventDefault(); void run(sel); }
  else if (e.key === 'Escape') { e.preventDefault(); close(); }
  else if (e.key === 'Tab') { e.preventDefault(); } // keep focus inside the dialog
});
list.addEventListener('click', (e) => {
  const li = (e.target as Element).closest<HTMLElement>('li[data-i]');
  if (li) void run(Number(li.dataset.i));
});
list.addEventListener('mousemove', (e) => {
  const li = (e.target as Element).closest<HTMLElement>('li[data-i]');
  if (li && Number(li.dataset.i) !== sel) { sel = Number(li.dataset.i); render(); }
});
root.addEventListener('mousedown', (e) => {
  if (e.target === root) { e.preventDefault(); close(); return; }
  // Clicks on the list or padding must not pull focus out of the input.
  if (e.target !== input) e.preventDefault();
});
