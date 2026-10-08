// The notifications of this session, the banner on screen and the ones waiting for it (messageTray.js).
import type { Notice } from './notifications';
import type { StoreLike } from './settings';
import { settings } from './settings.svelte';

export const notifications: { list: Notice[]; banner: Notice | null; queue: string[] } = $state({ list: [], banner: null, queue: [] });
let seq = 0;

export function notify(n: Pick<Notice, 'app' | 'appName' | 'icon' | 'title' | 'body'>): string {
  const notice: Notice = { ...n, id: `n${++seq}`, time: Date.now(), acknowledged: false };
  notifications.list = [notice, ...notifications.list];
  // Do Not Disturb: listed, but no banner.
  if (!settings.dnd) {
    notifications.queue.push(notice.id);
    showNext();
  }
  return notice.id;
}

function showNext(): void {
  while (!notifications.banner && notifications.queue.length) {
    const next = notifications.list.find((n) => n.id === notifications.queue[0]);
    notifications.queue.shift();
    if (next) {
      next.acknowledged = true; // seen as a banner: no dot for it
      notifications.banner = next;
    }
  }
}

/** The banner finished hiding: show the next one. */
export function bannerDone(): void {
  notifications.banner = null;
  showNext();
}

export function dismiss(id: string): void {
  notifications.list = notifications.list.filter((n) => n.id !== id);
  notifications.queue = notifications.queue.filter((q) => q !== id);
}

export function clearAll(): void {
  notifications.list = [];
  notifications.queue = [];
}

/** The date menu shows them all. */
export function acknowledgeAll(): void {
  for (const n of notifications.list) n.acknowledged = true;
}

/** Notifications nobody has seen yet, not counting those still waiting for their banner (dateMenu.js). */
export function unseen(): number {
  return notifications.list.filter((n) => !n.acknowledged).length - notifications.queue.length;
}

export function resetNotifications(): void {
  notifications.list = [];
  notifications.banner = null;
  notifications.queue = [];
}

export const WELCOME_KEY = 'ubuntu.welcome.v1';
let welcomed = false;

/** At login: a note when the saved files had to be reset, and the welcome note once per visitor. */
export function loginNotices(store: StoreLike | null, reset: boolean): void {
  if (reset) {
    notify({
      app: 'system', appName: 'System', icon: 'cog-wheel-symbolic',
      title: 'This computer was reset', body: 'Your saved changes could not be read, so everything is back to how it started.',
    });
  }
  let seen = welcomed;
  try {
    seen ||= store?.getItem(WELCOME_KEY) === '1';
  } catch {
    /* blocked storage: welcome once per page load */
  }
  if (seen) return;
  welcomed = true;
  try {
    store?.setItem(WELCOME_KEY, '1');
  } catch {
    /* blocked storage */
  }
  notify({ app: 'welcome', appName: 'Welcome', icon: 'distributor-logo-symbolic', title: 'Welcome to Ubuntu 26.04 LTS', body: 'Start with README.md on your desktop.' });
}
