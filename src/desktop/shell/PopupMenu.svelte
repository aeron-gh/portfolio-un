<script lang="ts">
  import { onMount } from 'svelte';
  import { icon } from '../icons';
  import { openLayer, type Layer } from '../system/layers.svelte';
  import { nextIndex, type MenuItem } from './menu';
  let layer: Layer | undefined;

  let { items, anchor, side = 'bottom', label, app = false, onactivate, onclose }: {
    items: MenuItem[];
    anchor: DOMRect;
    side?: 'bottom' | 'right' | 'top';
    label: string;
    /** GNOME's .app-menu (dock menus): narrower, small name header. */
    app?: boolean;
    onactivate: (id: string) => void;
    onclose: () => void;
  } = $props();

  const GAP = 6; // boxpointer -arrow-rise: the arrow itself is invisible
  const ORNAMENT: Record<string, string> = {
    check: 'ornament-check-symbolic',
    dot: 'ornament-dot-checked-symbolic',
    'no-dot': 'ornament-dot-unchecked-symbolic',
  };
  let box = $state<HTMLElement>();
  let active = $state(-1);
  let pos = $state({ x: -9999, y: -9999 });
  const opener = document.activeElement as HTMLElement | null;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

  onMount(() => {
    layer = openLayer();
    const w = box!.offsetWidth;
    const h = box!.offsetHeight;
    pos =
      side === 'right'
        ? { x: anchor.right + GAP, y: clamp(anchor.top + anchor.height / 2 - h / 2, 32 + GAP, innerHeight - h - GAP) }
        : {
            x: clamp(anchor.left + anchor.width / 2 - w / 2, GAP, innerWidth - w - GAP),
            y: side === 'top' ? anchor.top - h - GAP : anchor.bottom + GAP,
          };
    box!.focus();
    const away = (e: PointerEvent) => {
      if (!box?.contains(e.target as Node)) onclose();
    };
    // Added at once: the opening click is already over, and Chromium can run the next click before a timer.
    addEventListener('pointerdown', away, true);
    return () => {
      layer?.close();
      removeEventListener('pointerdown', away, true);
      if (opener?.isConnected) opener.focus();
    };
  });

  function choose(item: MenuItem) {
    if (item.kind !== 'item' || item.disabled) return;
    // Activate first: closing tears down the caller's {#if} block, and with it any value the action reads.
    onactivate(item.id);
    onclose();
  }

  function onkey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') active = nextIndex(items, active, e.key === 'ArrowDown' ? 1 : -1);
    else if ((e.key === 'Enter' || e.key === ' ') && active >= 0) choose(items[active]);
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
</script>

<div
  bind:this={box}
  class="popup-menu"
  class:app-menu={app}
  class:right={side === 'right'}
  class:top={side === 'top'}
  role="menu"
  aria-label={label}
  tabindex="-1"
  style="--x: {pos.x}px; --y: {pos.y}px"
  onkeydown={onkey}
>
  {#each items as item, i (i)}
    {#if item.kind === 'separator'}
      <div class="separator" class:labelled={!!item.label} role="separator">
        {#if item.label}<span class="sep-label">{item.label}</span>{/if}<span class="line"></span>
      </div>
    {:else}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="item"
        class:active={i === active}
        class:ornamented={item.ornament === 'check' || item.ornament === 'none'}
        role="menuitem"
        tabindex="-1"
        aria-disabled={item.disabled || undefined}
        data-id={item.id}
        onclick={() => choose(item)}
        onpointerenter={() => (active = item.disabled ? -1 : i)}
      >
        {#if item.ornament}
          <span class="ornament">{#if ORNAMENT[item.ornament]}<span class="sym" style:--icon={`url(${icon(ORNAMENT[item.ornament])})`}></span>{/if}</span>
        {/if}
        <span class="label">{item.label}</span>
      </div>
    {/if}
  {/each}
</div>

<style>
  /* .popup-menu-content and .popup-menu-item in the compiled Yaru shell CSS. */
  .popup-menu {
    position: fixed; left: 0; top: 0; z-index: 300; min-width: 15em; padding: 6px; translate: var(--x) var(--y);
    border-radius: var(--pop-radius); border: 1px solid var(--pop-border);
    background: var(--pop-bg); color: var(--pop-fg); box-shadow: var(--pop-shadow);
    transform-origin: 50% 0; animation: popup-in 150ms var(--ease) both; outline: none;
  }
  .popup-menu.right { transform-origin: 0 50%; animation-name: popup-in-right; }
  .app-menu { max-width: 27.25em; }
  .item { display: flex; align-items: center; gap: 6px; padding: 9px 12px; border-radius: 12px; }
  .item.ornamented { padding-left: 6px; } /* popupMenu.js: CHECK and NONE ornaments */
  .item.active { background: color-mix(in srgb, var(--pop-fg) 10%, transparent); }
  .item[aria-disabled='true'] { color: color-mix(in srgb, var(--pop-fg) 60%, transparent); }
  :global(:root[data-style='dark']) .item[aria-disabled='true'] { color: color-mix(in srgb, var(--pop-fg) 50%, transparent); }
  .ornament { width: 1.091em; flex: none; display: grid; place-items: center; }
  .ornament .sym { width: 1.091em; height: 1.091em; }
  .label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .separator { display: flex; align-items: center; gap: 6px; padding: 6px 12px; }
  .separator.labelled { padding: 9px 12px; }
  .line { flex: 1; height: 1px; background: color-mix(in srgb, var(--pop-fg) 15%, transparent); }
  :global(:root[data-style='dark']) .line { background: rgb(255 255 255 / .1); }
  .app-menu .separator.labelled:first-child .sep-label { font-size: .818em; font-weight: 500; margin-right: 8px; }
  /* boxpointer.js: opacity 0 → 1, scale 0.96 → 1, sliding in from the arrow side, 150ms ease-out-quad. */
  @keyframes popup-in { from { opacity: 0; scale: .96; translate: var(--x) calc(var(--y) - 6px); } }
  @keyframes popup-in-right { from { opacity: 0; scale: .96; translate: calc(var(--x) - 6px) var(--y); } }
  .popup-menu.top { transform-origin: 50% 100%; animation-name: popup-in-top; }
  @keyframes popup-in-top { from { opacity: 0; scale: .96; translate: var(--x) calc(var(--y) + 6px); } }
</style>
