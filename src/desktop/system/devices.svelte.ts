// Hardware the shell reports: the battery (Battery Status API, Chromium only) and whether the browser is online.
import type { BatteryReading } from './battery';

export const devices: { battery: BatteryReading | null; online: boolean } = $state({ battery: null, online: true });

type BatteryManager = EventTarget & BatteryReading;

/** Starts listening; the returned function stops it again. */
export function watchDevices(): () => void {
  const online = () => (devices.online = navigator.onLine);
  online();
  addEventListener('online', online);
  addEventListener('offline', online);
  let battery: BatteryManager | null = null;
  let stopped = false;
  const sync = () => {
    if (battery) devices.battery = { level: battery.level, charging: battery.charging };
  };
  (navigator as Navigator & { getBattery?: () => Promise<BatteryManager> }).getBattery?.()
    .then((b) => {
      if (stopped) return;
      battery = b;
      sync();
      b.addEventListener('levelchange', sync);
      b.addEventListener('chargingchange', sync);
    })
    .catch(() => {});
  return () => {
    stopped = true;
    removeEventListener('online', online);
    removeEventListener('offline', online);
    battery?.removeEventListener('levelchange', sync);
    battery?.removeEventListener('chargingchange', sync);
  };
}
