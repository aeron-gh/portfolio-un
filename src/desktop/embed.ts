// Talking to the homepage when the desktop runs inside its iframe (?embed=1).
export const EMBED = typeof location !== 'undefined' && new URLSearchParams(location.search).has('embed');

export function notifyParent(type: 'desktop:ready' | 'desktop:exit'): void {
  if (EMBED && window.parent !== window) window.parent.postMessage({ type }, location.origin);
}

export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || !!el.closest?.('input, textarea, select'));
}
