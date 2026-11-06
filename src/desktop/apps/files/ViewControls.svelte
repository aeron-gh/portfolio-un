<script lang="ts">
  import Popover from '../adw/Popover.svelte';
  import PopoverMenu, { type MenuItem, type MenuSection } from '../adw/PopoverMenu.svelte';
  import { sym } from './icons';
  import { GRID_SIZES, LIST_SIZES, type ViewMode } from './prefs';
  import { sortsFor, type Sort } from './sort';

  // NautilusViewControls (nautilus-view-controls.blp): an AdwSplitButton. The button shows the view it switches to;
  // the arrow opens the view menu.
  let { mode, zoom, hidden, sort, inTrash, inRecent, ontoggle, onzoom, onhidden, onsort }: {
    mode: ViewMode;
    zoom: number;
    hidden: boolean;
    sort: Sort;
    inTrash: boolean;
    inRecent: boolean;
    ontoggle: () => void;
    onzoom: (by: 1 | -1) => void;
    onhidden: () => void;
    onsort: (sort: Sort) => void;
  } = $props();

  let open = $state(false);
  let arrow = $state<HTMLButtonElement>();
  const tooltip = $derived(mode === 'list' ? 'Grid View' : 'List View');
  const sizes = $derived(mode === 'list' ? LIST_SIZES : GRID_SIZES);

  const sortItems: MenuItem[] = $derived(
    sortsFor(inTrash, inRecent).map((s) => ({
      label: s.label,
      radio: true,
      checked: s.sort.key === sort.key && s.sort.reversed === sort.reversed,
      onactivate: () => onsort(s.sort),
    })),
  );
  const sections: MenuSection[] = $derived([
    iconSize,
    { title: 'Sort', items: sortItems },
    [{ label: 'Show Hidden Files', accel: 'Ctrl+H', checked: hidden, onactivate: onhidden }],
    // hidden-when action-disabled: each view has only its own one. Their dialogs are not built yet.
    [{ label: mode === 'list' ? 'Visible Columns…' : 'Captions…', disabled: true }],
  ]);
</script>

<div class="splitbutton">
  <button class="part main" aria-label={tooltip} title={tooltip} onclick={ontoggle}>
    <span class="sym" style:--icon={`url(${sym(mode === 'list' ? 'view-grid-symbolic' : 'view-list-symbolic')})`}></span>
  </button>
  <span class="separator"></span>
  <button bind:this={arrow} class="part arrow" aria-label="View Options" title="View Options" aria-haspopup="menu" aria-expanded={open} onclick={() => (open = !open)}>
    <span class="sym" style:--icon={`url(${sym('pan-down-symbolic')})`}></span>
  </button>
</div>
{#if open && arrow}
  <Popover anchor={arrow} label="View Options" menu onclose={() => (open = false)}>
    <PopoverMenu {sections} onclose={() => (open = false)} />
  </Popover>
{/if}

{#snippet iconSize()}
  <div class="icon-size">
    <span class="mark"></span>
    <span class="caption">Icon Size</span>
    <button class="adw-button flat zoom" aria-label="Zoom Out" title="Zoom Out" disabled={zoom === 0} onclick={() => onzoom(-1)}>
      <span class="sym" style:--icon={`url(${sym('zoom-out-symbolic')})`}></span>
    </button>
    <button class="adw-button flat zoom" aria-label="Zoom In" title="Zoom In" disabled={zoom === sizes.length - 1} onclick={() => onzoom(1)}>
      <span class="sym" style:--icon={`url(${sym('zoom-in-symbolic')})`}></span>
    </button>
  </div>
{/snippet}

<style>
  /* splitbutton, %flat_split_button (libadwaita 1.9): each part a flat button, the line between them gone on hover. */
  .splitbutton { display: flex; align-items: center; border-radius: 9px; transition: background 200ms var(--ease); }
  .splitbutton:hover, .splitbutton:has(.arrow[aria-expanded="true"]) { background: color-mix(in srgb, currentColor 7%, transparent); }
  .separator { width: 1px; height: 22px; background: color-mix(in srgb, currentColor 30%, transparent); }
  .splitbutton:hover .separator, .splitbutton:has(.arrow[aria-expanded="true"]) .separator { background: none; }
  .part { display: grid; place-items: center; height: 34px; border-radius: 9px; transition: background 200ms var(--ease); }
  .part:hover { background: color-mix(in srgb, currentColor 7%, transparent); }
  .part:active { background: color-mix(in srgb, currentColor 16%, transparent); }
  :global(:root[data-focus-ring]) .part:focus { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
  .main { width: 34px; }
  .arrow { padding: 0 4px; }
  .arrow[aria-expanded="true"] { background: color-mix(in srgb, currentColor 10%, transparent); }
  /* box.inline-buttons: the mark's width, the title filling the row, then 32px flat buttons. */
  .icon-size { display: flex; align-items: center; padding: 0 12px; }
  .mark { flex: none; width: 18px; margin: 0 6px 0 -2px; }
  .caption { flex: 1; margin-right: 12px; white-space: nowrap; }
  .zoom { min-width: 32px; min-height: 32px; padding: 0; transition: none; }
</style>
