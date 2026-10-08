// The end-session dialogs (GNOME Shell endSessionDialog.js): their texts and how the countdown is shown.
export type EndSessionKind = 'log-out' | 'restart' | 'power-off';

/** Seconds the dialog waits before acting on its own, as gnome-session asks. */
export const COUNTDOWN = 60;

/** _roundSecondsToInterval: the text counts down in tens, then second by second for the last ten. */
export function shownSeconds(total: number, left: number, interval = 10): number {
  let time = Math.ceil(left);
  if (time <= interval) return time;
  time += interval - 1;
  if (time > total) return Math.ceil(total);
  return time - (time % interval);
}

const count = (n: number, one: string, many: string) => (n === 1 ? one : many).replace('%d', String(n));

export function dialogText(kind: EndSessionKind, realName: string | null, seconds: number): { title: string; description: string; confirm: string } {
  if (kind === 'log-out') {
    return realName
      ? {
          title: `Log Out ${realName}`,
          description: count(seconds, `${realName} will be logged out automatically in %d second`, `${realName} will be logged out automatically in %d seconds`),
          confirm: 'Log Out',
        }
      : {
          title: 'Log Out',
          description: count(seconds, 'You will be logged out automatically in %d second', 'You will be logged out automatically in %d seconds'),
          confirm: 'Log Out',
        };
  }
  if (kind === 'restart') {
    return {
      title: 'Restart',
      description: count(seconds, 'The system will restart automatically in %d second', 'The system will restart automatically in %d seconds'),
      confirm: 'Restart',
    };
  }
  return {
    title: 'Power Off',
    description: count(seconds, 'The system will power off automatically in %d second', 'The system will power off automatically in %d seconds'),
    confirm: 'Power Off',
  };
}
