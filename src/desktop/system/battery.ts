/** Yaru battery icon name for a Battery Status API reading (null = unknown: show full, like a charged laptop). */
export function batteryIcon(b: { level: number; charging: boolean } | null): string {
  if (!b) return 'battery-level-100-charged-symbolic';
  const n = Math.min(100, Math.max(0, Math.round(b.level * 10) * 10));
  if (b.charging && n === 100) return 'battery-level-100-charged-symbolic';
  return b.charging ? `battery-level-${n}-charging-symbolic` : `battery-level-${n}-symbolic`;
}
