<script lang="ts">
  import TopBar from './TopBar.svelte';
  import DesktopIcons from './DesktopIcons.svelte';
  import WindowLayer from '../wm/WindowLayer.svelte';
  import Dock from './Dock.svelte';
  import Keyboard from './Keyboard.svelte';
  import type SwitcherView from './Switcher.svelte';
  import { switcher } from './switcher.svelte';
  import { onMount, type Component } from 'svelte';
  import { hideOverview, overview } from './overview.svelte';
  import { loadBanner, loadDateMenu, loadEndSession, loadOverview, loadQuickSettings, loadSwitcher, prefetchSurfaces } from './surfaces';
  import { loginNotices, notifications, resetNotifications } from '../system/notifications.svelte';
  import { safeStorage } from '../system/settings';
  import { fsState } from '../fs/fs.svelte';
  import { closePanel, panel } from './panel.svelte';
  import { endSwitch } from './switcher.svelte';
  import { endSession } from '../system/end-session.svelte';
  import { quitAll, tiling } from '../wm/wm.svelte';
  import { currentStyle } from '../system/settings.svelte';
  import type { Env } from '../env';

  // locked: the lock screen covers the session, so nothing in it may take focus or be read out.
  let { env, locked = false }: { env: Env; locked?: boolean } = $props();
  const dark = $derived(currentStyle() === 'dark');
  const wallpaper = $derived(dark ? env.wallpaperDark : env.wallpaperLight);
  const placeholder = $derived(dark ? env.placeholders.dark : env.placeholders.light);
  let loaded = $state(false);

  $effect(() => {
    loaded = false;
    const img = new Image();
    img.onload = () => (loaded = true);
    img.src = wallpaper;
  });

  // The Overview loads on first use (and is prefetched when the browser is idle after login).
  let OverviewView = $state.raw<Component<{ env: Env }> | null>(null);
  $effect(() => {
    if (overview.mode !== 'hidden' && !OverviewView) loadOverview().then((m) => (OverviewView = m.default));
  });
  // Quick Settings, the same way; locking the screen closes it, as GNOME closes every menu.
  let QuickSettingsView = $state.raw<Component | null>(null);
  $effect(() => {
    if (panel.open === 'quick-settings' && !QuickSettingsView) loadQuickSettings().then((m) => (QuickSettingsView = m.default));
  });
  $effect(() => {
    if (!locked) return;
    closePanel();
    tiling.popup = null;
    endSwitch();
  });
  let EndSessionView = $state.raw<Component<{ realName: string }> | null>(null);
  $effect(() => {
    if (endSession.kind && !EndSessionView) loadEndSession().then((m) => (EndSessionView = m.default));
  });
  let DateMenuView = $state.raw<Component | null>(null);
  $effect(() => {
    if (panel.open === 'date-menu' && !DateMenuView) loadDateMenu().then((m) => (DateMenuView = m.default));
  });
  let BannerView = $state.raw<Component | null>(null);
  $effect(() => {
    if (notifications.banner && !BannerView) loadBanner().then((m) => (BannerView = m.default));
  });
  let Switcher = $state.raw<typeof SwitcherView | null>(null);
  $effect(() => {
    if (switcher.visible && !Switcher) loadSwitcher().then((m) => (Switcher = m.default));
  });
  onMount(() => {
    prefetchSurfaces();
    loginNotices(safeStorage(), fsState.resetNotice);
    fsState.resetNotice = false;
    // Leaving the session (log out, restart, power off) quits every app; the next login starts clean.
    return () => {
      quitAll();
      hideOverview();
      closePanel();
      endSwitch();
      resetNotifications();
    };
  });
</script>

<div class="session" inert={locked}>
  <div class="wall" style:background-image={`url(${placeholder})`}></div>
  <div class="wall real" class:show={loaded} style:background-image={`url(${wallpaper})`}></div>
  <TopBar mode="session" />
  <DesktopIcons />
  <WindowLayer />
  {#if OverviewView && overview.mode !== 'hidden'}<OverviewView {env} />{/if}
  <Dock />
  {#if QuickSettingsView && panel.open === 'quick-settings'}<QuickSettingsView />{/if}
  {#if DateMenuView && panel.open === 'date-menu'}<DateMenuView />{/if}
  {#if BannerView && notifications.banner}{#key notifications.banner.id}<BannerView />{/key}{/if}
  {#if EndSessionView && endSession.kind}<EndSessionView realName={env.fullName} />{/if}
  <Keyboard />
  {#if switcher.visible && Switcher}<Switcher />{/if}
</div>

<style>
  .session { position: fixed; inset: 0; animation: session-in var(--dur) var(--ease); }
  .wall { position: absolute; inset: 0; background: center / cover no-repeat; }
  .wall.real { opacity: 0; transition: opacity .4s; }
  .wall.real.show { opacity: 1; }
  @keyframes session-in { from { opacity: 0; transform: scale(1.04); } }
</style>
