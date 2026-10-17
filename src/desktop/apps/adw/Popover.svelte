<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { openLayer } from '../../system/layers.svelte';
  import './adw.css';

  // GtkPopover (GTK 4.22) in libadwaita 1.9 style, under its button with the arrow's tip at the button's centre.
  // It lives in the window layer: above its window, below the top bar and dock, and never clipped by the frame.
  let { anchor, point, onclose, label, menu = false, flush = false, arrow = true, align = 'center', refocus, children }: {
    anchor: HTMLElement;
    /** Point at this spot (a right-click) and not at the whole anchor. */
    point?: { x: number; y: number };
    onclose: () => void;
    label: string;
    /** popover.menu: no padding of its own; the menu box inside has 6px. */
    menu?: boolean;
    /** No padding: the content brings its own (EditorOpenPopover). */
    flush?: boolean;
    /** gtk_popover_set_has_arrow: context menus have none. */
    arrow?: boolean;
    /** halign start: the popover's left edge lines up with the button's (the arrow still points at its centre). */
    align?: 'center' | 'start';
    /** Where Esc sends the focus; the button by default. */
    refocus?: () => void;
    children: Snippet;
  } = $props();

  const RADIUS = 15;
  const TAIL = 24; // gtkpopover.c TAIL_GAP_WIDTH; TAIL_HEIGHT is 12
  const layer = openLayer();
  let box = $state<HTMLElement>();
  let at = $state({ x: 0, y: 0, tip: 0, z: 0, up: false });

  function portal(node: HTMLElement) {
    (anchor.closest('.window-layer') ?? document.body).appendChild(node);
    return { destroy: () => node.remove() };
  }

  function place() {
    const r = point ? new DOMRect(point.x, point.y, 0, 0) : anchor.getBoundingClientRect();
    const w = box!.offsetWidth;
    const centre = r.left + r.width / 2;
    const x = Math.max(0, Math.min(align === 'start' ? r.left : centre - w / 2, innerWidth - w));
    const tip = Math.max(RADIUS + TAIL / 2, Math.min(centre - x, w - RADIUS - TAIL / 2));
    const win = anchor.closest<HTMLElement>('.window');
    // GDK_ANCHOR_FLIP_Y: with no room below the button, the popover opens above it, its arrow pointing down.
    const gap = arrow ? 12 : 0;
    const h = box!.offsetHeight + gap;
    const up = r.bottom + h > innerHeight && r.top - h >= 0;
    at = { x, y: up ? r.top - h : r.bottom, tip, z: (win ? Number(getComputedStyle(win).zIndex) || 0 : 0) + 1, up };
  }

  onMount(() => {
    place();
    (box!.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled), input, button:not(:disabled)') ?? box!).focus({ preventScroll: true });
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!box!.contains(t) && !anchor.contains(t)) onclose();
    };
    addEventListener('pointerdown', away, true);
    return () => {
      layer.close();
      removeEventListener('pointerdown', away, true);
    };
  });

  // An open popover has the keyboard (a GTK grab): Esc closes it even when the focused widget inside has gone away.
  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !layer.top()) return;
    e.preventDefault();
    e.stopPropagation();
    onclose();
    if (refocus) refocus();
    else anchor.focus();
  }
</script>

<svelte:window {onkeydown} />

<div use:portal class="popover" class:up={at.up} style="left: {at.x}px; top: {at.y}px; z-index: {at.z}; --tip: {at.tip}px">
  {#if arrow}<svg class="arrow" width="26" height="13" viewBox="0 0 26 13" aria-hidden="true"><path d="M.5 13 13 .5 25.5 13" /></svg>{/if}
  <div bind:this={box} class="contents" class:menu class:flush class:bare={!arrow} role={menu ? 'menu' : 'dialog'} aria-label={label} tabindex="-1">
    {@render children()}
  </div>
</div>

<style>
  /* popover > arrow, popover > contents (libadwaita 1.9): one outline around the box and its 24×12 arrow. */
  .popover { position: absolute; pointer-events: auto; color: var(--adw-popover-fg); }
  .contents {
    margin-top: 12px; padding: 8px; border-radius: 15px; outline: none;
    background: var(--adw-popover-bg); background-clip: padding-box; border: 1px solid rgb(0 0 0 / 14%);
    box-shadow: 0 1px 5px 1px rgb(0 0 0 / 9%), 0 2px 14px 3px rgb(0 0 0 / 5%);
  }
  .contents.menu { padding: 0; min-width: 120px; }
  .contents.flush { padding: 0; }
  .contents.bare, .up .contents.bare { margin: 0; }
  /* The arrow sits on the box's top edge and covers that edge's line under its base. */
  .arrow { position: absolute; top: 0; left: calc(var(--tip) - 13px); z-index: 1; filter: drop-shadow(0 -1px 2px rgb(0 0 0 / 5%)); }
  .arrow path { fill: var(--adw-popover-bg); stroke: rgb(0 0 0 / 14%); stroke-width: 1; }
  .up { display: flex; flex-direction: column-reverse; }
  .up .contents { margin: 0 0 12px; }
  .up .arrow { top: auto; bottom: 0; rotate: 180deg; filter: drop-shadow(0 -1px 2px rgb(0 0 0 / 9%)); }
</style>
