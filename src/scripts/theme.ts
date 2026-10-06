export type ThemeChoice = 'system' | 'light' | 'dark';

export function nextTheme(t: ThemeChoice): ThemeChoice {
  return t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system';
}

export function getTheme(): ThemeChoice {
  const t = document.documentElement.dataset.theme;
  return t === 'light' || t === 'dark' ? t : 'system';
}

/** Switches theme. With View Transitions, the new theme spreads as a circle from `origin`. */
export function setTheme(t: ThemeChoice, origin?: { x: number; y: number }): void {
  const apply = () => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch { /* storage blocked: theme still applies */ }
    window.dispatchEvent(new CustomEvent<ThemeChoice>('theme:change', { detail: t }));
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reduce) { apply(); return; }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const transition = document.startViewTransition(apply);
  transition.ready
    .then(() => {
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => { /* transition skipped: theme already applied */ });
}
