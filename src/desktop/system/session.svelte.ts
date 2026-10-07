import { next, type SessionEvent, type SessionState } from './session';

export const session = $state<{ state: SessionState }>({ state: 'boot' });

export function dispatch(event: SessionEvent): void {
  session.state = next(session.state, event);
}
