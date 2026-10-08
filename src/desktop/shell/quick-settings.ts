// Quick Settings rules from GNOME Shell 50 (status/*.js): the top bar's status icons, tile icons, Power Mode's
// toggle, the radios and airplane mode, and how far the brightness slider dims the screen.
import { batteryIcon, type BatteryReading } from '../system/battery';
import type { PowerMode, Settings } from '../system/settings';

/** power-profiles-daemon lists them low → high; the menu shows them reversed. */
export const PROFILES: { id: PowerMode; name: string; icon: string }[] = [
  { id: 'performance', name: 'Performance', icon: 'power-profile-performance-symbolic' },
  { id: 'balanced', name: 'Balanced', icon: 'power-profile-balanced-symbolic' },
  { id: 'power-saver', name: 'Power Saver', icon: 'power-profile-power-saver-symbolic' },
];

export function profileOf(id: PowerMode): { id: PowerMode; name: string; icon: string } {
  return PROFILES.find((p) => p.id === id) ?? PROFILES[1];
}

/** A click on the Power Mode tile goes back to Balanced, or to the last other profile. */
export function powerModeClick(mode: PowerMode, last: Exclude<PowerMode, 'balanced'>): PowerMode {
  return mode === 'balanced' ? last : 'balanced';
}

/** volume.js: muted or 0 → muted; otherwise ceil(3 × level) picks low, medium or high. Volume is 0–100. */
export function volumeIcon(volume: number, muted: boolean): string {
  if (muted || volume <= 0) return 'audio-volume-muted-symbolic';
  const n = Math.min(3, Math.max(1, Math.ceil((3 * volume) / 100)));
  return ['audio-volume-low-symbolic', 'audio-volume-medium-symbolic', 'audio-volume-high-symbolic'][n - 1];
}

/** The Wi–Fi device's icon (network.js): off, connected without internet, or full signal. */
export function wifiIcon(wifi: boolean, online: boolean): string {
  if (!wifi) return 'network-wireless-disabled-symbolic';
  return online ? 'network-wireless-signal-excellent-symbolic' : 'network-wireless-no-route-symbolic';
}

export type Radios = Pick<Settings, 'wifi' | 'bluetooth' | 'airplane'>;

/** rfkill: airplane mode turns every radio off and leaving it turns them all on; turning one radio on ends it. */
export function setRadio(r: Radios, which: keyof Radios, on: boolean): Radios {
  if (which === 'airplane') return { wifi: !on, bluetooth: !on, airplane: on };
  return { ...r, [which]: on, airplane: on ? false : r.airplane };
}

export type StatusInput = Pick<Settings, 'nightLight' | 'wifi' | 'dnd' | 'airplane' | 'volume' | 'muted' | 'powerMode'> & {
  online: boolean;
  battery: BatteryReading | null;
};

/** The icons inside the top bar's system button, left to right (panel.js order). Bluetooth shows only with a
 *  connected device, so never here; the network icon goes when there is no connection. */
export function statusIcons(s: StatusInput): string[] {
  const out: string[] = [];
  if (s.nightLight) out.push('night-light-symbolic');
  if (s.wifi) out.push(wifiIcon(true, s.online));
  if (s.dnd) out.push('notifications-disabled-symbolic');
  if (s.airplane) out.push('airplane-mode-symbolic');
  out.push(volumeIcon(s.volume, s.muted));
  if (s.powerMode !== 'balanced') out.push(profileOf(s.powerMode).icon);
  out.push(batteryIcon(s.battery));
  return out;
}

/** Brightness 0–100 → opacity of the black screen overlay. 0 is the backlight's minimum: dim, never black. */
export function dimFor(brightness: number): number {
  return Math.round(80 * (1 - Math.min(100, Math.max(0, brightness)) / 100)) / 100;
}
