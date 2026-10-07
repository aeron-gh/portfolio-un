/** Top bar clock, GNOME style: "Apr 14" and "14:16" (or "2:16 PM"). clock24 null = the visitor's locale. */
export function formatClock(now: Date, clock24: boolean | null, locale?: string): { date: string; time: string } {
  const date = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(now);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: clock24 === null ? undefined : !clock24 })
    .format(now)
    .replace(/^0(?=\d:)/, '');
  return { date, time: clock24 === true ? time.padStart(5, '0') : time };
}
