<script lang="ts">
  import TopBar from './TopBar.svelte';
  import DesktopIcons from './DesktopIcons.svelte';
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
</script>

<div class="session" inert={locked}>
  <div class="wall" style:background-image={`url(${placeholder})`}></div>
  <div class="wall real" class:show={loaded} style:background-image={`url(${wallpaper})`}></div>
  <TopBar mode="session" />
  <DesktopIcons />
</div>

<style>
  .session { position: fixed; inset: 0; animation: session-in var(--dur) var(--ease); }
  .wall { position: absolute; inset: 0; background: center / cover no-repeat; }
  .wall.real { opacity: 0; transition: opacity .4s; }
  .wall.real.show { opacity: 1; }
  @keyframes session-in { from { opacity: 0; transform: scale(1.04); } }
</style>
