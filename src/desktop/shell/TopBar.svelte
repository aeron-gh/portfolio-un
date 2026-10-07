<script lang="ts">
  import { batteryIcon } from '../system/battery';
  import { formatClock } from '../system/clock';
  import { settings } from '../system/settings.svelte';
  import { icon } from '../icons';

  let { mode }: { mode: 'login' | 'session' } = $props();

  let now = $state(new Date());
  let online = $state(navigator.onLine);
  let battery = $state<{ level: number; charging: boolean } | null>(null);
  const clock = $derived(formatClock(now, settings.clock24));

  $effect(() => {
    const t = setInterval(() => (now = new Date()), 1000);
    const on = () => (online = navigator.onLine);
    addEventListener('online', on);
    addEventListener('offline', on);
    return () => {
      clearInterval(t);
      removeEventListener('online', on);
      removeEventListener('offline', on);
    };
  });

  $effect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (t: string, f: () => void) => void }> };
    nav.getBattery?.()
      .then((b) => {
        const sync = () => (battery = { level: b.level, charging: b.charging });
        sync();
        b.addEventListener('levelchange', sync);
        b.addEventListener('chargingchange', sync);
      })
      .catch(() => {});
  });
</script>

<div class="panel" role="banner">
  <div class="panel-left">
    {#if mode === 'session'}
      <button class="ws" aria-label="Activities"><span class="ws-pill active"></span><span class="ws-pill"></span></button>
    {/if}
  </div>
  <button class="clock" aria-label="Date and time"><span>{clock.date}</span><span>{clock.time}</span></button>
  <div class="panel-right">
    <button class="status" aria-label="System menu">
      <span class="sym" style:--icon={`url(${icon(online ? 'network-wireless-signal-excellent-symbolic' : 'network-wireless-offline-symbolic')})`}></span>
      <span class="sym" style:--icon={`url(${icon('audio-volume-high-symbolic')})`}></span>
      <span class="sym" style:--icon={`url(${icon(batteryIcon(battery))})`}></span>
    </button>
  </div>
</div>

<style>
  .panel {
    position: absolute; inset: 0 0 auto 0; z-index: 50;
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
    height: 2.2em; padding: 0 var(--pad);
    background: var(--panel-bg); color: var(--panel-fg);
    font-weight: bold;
  }
  .panel-left { justify-self: start; }
  .panel-right { justify-self: end; }
  .panel button { height: calc(2.2em - 6px); padding: 0 calc(var(--pad) * 2); border-radius: 999px; transition: background-color var(--dur) var(--ease); }
  .panel button:hover { background: var(--sys-hover); }
  .ws { display: flex; align-items: center; gap: 5px; }
  .ws-pill { width: 6px; height: 6px; border-radius: 999px; background: rgb(255 255 255 / .5); }
  .ws-pill.active { width: 36px; background: #fff; }
  .clock { display: flex; gap: .6em; }
  .status { display: flex; align-items: center; gap: 10px; }
</style>
