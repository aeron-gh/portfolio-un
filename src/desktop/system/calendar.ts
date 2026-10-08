// The date menu's calendar and headings (GNOME Shell calendar.js and dateMenu.js).
export type Day = { date: Date; inMonth: boolean; weekend: boolean; today: boolean };

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const DAY_MS = 86_400_000;
// GNOME's date formats ("%B %-d %Y") have no comma; Intl adds one in some locales.
const noComma = (s: string) => s.replace(/,/g, '');

/** First day of the week for the locale, 0 = Sunday; Sunday when the browser cannot tell. */
export function weekStart(locale?: string): number {
  try {
    const loc = new Intl.Locale(locale ?? navigator.language) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    return ((loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay ?? 7) % 7;
  } catch {
    return 0;
  }
}

/** Always six weeks: back to the week start, and one more week back when the 1st is the week start. */
export function monthGrid(year: number, month: number, start: number, today: Date): Day[] {
  const back = (7 + new Date(year, month, 1).getDay() - start) % 7;
  const begin = 1 - back - (back === 0 ? 7 : 0);
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(year, month, begin + i);
    return { date, inMonth: date.getMonth() === month, weekend: date.getDay() === 0 || date.getDay() === 6, today: sameDay(date, today) };
  });
}

/** The single-letter column headings from the week start, with the full day name for screen readers. */
export function dayHeadings(start: number, locale?: string): { letter: string; name: string }[] {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return Array.from({ length: 7 }, (_, i) => {
    const day = (start + i) % 7;
    return { letter: letters[day], name: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(2026, 1, 1 + day)) };
  });
}

/** "October", or "October 2027" outside the current year. */
export function monthLabel(shown: Date, today: Date, locale?: string): string {
  const year = shown.getFullYear() !== today.getFullYear();
  return noComma(new Intl.DateTimeFormat(locale, year ? { month: 'long', year: 'numeric' } : { month: 'long' }).format(shown));
}

/** The Today button: "Wednesday" over "October 7 2026". */
export function todayLabels(now: Date, locale?: string): { day: string; date: string } {
  return {
    day: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now),
    date: noComma(new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' }).format(now)),
  };
}

/** The events heading: Today, Yesterday, Tomorrow, else "October 9" (with the year when it is another year). */
export function eventsTitle(day: Date, today: Date, locale?: string): string {
  const diff = Math.round((new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  const year = day.getFullYear() !== today.getFullYear();
  return noComma(new Intl.DateTimeFormat(locale, year ? { month: 'long', day: 'numeric', year: 'numeric' } : { month: 'long', day: 'numeric' }).format(day));
}
