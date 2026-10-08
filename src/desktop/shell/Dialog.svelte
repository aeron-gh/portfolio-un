<script lang="ts">
  import { onMount } from 'svelte';
  import { openLayer, type Layer } from '../system/layers.svelte';
  import { trapFocus } from './focus-trap';
  let layer: Layer | undefined;

  let { title, body, buttons = ['OK'], onclose }: { title: string; body: string; buttons?: string[]; onclose: (choice: string | null) => void } = $props();
  let row = $state<HTMLDivElement>();
  const before = document.activeElement as HTMLElement | null;

  onMount(() => {
    layer = openLayer();
    (row?.lastElementChild as HTMLButtonElement | null)?.focus(); // the default response
    return () => {
      layer?.close();
      if (before?.isConnected) before.focus(); // back to what opened it
    };
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onclose(null);
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="dialog-backdrop" role="presentation">
  <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-body" use:trapFocus>
    <h2 id="dialog-title">{title}</h2>
    <p id="dialog-body">{body}</p>
    <div class="dialog-buttons" bind:this={row}>
      {#each buttons as label (label)}
        <button onclick={() => onclose(label)}>{label}</button>
      {/each}
    </div>
  </div>
</div>

<style>
  .dialog-backdrop { position: fixed; inset: 0; z-index: 150; display: grid; place-items: center; background: rgb(0 0 0 / .35); }
  .dialog { width: 360px; display: grid; gap: 10px; padding: 24px 24px 18px; border-radius: var(--modal-radius); background: var(--bg); color: var(--fg); box-shadow: var(--shadow); text-align: center; animation: dialog-in var(--dur) var(--ease); }
  .dialog h2 { font-size: 1.15em; font-weight: 800; }
  .dialog p { color: var(--dim-fg); }
  .dialog-buttons { display: flex; gap: 12px; margin-top: 8px; }
  .dialog-buttons button { flex: 1; height: 2.6em; border-radius: var(--radius); background: var(--hover); font-weight: bold; }
  .dialog-buttons button:hover { background: color-mix(in srgb, var(--fg) 14%, transparent); }
  .dialog-buttons button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @keyframes dialog-in { from { opacity: 0; transform: scale(.94); } }
</style>
