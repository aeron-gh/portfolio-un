export type BatteryReading = { level: number; charging: boolean };

/** Yaru battery icon for a Battery Status API reading, picked as status/system.js does: 10 × floor(percent / 10).
 *  null = unknown: show full, like a charged laptop. */
export function batteryIcon(b: BatteryReading | null): string {
  if (!b) return 'battery-level-100-charged-symbolic';
  const n = Math.min(100, Math.floor(Math.round(b.level * 100) / 10) * 10);
  if (b.charging && n === 100) return 'battery-level-100-charged-symbolic';
  return b.charging ? `battery-level-${n}-charging-symbolic` : `battery-level-${n}-symbolic`;
}

/** The Quick Settings battery title, e.g. "47%" (Intl's percent style, as status/system.js formats it). */
export function batteryLabel(b: BatteryReading | null, locale?: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent' }).format(b ? Math.round(b.level * 100) / 100 : 1);
}
