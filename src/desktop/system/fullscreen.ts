// The "Ubuntu (full screen)" session: JavaScript full screen plus the Keyboard Lock API, so Super, Alt+Tab and Esc
// reach the desktop (Chromium browsers; elsewhere it is full screen only). Holding Esc for 2 seconds leaves (browser rule).
export type SessionKind = 'ubuntu' | 'fullscreen';
export const SESSION_KEY = 'ubuntu.session.v1';
type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function loadSession(store: Store | null): SessionKind {
  try {
    return store?.getItem(SESSION_KEY) === 'fullscreen' ? 'fullscreen' : 'ubuntu';
  } catch {
    return 'ubuntu';
  }
}

export function saveSession(store: Store | null, kind: SessionKind): void {
  try {
    store?.setItem(SESSION_KEY, kind);
  } catch {
    /* storage blocked: the choice lasts for this visit only */
  }
}

/** Must run inside the login click or key press (browsers only allow full screen from a user gesture). */
export async function enterFullscreen(el: Element = document.documentElement): Promise<boolean> {
  try {
    await el.requestFullscreen();
    await (navigator as Navigator & { keyboard?: { lock?: () => Promise<void> } }).keyboard?.lock?.();
    return true;
  } catch {
    return false;
  }
}
