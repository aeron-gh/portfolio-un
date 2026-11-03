<script lang="ts" module>
  export type Response = { id: string; label: string; appearance?: 'suggested' | 'destructive' };
  let count = 0;
</script>

<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { trapFocus } from '../../shell/focus-trap';
  import { openLayer } from '../../system/layers.svelte';
  import './adw.css';

  // AdwAlertDialog (libadwaita 1.9): a sheet centred over its own window, which it dims. The buttons sit in one row
  // of equal widths, and that row decides the width (300px to 600px); the text wraps to fit. Esc gives `close`.
  let { heading, body, responses, close = 'cancel', onresponse, children }: {
    heading: string;
    body: string;
    responses: Response[];
    close?: string;
    onresponse: (id: string) => void;
    children?: Snippet;
  } = $props();

  const id = `alert-${++count}`;
  const layer = openLayer();
  const before = document.activeElement as HTMLElement | null;
  let sheet = $state<HTMLElement>();

  onMount(() => {
    sheet?.querySelector<HTMLElement>('input, button')?.focus(); // GTK focuses a new dialog's first focusable widget
    return () => {
      layer.close();
      if (before?.isConnected) before.focus();
    };
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !layer.top()) return;
    e.preventDefault();
    e.stopPropagation();
    onresponse(close);
  }
</script>

<div class="dialog-host">
  <div class="dimming"></div>
  <div bind:this={sheet} class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="{id}-heading" aria-describedby="{id}-body" use:trapFocus {onkeydown}>
    <div class="message-area">
      <h2 id="{id}-heading" class="heading">{heading}</h2>
      <p id="{id}-body" class="body">{body}</p>
      {#if children}<div class="child">{@render children()}</div>{/if}
    </div>
    <div class="response-area">
      {#each responses as r (r.id)}<button class={r.appearance} onclick={() => onresponse(r.id)}>{r.label}</button>{/each}
    </div>
  </div>
</div>

<style>
  /* dialog-host, floating-sheet > dimming / sheet, dialog.alert .message-area / .response-area (libadwaita 1.9). */
  .dialog-host { position: absolute; inset: 0; z-index: 10; display: grid; place-items: center; padding: 12px; }
  .dimming { position: absolute; inset: 0; background: rgb(from var(--adw-shade) r g b / calc(alpha * 2)); }
  .sheet {
    position: relative; width: fit-content; min-width: 300px; max-width: min(600px, 100%);
    border-radius: 18px; background: var(--adw-dialog-bg); color: var(--adw-dialog-fg);
    box-shadow: 0 0 14px 2px rgb(0 0 6 / 3%), 0 0 5px 2px rgb(0 0 6 / 10%), 0 0 0 1px rgb(0 0 0 / 5%);
  }
  /* width 0 + min-width 100%: the text does not widen the dialog, it wraps to the width the buttons set. */
  .message-area { width: 0; min-width: 100%; display: flex; flex-direction: column; gap: 10px; padding: 32px 24px 9px; text-align: center; }
  .heading { margin: 0; font-size: 136%; font-weight: 800; }
  .body { margin: 0; overflow-wrap: anywhere; }
  .child { margin-top: 8px; text-align: start; }
  .response-area { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 12px; padding: 12px 24px 24px; }
  /* GTK's min-width/min-height size the content, inside the padding: 60px + 2 × 20px = 100px here (border-box). */
  button {
    min-height: 44px; min-width: 100px; padding: 10px 20px; border-radius: 12px; font-weight: bold;
    background-color: color-mix(in srgb, currentColor 10%, transparent);
    outline: 0 solid transparent; outline-offset: 4px;
    transition: background 200ms var(--ease), outline-color 200ms var(--ease), outline-width 200ms var(--ease), outline-offset 200ms var(--ease);
  }
  button:hover { background-color: color-mix(in srgb, currentColor 15%, transparent); }
  button:active { background-color: color-mix(in srgb, currentColor 30%, transparent); }
  :global(:root[data-focus-ring]) button:focus { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
  .destructive { color: var(--adw-destructive); background-color: color-mix(in srgb, currentColor 15%, transparent); }
  .destructive:hover { background-color: color-mix(in srgb, currentColor 20%, transparent); }
  .destructive:active { background-color: color-mix(in srgb, currentColor 35%, transparent); }
  .suggested { color: #fff; background-color: var(--accent); }
  .suggested:hover { background-color: var(--accent); background-image: linear-gradient(rgb(255 255 255 / 10%), rgb(255 255 255 / 10%)); }
  .suggested:active { background-color: var(--accent); background-image: linear-gradient(rgb(0 0 6 / 20%), rgb(0 0 6 / 20%)); }
  :global(:root[data-focus-ring]) .suggested:focus { outline-offset: 1px; }
</style>
