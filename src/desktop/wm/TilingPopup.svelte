<script lang="ts">
  import { onMount } from 'svelte';
  import SwitcherList from '../shell/SwitcherList.svelte';
  import { appById } from '../apps/registry';
  import { openLayer, type Layer } from '../system/layers.svelte';
  import { session } from '../system/session.svelte';
  import { popupCandidates } from './tiling';
  import { step } from './switcher';
  import { tileRect } from './windows';
  import { tile, tiling, wm } from './wm.svelte';
  let layer: Layer | undefined;

  const popup = tiling.popup!;
  const rect = $derived(tileRect(wm.area, popup.tile));
  const items = $derived(popupCandidates(wm, popup.tiledId).map((w) => ({ id: w.id, icon: appById(w.app).icon, label: w.title })));
  let index = $state(0);
  let box = $state<HTMLElement>();

  onMount(() => {
    layer = openLayer();
    const away = (e: PointerEvent) => {
      if (!box?.querySelector('.switcher-list')?.contains(e.target as Node)) tiling.popup = null;
    };
    addEventListener('pointerdown', away, true);
    return () => {
      layer?.close();
      removeEventListener('pointerdown', away, true);
    };
  });

  function pick(id: string) {
    tiling.popup = null;
    tile(id, popup.tile, { popup: false });
  }

  function onkey(e: KeyboardEvent) {
    if (!layer?.top() || session.state !== 'session') return;
    if (e.key === 'Escape') tiling.popup = null;
    else if (e.key === 'ArrowRight' || e.key === 'Tab') index = step(index, items.length, 1);
    else if (e.key === 'ArrowLeft') index = step(index, items.length, -1);
    else if (e.key === 'Enter' && items[index]) pick(items[index].id);
    else return;
    e.preventDefault();
  }
</script>

<svelte:window onkeydown={onkey} />

<div class="tiling-popup" bind:this={box} style="translate: {rect.x}px {rect.y}px; width: {rect.w}px; height: {rect.h}px">
  <SwitcherList {items} selected={index} onpick={pick} onhover={(i) => (index = i)} />
</div>

<style>
  .tiling-popup { position: absolute; left: 0; top: 0; z-index: 100000; display: grid; place-items: center; padding: 24px; pointer-events: auto; }
</style>
