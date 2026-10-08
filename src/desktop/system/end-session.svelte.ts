// The end-session dialog that is open, if any, and the suspended (dark) screen.
import type { EndSessionKind } from './end-session';
import { dispatch } from './session.svelte';

export const endSession: { kind: EndSessionKind | null; suspended: boolean } = $state({ kind: null, suspended: false });

export function openEndSession(kind: EndSessionKind): void {
  endSession.kind = kind;
}

export function cancelEndSession(): void {
  endSession.kind = null;
}

export function confirmEndSession(): void {
  const kind = endSession.kind;
  endSession.kind = null;
  if (kind === 'log-out') dispatch('logout');
  else if (kind === 'restart') dispatch('restart');
  else if (kind === 'power-off') dispatch('powerOff');
}

/** Suspend: GNOME locks the screen first, then the screen goes dark until a key or click wakes it. */
export function suspend(): void {
  endSession.suspended = true;
  dispatch('lock');
}

export function wake(): void {
  endSession.suspended = false;
}
