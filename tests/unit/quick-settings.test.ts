import { describe, expect, test } from 'bun:test';
import { PROFILES, dimFor, powerModeClick, setRadio, statusIcons, volumeIcon, wifiIcon, type StatusInput } from '../../src/desktop/shell/quick-settings';

const base: StatusInput = { nightLight: false, wifi: true, dnd: false, airplane: false, volume: 70, muted: false, powerMode: 'balanced', online: true, battery: { level: 0.47, charging: false } };

describe('Quick Settings (GNOME Shell 50)', () => {
  test('volume icon: muted or 0, then ceil(3 × level)', () => {
    expect(volumeIcon(0, false)).toBe('audio-volume-muted-symbolic');
    expect(volumeIcon(70, true)).toBe('audio-volume-muted-symbolic');
    expect(volumeIcon(33, false)).toBe('audio-volume-low-symbolic');
    expect(volumeIcon(34, false)).toBe('audio-volume-medium-symbolic');
    expect(volumeIcon(66, false)).toBe('audio-volume-medium-symbolic');
    expect(volumeIcon(67, false)).toBe('audio-volume-high-symbolic');
  });

  test('Wi–Fi icon: off, connected without internet, full signal', () => {
    expect(wifiIcon(false, true)).toBe('network-wireless-disabled-symbolic');
    expect(wifiIcon(true, false)).toBe('network-wireless-no-route-symbolic');
    expect(wifiIcon(true, true)).toBe('network-wireless-signal-excellent-symbolic');
  });

  test('Power Mode: the menu lists Performance, Balanced, Power Saver; the tile toggles with the last other profile', () => {
    expect(PROFILES.map((p) => p.name)).toEqual(['Performance', 'Balanced', 'Power Saver']);
    expect(powerModeClick('balanced', 'power-saver')).toBe('power-saver');
    expect(powerModeClick('balanced', 'performance')).toBe('performance');
    expect(powerModeClick('performance', 'performance')).toBe('balanced');
  });

  test('airplane mode turns every radio off, leaving it turns them on, and a radio coming on ends it', () => {
    const on = setRadio({ wifi: true, bluetooth: true, airplane: false }, 'airplane', true);
    expect(on).toEqual({ wifi: false, bluetooth: false, airplane: true });
    expect(setRadio(on, 'airplane', false)).toEqual({ wifi: true, bluetooth: true, airplane: false });
    expect(setRadio(on, 'wifi', true)).toEqual({ wifi: true, bluetooth: false, airplane: false });
    expect(setRadio({ wifi: true, bluetooth: true, airplane: false }, 'bluetooth', false)).toEqual({ wifi: true, bluetooth: false, airplane: false });
  });

  test('top bar status icons in panel.js order', () => {
    expect(statusIcons(base)).toEqual(['network-wireless-signal-excellent-symbolic', 'audio-volume-high-symbolic', 'battery-level-40-symbolic']);
    expect(statusIcons({ ...base, nightLight: true, wifi: false, dnd: true, airplane: true, muted: true, powerMode: 'power-saver' })).toEqual([
      'night-light-symbolic', 'notifications-disabled-symbolic', 'airplane-mode-symbolic', 'audio-volume-muted-symbolic',
      'power-profile-power-saver-symbolic', 'battery-level-40-symbolic',
    ]);
  });

  test('brightness dims the screen but 0 is never black', () => {
    expect(dimFor(100)).toBe(0);
    expect(dimFor(50)).toBe(0.4);
    expect(dimFor(0)).toBe(0.8);
    expect(dimFor(-20)).toBe(0.8);
  });
});
