// Notifications as GNOME Shell 50 keeps them (messageList.js, misc/dateUtils.js).
export type Notice = { id: string; app: string; appName: string; icon: string; title: string; body: string; time: number; acknowledged: boolean };
export type Group = { app: string; appName: string; icon: string; notices: Notice[] };

/** One group per app, the app with the newest notification first; newest first inside each group. */
export function groupByApp(list: Notice[]): Group[] {
  const groups = new Map<string, Group>();
  for (const n of [...list].sort((a, b) => b.time - a.time)) {
    const g = groups.get(n.app) ?? { app: n.app, appName: n.appName, icon: n.icon, notices: [] };
    g.notices.push(n);
    groups.set(n.app, g);
  }
  return [...groups.values()];
}

const ago = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;

/** formatTimeSpan: "Just now", "5 minutes ago", "Yesterday", … (numbers cut down to whole units). */
export function timeSpan(now: number, then: number): string {
  const minutes = (now - then) / 60_000;
  const hours = minutes / 60;
  const days = hours / 24;
  const weeks = days / 7;
  if (minutes < 5) return 'Just now';
  if (hours < 1) return ago(Math.floor(minutes), 'minute');
  if (days < 1) return ago(Math.floor(hours), 'hour');
  if (days < 2) return 'Yesterday';
  if (days < 15) return ago(Math.floor(days), 'day');
  if (weeks < 8) return ago(Math.floor(weeks), 'week');
  if (weeks / 52 < 1) return ago(Math.floor(days / 30), 'month');
  return ago(Math.floor(weeks / 52), 'year');
}
