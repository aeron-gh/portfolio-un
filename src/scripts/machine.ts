// Homepage side of the Ubuntu machine: grow from the miniature, boot the desktop in an iframe,
// shrink back on exit, error + retry, prefetch, and the phone fallback.
import { DESKTOP_PREFETCH, DESKTOP_URL } from '../lib/desktop-assets';
import { toast } from './toast';

const GROW_MS = 800;
const MIN_BOOT_MS = 900;
const TIMEOUT_MS = 8000;
const HINT_MS = 3000;
const RADIUS = 12;

const desk = document.querySelector<HTMLElement>('[data-desk]');
const errorPanel = desk?.querySelector<HTMLElement>('[data-desk-error]') ?? null;
const small = window.matchMedia('(hover: none), (max-width: 719px)');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

type State = 'off' | 'booting' | 'on' | 'stopping';
let state: State = 'off';
let frame: HTMLIFrameElement | null = null;
let returnFocus: HTMLElement | null = null;
let bootStarted = 0;
let readyTimer: number | undefined;
let hintTimer: number | undefined;
let anim: Animation | null = null;
let inertEls: HTMLElement[] = [];

function visibleRect(el: Element | null): DOMRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight ? r : null;
}

/** Where the desktop grows from and shrinks back to: the miniature, else the header pill, else the centre. */
function sourceRect(): DOMRect {
  return (
    visibleRect(document.querySelector('[data-mini]')) ??
    visibleRect(document.querySelector('.boot-pill')) ??
    new DOMRect(window.innerWidth / 2 - 40, window.innerHeight / 2 - 25, 80, 50)
  );
}

/** FLIP: the transform that makes the full-screen desk sit exactly on `r` (radius corrected for the scale). */
function keyframeAt(r: DOMRect): Keyframe {
  const sx = r.width / window.innerWidth;
  const sy = r.height / window.innerHeight;
  return {
    transform: `translate(${r.left}px, ${r.top}px) scale(${sx}, ${sy})`,
    borderRadius: `${RADIUS / sx}px / ${RADIUS / sy}px`,
  };
}

function grow(rect: DOMRect, shrink: boolean): Promise<void> {
  anim?.cancel();
  anim = null;
  if (!desk || reduce.matches) return Promise.resolve();
  anim = desk.animate([keyframeAt(rect), { transform: 'none', borderRadius: '0px' }], {
    duration: GROW_MS,
    easing: 'cubic-bezier(.7, 0, .2, 1)',
    direction: shrink ? 'reverse' : 'normal',
    fill: shrink ? 'forwards' : 'none',
  });
  return anim.finished.then(
    () => undefined,
    () => undefined,
  );
}

/** While the desktop is open, the rest of the page is inert (no Tab, no screen reader). */
function setPageInert(on: boolean) {
  if (on) {
    inertEls = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== desk && el.id !== 'toast' && !el.inert,
    );
    inertEls.forEach((el) => { el.inert = true; });
  } else {
    inertEls.forEach((el) => { el.inert = false; });
    inertEls = [];
  }
}

function loadFrame() {
  if (!desk) return;
  frame?.remove();
  frame = document.createElement('iframe');
  frame.className = 'desk-frame';
  frame.title = 'Ubuntu desktop';
  frame.src = DESKTOP_URL;
  desk.prepend(frame);
  bootStarted = performance.now();
  window.clearTimeout(readyTimer);
  readyTimer = window.setTimeout(showError, TIMEOUT_MS);
}

function showError() {
  if (state !== 'booting' || !errorPanel) return;
  errorPanel.hidden = false;
  errorPanel.querySelector<HTMLButtonElement>('[data-desk-retry]')?.focus();
}

function boot() {
  if (!desk || state !== 'off') return;
  if (small.matches) {
    toast('Boot it on a laptop. The desktop needs a bigger screen.');
    return;
  }
  state = 'booting';
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const from = sourceRect();
  if (errorPanel) errorPanel.hidden = true;
  desk.classList.remove('ready', 'hint');
  desk.hidden = false;
  document.documentElement.classList.add('desk-open');
  setPageInert(true);
  desk.focus();
  void grow(from, false);
  loadFrame();
}

function reveal() {
  if (state !== 'booting' || !desk) return;
  state = 'on';
  window.clearTimeout(readyTimer);
  desk.classList.add('ready', 'hint');
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => desk.classList.remove('hint'), HINT_MS);
  frame?.focus();
}

async function shutdown() {
  if (!desk || (state !== 'booting' && state !== 'on')) return;
  state = 'stopping';
  window.clearTimeout(readyTimer);
  window.clearTimeout(hintTimer);
  desk.classList.remove('ready', 'hint'); // the black boot screen fades back over the desktop
  if (!reduce.matches) await new Promise((r) => setTimeout(r, 250));
  frame?.remove();
  frame = null;
  await grow(sourceRect(), true);
  anim?.cancel();
  anim = null;
  desk.hidden = true;
  if (errorPanel) errorPanel.hidden = true;
  document.documentElement.classList.remove('desk-open');
  setPageInert(false);
  state = 'off';
  returnFocus?.focus();
}

window.addEventListener('machine:boot', boot);

window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin || !frame || e.source !== frame.contentWindow) return;
  const type = (e.data as { type?: unknown } | null)?.type;
  if (type === 'desktop:ready') {
    const wait = reduce.matches ? 0 : Math.max(0, MIN_BOOT_MS - (performance.now() - bootStarted));
    window.setTimeout(reveal, wait);
  } else if (type === 'desktop:exit') {
    void shutdown();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (state === 'booting' || state === 'on')) {
    e.preventDefault();
    void shutdown();
  }
});

errorPanel?.querySelector('[data-desk-retry]')?.addEventListener('click', () => {
  if (errorPanel) errorPanel.hidden = true;
  desk?.focus();
  loadFrame();
});
errorPanel?.querySelector('[data-desk-close]')?.addEventListener('click', () => void shutdown());

// Prefetch on intent (pointer over a boot trigger) or after 3 s idle. Never on phones or Save-Data.
let prefetched = false;
function prefetch() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (prefetched || small.matches || saveData) return;
  prefetched = true;
  for (const href of [DESKTOP_URL, ...DESKTOP_PREFETCH]) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.append(link);
  }
}
document.querySelectorAll('[data-boot]').forEach((el) => el.addEventListener('pointerenter', prefetch, { once: true }));
window.addEventListener('load', () => window.setTimeout(prefetch, 3000), { once: true });
