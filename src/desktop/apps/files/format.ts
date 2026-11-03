// How Files words a size or a date: g_format_size, format_item_count_for_display and date_to_str
// (nautilus-date-utilities.c, the "simple" date format). The date words are ICU's ureldatefmt for English.

const UNITS = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB'];

export function formatSize(bytes: number): string {
  if (bytes < 1000) return bytes === 1 ? '1 byte' : `${bytes} bytes`;
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value.toFixed(1)} ${UNITS[unit]}`;
}

export function itemCount(n: number): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'item' : 'items'}`;
}

const DAY = 86_400_000;
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** udatpg's best patterns for the skeletons "Hm" and "hm": the 12-hour one has U+202F before AM or PM. */
function timeText(d: Date, clock24: boolean): string {
  const min = String(d.getMinutes()).padStart(2, '0');
  if (clock24) return `${String(d.getHours()).padStart(2, '0')}:${min}`;
  return `${d.getHours() % 12 || 12}:${min} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** ureldatefmt_format: `n` is below zero in the past, as date_to_str passes it. */
function dayWords(n: number): string {
  if (n === 0) return 'Today';
  if (n === -1) return 'Yesterday';
  if (n === 1) return 'Tomorrow';
  return n < 0 ? `${-n} days ago` : `In ${n} days`;
}
const unitWords = (n: number, unit: string, current: string) => (n === 0 ? current : n === -1 ? `Last ${unit}` : `${-n} ${unit}s ago`);

/** get_relative_day_month_year: the whole days between midnights, cut down (never rounded) to the unit. */
export function dateText(when: Date | string, now: Date, clock24: boolean): string {
  const date = typeof when === 'string' ? new Date(when) : when;
  const days = (midnight(now) - midnight(date)) / DAY;
  let words: string;
  if (days < 7) words = dayWords(Math.trunc(-days));
  else if (days < 31) words = unitWords(Math.trunc(-days / 7), 'week', 'This week');
  else if (days < 365) words = unitWords(Math.trunc(-days / 30.4), 'month', 'This month');
  else words = unitWords(Math.trunc(-days / 365.25), 'year', 'This year');
  return Math.abs(days) < 2 ? `${words}, ${timeText(date, clock24)}` : words;
}
