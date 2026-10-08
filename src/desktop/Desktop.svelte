<script lang="ts">
  import { onMount } from 'svelte';
  import Login from './boot/Login.svelte';
  import Lock from './boot/Lock.svelte';
  import type PowerOffView from './boot/PowerOff.svelte';
  import { loadPowerOff } from './shell/surfaces';
  import Session from './shell/Session.svelte';
  import ScreenFilters from './shell/ScreenFilters.svelte';
  import SuspendScreen from './shell/SuspendScreen.svelte';
  import { endSession } from './system/end-session.svelte';
  import { initFs } from './fs/fs.svelte';
  import { ACCENTS } from './system/settings';
  import { currentStyle, settings } from './system/settings.svelte';
  import { dispatch, session } from './system/session.svelte';
  import { layers } from './system/layers.svelte';
  import { EMBED, isTyping, notifyParent } from './embed';
  import type { Env } from './env';
  import type { FsNode } from './fs/vfs';
  import { close, launch, wm } from './wm/wm.svelte';
  import type { AppId } from './apps/registry';
  import { overview } from './shell/overview.svelte';
  import { panel } from './shell/panel.svelte';
  import { notifications, notify } from './system/notifications.svelte';

  let { seed, env }: { seed: FsNode; env: Env } = $props();
  initFs(seed);

  const BOOT_MS = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200;

  onMount(() => {
    document.documentElement.dataset.desktop = 'mounted';
    (window as unknown as { ubuntu: Record<string, unknown> }).ubuntu = {
      lock: () => dispatch('lock'),
      logout: () => dispatch('logout'),
      powerOff: () => dispatch('powerOff'),
      restart: () => dispatch('restart'),
      launch: (app: AppId) => launch(app),
      close: (id: string) => close(id),
      windows: () => $state.snapshot(wm.wins),
      overview: () => $state.snapshot(overview),
      panel: () => $state.snapshot(panel),
      notify: (n: Parameters<typeof notify>[0]) => notify(n),
      notifications: () => $state.snapshot(notifications),
    };
    notifyParent('desktop:ready');
  });

  // Plymouth: shown while booting, then hands over to the login screen.
  $effect(() => {
    const booting = session.state === 'boot';
    const plymouth = document.getElementById('plymouth');
    plymouth?.classList.toggle('done', !booting);
    plymouth?.setAttribute('aria-hidden', String(!booting)); // faded out: no longer read as "Starting Ubuntu"
    if (!booting) return;
    const t = setTimeout(() => dispatch('booted'), BOOT_MS);
    return () => clearTimeout(t);
  });

  $effect(() => {
    const root = document.documentElement;
    root.dataset.style = currentStyle();
    root.style.setProperty('--accent', ACCENTS[settings.accent][currentStyle()]);
  });

  $effect(() => {
    if (session.state === 'off') notifyParent('desktop:exit');
  });

  // GNOME's default: the screen blanks and locks after 5 minutes without input.
  const IDLE_MS = 5 * 60_000;
  $effect(() => {
    if (session.state !== 'session') return;
    let timer = setTimeout(() => dispatch('lock'), IDLE_MS);
    const poke = () => {
      clearTimeout(timer);
      timer = setTimeout(() => dispatch('lock'), IDLE_MS);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    for (const e of events) addEventListener(e, poke, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const e of events) removeEventListener(e, poke);
    };
  });

  // Embedded: Esc on a quiet session hands control back to the homepage.
  function onKeyCapture(e: KeyboardEvent) {
    if (!EMBED || e.key !== 'Escape') return;
    if (session.state !== 'session' || layers.open > 0 || isTyping(e.target)) return;
    notifyParent('desktop:exit');
  }
  let PowerOff = $state.raw<typeof PowerOffView | null>(null);
  $effect(() => {
    if (session.state === 'off' && !EMBED && !PowerOff) loadPowerOff().then((m) => (PowerOff = m.default)).catch(() => {});
  });
</script>

<svelte:window onkeydowncapture={onKeyCapture} />

{#if session.state === 'login'}
  <Login {env} />
{:else if session.state === 'session' || session.state === 'lock'}
  <Session {env} locked={session.state === 'lock'} />
  {#if session.state === 'lock'}<Lock {env} />{/if}
  <ScreenFilters />
  {#if endSession.suspended}<SuspendScreen />{/if}
{:else if session.state === 'off' && !EMBED}
  {#if PowerOff}<PowerOff />{/if}
{/if}
