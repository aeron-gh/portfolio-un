<script lang="ts">
  import type TilingPopupView from './TilingPopup.svelte';
  import { loadTilingPopup } from '../shell/surfaces';
  import Window from './Window.svelte';
  import { snapRect } from './tiling';
  import { drag, fitToViewport, shown, tiling, wm } from './wm.svelte';
  import { overview } from '../shell/overview.svelte';

  const preview = $derived(drag.id ? snapRect(drag.snap, wm.area) : null);
  const previewZ = $derived(wm.wins.find((w) => w.id === drag.id)?.z ?? 0);

  $effect(() => {
    addEventListener('resize', fitToViewport);
    return () => removeEventListener('resize', fitToViewport);
  });

  // Switching workspace slides the new one in (GNOME: 250ms).
  let layer = $state<HTMLElement>();
  let lastWorkspace = wm.workspace;
  $effect(() => {
    const ws = wm.workspace;
    const from = lastWorkspace;
    lastWorkspace = ws;
    if (ws === from || !layer || overview.mode !== 'hidden' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    layer.animate([{ translate: `${ws > from ? 100 : -100}vw 0` }, { translate: '0 0' }], { duration: 250, easing: 'cubic-bezier(.25, .46, .45, .94)' });
  });
  let TilingPopup = $state.raw<typeof TilingPopupView | null>(null);
  $effect(() => {
    if (tiling.popup && !TilingPopup) loadTilingPopup().then((m) => (TilingPopup = m.default));
  });
</script>

<div class="window-layer" bind:this={layer}>
  {#if preview}
    <!-- Drawn below the dragged window: same z-index, earlier in the document. -->
    <div class="tile-preview" style="translate: {preview.x}px {preview.y}px; width: {preview.w}px; height: {preview.h}px; z-index: {previewZ}"></div>
  {/if}
  {#each wm.wins as win (win.id)}
    <Window {win} hidden={!shown(win)} />
  {/each}
  {#if tiling.popup && TilingPopup}<TilingPopup />{/if}
</div>

<style>
  .window-layer { position: fixed; inset: 0; z-index: 10; pointer-events: none; }
  /* .tile-preview: accent at 50% with a 1px accent border. */
  .tile-preview {
    position: absolute; left: 0; top: 0;
    background: color-mix(in srgb, var(--accent) 50%, transparent); border: 1px solid var(--accent);
    transition: translate var(--dur) var(--ease), width var(--dur) var(--ease), height var(--dur) var(--ease);
  }
</style>
