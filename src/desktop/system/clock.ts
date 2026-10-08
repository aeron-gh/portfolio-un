/** The clock as gnome-desktop's wall clock prints it: "%b %-e_%R" (24 h) or "%b %-e_%l:%M %p", where "_" becomes an en
 *  space and %l pads a one-digit hour with a blank. `bar` is the top bar's text; `time` is trimmed, as the lock screen
 *  shows it. clock24 null = the visitor's locale decides. */
export function formatClock(now: Date, clock24: boolean | null, locale?: string): { date: string; time: string; bar: string } {
  const date = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(now);
  const h24 = clock24 ?? uses24h(locale);
  const time = h24
    ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
    : new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true }).format(now).replace(/^0(?=\d\D)/, '');
  const blank = !h24 && /^\d\D/.test(time) ? ' ' : '';
  return { date, time, bar: `${date} ${blank}${time}` };
}

function uses24h(locale?: string): boolean {
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h23' || cycle === 'h24';
}
