<script lang="ts">
  import type { Snippet } from 'svelte';
  import { icon } from '../../icons';
  import { useWindow } from '../../wm/window-context';
  import { close, minimize, toggleMaximize } from '../../wm/wm.svelte';
  import './focus-ring';

  // AdwHeaderBar: the app's own controls at the start and the end, a centred title, then the window buttons.
  // Dragging it moves the window and a double-click maximises, as on any GTK header bar.
  // flat: the header of an AdwToolbarView, which has no background or edge of its own (most libadwaita apps).
  // controls: the window buttons; in a split view only the pane at the window's edge has them.
  // fill: a title widget that expands. GtkCenterLayout keeps it centred: size - 2 * MAX (start, end).
  let { start, title, end, flat = false, controls = true, fill = false }: {
    start?: Snippet;
    title?: Snippet;
    end?: Snippet;
    flat?: boolean;
    controls?: boolean;
    fill?: boolean;
  } = $props();

  const w = useWindow();
  const maximized = $derived(w.win.state === 'maximized');
  let startWidth = $state(0);
  let endWidth = $state(0);
  const side = $derived(`${Math.max(startWidth, endWidth) + 6}px`); // and the 6px each side keeps from the title
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header class="headerbar" class:flat class:fill style:--side={fill ? side : undefined} onpointerdown={w.startMove} ondblclick={(e) => !(e.target as Element).closest('button') && toggleMaximize(w.win.id)}>
  <div class="start" bind:clientWidth={startWidth}>{@render start?.()}</div>
  <div class="title-box">
    {#if title}{@render title()}{:else}<span class="title">{w.win.title}</span>{/if}
  </div>
  <div class="end" bind:clientWidth={endWidth}>
    {@render end?.()}
    {#if controls}<div class="controls">
      <button aria-label="Minimize" onclick={() => minimize(w.win.id)}>
        <span class="ctl"><span class="sym" style:--icon={`url(${icon('window-minimize-symbolic')})`}></span></span>
      </button>
      <button aria-label={maximized ? 'Restore' : 'Maximize'} onclick={() => toggleMaximize(w.win.id)}>
        <span class="ctl"><span class="sym" style:--icon={`url(${icon(maximized ? 'window-restore-symbolic' : 'window-maximize-symbolic')})`}></span></span>
      </button>
      <button aria-label="Close" onclick={() => close(w.win.id)}>
        <span class="ctl"><span class="sym" style:--icon={`url(${icon('window-close-symbolic')})`}></span></span>
      </button>
    </div>{/if}
  </div>
</header>

<style>
  /* libadwaita 1.9: headerbar, headerbar > windowhandle > box (and its .start / .end), windowcontrols. */
  .headerbar {
    flex: none; min-height: 47px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 6px 7px 7px;
    background: var(--hb-bg); box-shadow: inset 0 -1px var(--hb-shade); transition: background-color 200ms ease-out;
  }
  :global(.window.backdrop) .headerbar { background: var(--win-bg); }
  /* toolbarview > .top-bar headerbar, and its box's padding-bottom. */
  .headerbar.flat, :global(.window.backdrop) .headerbar.flat { min-height: 46px; padding-bottom: 6px; background: none; box-shadow: none; transition: none; }
  .headerbar.fill { grid-template-columns: var(--side) minmax(0, 1fr) var(--side); }
  .fill .start, .fill .end { width: max-content; margin: 0; }
  .fill .end { justify-self: end; }
  .headerbar > * { transition: opacity 200ms ease-out; }
  :global(.window.backdrop) .headerbar > * { opacity: .5; }
  .start, .end { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .start { margin-right: 6px; }
  .end { margin-left: 6px; justify-content: flex-end; }
  .title-box { min-width: 0; }
  .title { display: block; padding: 0 12px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .controls { display: flex; gap: 3px; }
  .controls button { min-width: 24px; padding: 5px; display: grid; place-items: center; }
  .ctl {
    display: grid; place-items: center; width: 24px; height: 24px; border-radius: 100%;
    background: color-mix(in srgb, currentColor 10%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 15%, transparent);
    transition: background 200ms var(--ease), box-shadow 200ms var(--ease);
  }
  .controls button:hover .ctl { background: color-mix(in srgb, currentColor 15%, transparent); }
  .controls button:active .ctl { background: color-mix(in srgb, currentColor 30%, transparent); }
</style>
