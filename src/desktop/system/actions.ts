// The power menu's actions: Suspend at once; Restart, Power Off and Log Out ask first.
import { openEndSession, suspend } from './end-session.svelte';

export type SystemAction = 'suspend' | 'restart' | 'power-off' | 'log-out';

export function systemAction(action: SystemAction): void {
  if (action === 'suspend') suspend();
  else openEndSession(action);
}
