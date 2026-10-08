<script lang="ts">
  import { formatClock } from '../system/clock';
  import { devices, watchDevices } from '../system/devices.svelte';
  import { settings } from '../system/settings.svelte';
  import { icon } from '../icons';
  import { overview, toggleOverview } from './overview.svelte';
  import { panel, togglePanel } from './panel.svelte';
  import { statusIcons } from './quick-settings';
  import { unseen } from '../system/notifications.svelte';
  import { workspaceCount } from '../wm/windows';
  import { wm } from '../wm/wm.svelte';

  let { mode }: { mode: 'login' | 'session' } = $props();

  let now = $state(new Date());
  const clock = $derived(formatClock(now, settings.clock24));
  // Night Light and Do Not Disturb belong to the logged-in user; the login screen has its own (off).
  const icons = $derived(statusIcons({ ...settings, nightLight: mode === 'session' && settings.nightLight, dnd: mode === 'session' && settings.dnd, online: devices.online, battery: devices.battery }));
  const qsOpen = $derived(mode === 'session' && panel.open === 'quick-settings');
  const dmOpen = $derived(mode === 'session' && panel.open === 'date-menu');
  // The dot by the clock: notifications nobody has seen, hidden while Do Not Disturb is on.
  const dot = $derived(mode === 'session' && !settings.dnd && unseen() > 0);
  const count = $derived(workspaceCount(wm));
  // panel.js: the active dot grows 3.625× (≤2 workspaces), 3.25× (≤5), 2.75× (more).
  const grow = $derived(count <= 2 ? 3.625 : count <= 5 ? 3.25 : 2.75);

  $effect(() => {
    const t = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(t);
  });
  $effect(() => watchDevices());
</script>

<div class="panel" role="banner">
  <div class="panel-left">
    {#if mode === 'session'}
      <button class="ws" class:checked={overview.mode !== 'hidden'} aria-label="Activities" aria-pressed={overview.mode !== 'hidden'} onclick={toggleOverview}>
        {#each { length: count } as _, i (i)}<span class="dot" class:active={i === wm.workspace} style:--grow={grow}></span>{/each}
      </button>
    {/if}
  </div>
  <button
    class="clock-display"
    class:checked={dmOpen}
    aria-label="Date and time"
    aria-expanded={mode === 'session' ? dmOpen : undefined}
    data-panel-button="date-menu"
    onclick={() => mode === 'session' && togglePanel('date-menu')}
  >
    <span class="indicator-pad" class:show={dot}></span><span class="clock">{clock.bar}</span><span class="sym messages-indicator" class:show={dot} style:--icon={`url(${icon('message-indicator-symbolic')})`}></span>
  </button>
  <div class="panel-right">
    <button
      class="status"
      class:checked={qsOpen}
      aria-label="System menu"
      aria-expanded={mode === 'session' ? qsOpen : undefined}
      data-panel-button="quick-settings"
      onclick={() => mode === 'session' && togglePanel('quick-settings')}
    >
      {#each icons as name (name)}<span class="sym" data-icon={name} style:--icon={`url(${icon(name)})`}></span>{/each}
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
  .panel button:hover { background: var(--panel-hover); }
  .ws { display: flex; align-items: center; gap: 5px; }
  .dot { width: 8px; height: 8px; border-radius: 999px; background: #f2f2f2; opacity: .5; scale: .75; transition: width var(--dur) var(--ease), opacity var(--dur), scale var(--dur); }
  .dot.active { width: calc(8px * var(--grow)); opacity: 1; scale: 1; }
  .ws.checked, .status.checked { box-shadow: inset 0 0 0 100px rgb(242 242 242 / .28); }
  /* The clock button has no background of its own: the pill is drawn on the time, the unread dot sits beside it. */
  .panel button.clock-display { display: flex; align-items: center; gap: 2px; padding: 0; }
  .panel button.clock-display:hover { background: none; }
  .clock { display: flex; align-items: center; height: 100%; padding: 0 .818em; border-radius: 999px; white-space: pre; transition: box-shadow var(--dur) var(--ease); }
  .clock-display:hover .clock, .clock-display:focus-visible .clock { box-shadow: inset 0 0 0 100px var(--panel-hover); }
  .clock-display.checked .clock { box-shadow: inset 0 0 0 100px rgb(242 242 242 / .28); }
  .clock-display.checked:hover .clock { box-shadow: inset 0 0 0 100px rgb(242 242 242 / .32); }
  .messages-indicator, .indicator-pad { display: none; width: 1.091em; height: 1.091em; }
  .messages-indicator.show, .indicator-pad.show { display: inline-block; }
  .status { display: flex; align-items: center; gap: 10px; }
</style>
