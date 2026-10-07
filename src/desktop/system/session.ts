export type SessionState = 'boot' | 'login' | 'session' | 'lock' | 'off';
export type SessionEvent = 'booted' | 'login' | 'lock' | 'unlock' | 'logout' | 'powerOff' | 'restart';

const MOVES: Record<SessionState, Partial<Record<SessionEvent, SessionState>>> = {
  boot: { booted: 'login', powerOff: 'off' },
  login: { login: 'session', powerOff: 'off', restart: 'boot' },
  session: { lock: 'lock', logout: 'login', powerOff: 'off', restart: 'boot' },
  lock: { unlock: 'session', powerOff: 'off', restart: 'boot' },
  off: { restart: 'boot' },
};

export function next(state: SessionState, event: SessionEvent): SessionState {
  return MOVES[state][event] ?? state;
}
