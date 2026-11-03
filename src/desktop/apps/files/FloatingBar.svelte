<script lang="ts">
  import { selectionStatus, type Picked } from './status';

  // NautilusFloatingBar over the view's corner. Half the double-click time passes before it changes, so a double-click
  // does not flash it (set_floating_bar_status), and it steps aside while the pointer is over it.
  const DOUBLE_CLICK_MS = 400;
  let { picked }: { picked: Picked[] } = $props();

  let shown = $state<ReturnType<typeof selectionStatus>>(null);
  let bar = $state<HTMLElement>();
  let bounds: DOMRect | null = null;
  let away = $state(false);

  $effect(() => {
    const next = selectionStatus(picked);
    const timer = setTimeout(() => (shown = next), DOUBLE_CLICK_MS / 2);
    return () => clearTimeout(timer);
  });

  function onpointermove(e: PointerEvent) {
    if (!shown) return;
    if (!away && bar) bounds = bar.getBoundingClientRect();
    const b = bounds;
    away = !!b && e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
  }
</script>

<svelte:window {onpointermove} />

{#if shown}
  <div bind:this={bar} class="floating-bar" class:away role="status">
    <span class="primary">{shown.primary}</span>
    {#if shown.detail}<span>{shown.detail}</span>{/if}
  </div>
{/if}

<style>
  /* .floating-bar in style.css; nautilus-floating-bar.c: 4px from the edges, its labels 6px apart inside 2px and 8px. */
  .floating-bar {
    position: absolute; right: 4px; bottom: 4px; z-index: 2; display: flex; gap: 6px; max-width: calc(100% - 8px); padding: 5px 11px;
    border-radius: 12px; background: var(--view-bg); box-shadow: inset 0 100px 0 0 color-mix(in srgb, currentColor 10%, transparent);
    white-space: nowrap; pointer-events: none;
  }
  .away { visibility: hidden; }
  .primary { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
</style>
