<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { icon } from '../../icons';
  import { trapFocus } from '../../shell/focus-trap';
  import { openLayer } from '../../system/layers.svelte';
  import './adw.css';

  // AdwDialog (libadwaita 1.9): a floating sheet over its window, under a flat header with its title and a close button.
  // Esc closes it, and the focus goes back where it was.
  let { title, width, onclose, children }: { title: string; width: number; onclose: () => void; children: Snippet } = $props();

  const layer = openLayer();
  const before = document.activeElement as HTMLElement | null;
  let sheet = $state<HTMLElement>();

  onMount(() => {
    // focus-widget: the entry if there is one, not the close button that comes first.
    (sheet?.querySelector<HTMLElement>('input') ?? sheet?.querySelector<HTMLElement>('button:not(:disabled)'))?.focus();
    return () => {
      layer.close();
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  });

  function onkeydown(e: KeyboardEvent) {
    e.stopPropagation(); // the window's shortcuts stop at a modal dialog
    if (e.key === 'Escape' && layer.top()) {
      e.preventDefault();
      onclose();
    }
  }
</script>

<div class="dialog-host">
  <div class="dimming"></div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div bind:this={sheet} class="sheet" role="dialog" aria-modal="true" aria-label={title} style:width="{width}px" use:trapFocus {onkeydown}>
    <header class="hb">
      <span class="hb-title">{title}</span>
      <button class="adw-button flat circular close" aria-label="Close" title="Close" onclick={onclose}>
        <span class="sym" style:--icon={`url(${icon('window-close-symbolic')})`}></span>
      </button>
    </header>
    {@render children()}
  </div>
</div>

<style>
  /* dialog-host, floating-sheet > dimming / sheet (libadwaita 1.9). */
  .dialog-host { position: absolute; inset: 0; z-index: 10; display: grid; place-items: center; padding: 12px; }
  .dimming { position: absolute; inset: 0; background: rgb(from var(--adw-shade) r g b / calc(alpha * 2)); }
  .sheet {
    position: relative; display: flex; flex-direction: column; max-width: 100%; max-height: 100%; overflow: auto;
    border-radius: 15px; background: var(--adw-dialog-bg); color: var(--adw-dialog-fg);
    box-shadow: 0 0 14px 2px rgb(0 0 6 / 3%), 0 0 5px 2px rgb(0 0 6 / 10%), 0 0 0 1px rgb(0 0 0 / 5%);
  }
  /* toolbarview > .top-bar headerbar: flat, 46px; the window button in its small round style. */
  .hb { flex: none; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; min-height: 46px; padding: 6px 7px; }
  .hb-title { grid-column: 2; font-weight: bold; }
  .close { grid-column: 3; justify-self: end; min-width: 24px; min-height: 24px; margin: 5px; background: color-mix(in srgb, currentColor 10%, transparent); }
</style>
