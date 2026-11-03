// GtkWindow's focus-visible (gtkwindow.c, _gtk_window_update_focus_visible). A focus ring shows when a key has just moved
// the focus, not whenever something has the focus, and goes after 3 seconds. Styles use `:root[data-focus-ring] x:focus`:
// the browser's own :focus-visible guesses differently once a script moves the focus.
const VISIBLE_FOCUS_DURATION = 3000;

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** The focus when a key went down, while the ring was off; null while it was on. */
  let atPress: Element | null | undefined;

  const set = (visible: boolean) => {
    clearTimeout(timer);
    root.toggleAttribute('data-focus-ring', visible);
    if (visible) timer = setTimeout(() => set(false), VISIBLE_FOCUS_DURATION);
  };

  addEventListener('keydown', () => (atPress = root.hasAttribute('data-focus-ring') ? null : document.activeElement), true);
  addEventListener(
    'keyup',
    () => {
      if (atPress === undefined) return;
      set(atPress !== document.activeElement);
      atPress = undefined;
    },
    true,
  );
}
