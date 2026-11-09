<script lang="ts">
  import { layers } from '../system/layers.svelte';
  import { snapFor, TOP_HOLD_MS } from './tiling';
  import { grabFromMaximized, moveWin, resizeRect, setRect, type Edge, type Win } from './windows';
  import { dockIcons, drag, focus, ownViews, phases, tile, toggleMaximize, views, wm } from './wm.svelte';
  import { provideWindow } from './window-context';
  import { motion, overview, slots } from '../shell/overview.svelte';
  import { ACCENTS } from '../system/settings';
  import { settings } from '../system/settings.svelte';

  let { win, hidden = false }: { win: Win; hidden?: boolean } = $props();

  const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  let el = $state<HTMLElement>();
  let dragging = false;
  const focused = $derived(wm.focused === win.id);
  const phase = $derived(phases[win.id]);
  const View = $derived(ownViews[win.id] ?? views[win.app]);
  const maximized = $derived(win.state === 'maximized');
  // In the Overview the real window moves into its picker slot (GNOME's window picker shows live windows).
  const slot = $derived(slots.map[win.id]);
  const inOverview = $derived(overview.mode !== 'hidden');

  // Minimise flies into the app's dock icon (GNOME uses the icon geometry; without one, it drops to the bottom).
  const target = $derived.by(() => {
    if (phase !== 'minimizing' && phase !== 'unminimizing') return '';
    const r = dockIcons.get(win.app);
    return r ? `--to-x: ${r.x}px; --to-y: ${r.y}px; --to-sx: ${r.width / win.rect.w}; --to-sy: ${r.height / win.rect.h};` : '';
  });

  // Maximise / tile / restore morph: play the change of frame as one transform (FLIP), 250ms.
  let last = { state: win.state, rect: { ...win.rect } };
  $effect(() => {
    const now = { state: win.state, rect: { ...win.rect } };
    const prev = last;
    last = now;
    if (!el || dragging || now.state === prev.state || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [
        { translate: `${prev.rect.x}px ${prev.rect.y}px`, scale: `${prev.rect.w / now.rect.w} ${prev.rect.h / now.rect.h}` },
        { translate: `${now.rect.x}px ${now.rect.y}px`, scale: '1 1' },
      ],
      { duration: 250, easing: 'cubic-bezier(.25, .46, .45, .94)' },
    );
  });

  function startMove(e: PointerEvent) {
    if (e.button !== 0 || (e.target as Element).closest('button')) return;
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    let sx = e.clientX;
    let sy = e.clientY;
    let start = { ...win.rect };
    let moved = false;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
      if (!moved) {
        moved = true;
        dragging = true;
        drag.id = win.id;
        if (win.state !== 'normal') {
          grabFromMaximized(wm, win.id, ev.clientX);
          start = { ...win.rect };
          sx = ev.clientX;
          sy = ev.clientY;
        }
      }
      moveWin(wm, win.id, start.x + ev.clientX - sx, start.y + ev.clientY - sy);
      const snap = snapFor(ev.clientX, ev.clientY, win.rect, wm.area);
      if (snap === 'maximize') {
        if (drag.snap !== 'maximize' && drag.snap !== 'top') {
          drag.snap = 'maximize';
          clearTimeout(hold);
          hold = setTimeout(() => {
            if (drag.snap === 'maximize') drag.snap = 'top';
          }, TOP_HOLD_MS);
        }
      } else {
        clearTimeout(hold);
        drag.snap = snap;
      }
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      clearTimeout(hold);
      const snap = drag.snap;
      drag.id = null;
      drag.snap = null;
      dragging = false;
      if (!moved || !snap) return;
      if (snap === 'maximize') toggleMaximize(win.id);
      else tile(win.id, snap);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  // The app draws its own header bar (GTK's client-side decorations); it gets the window and the drag handler here.
  provideWindow({
    get win() {
      return win;
    },
    startMove,
  });

  function startResize(e: PointerEvent, edge: Edge) {
    if (e.button !== 0 || win.state !== 'normal') return;
    e.stopPropagation();
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    const start = { ...win.rect };
    const move = (ev: PointerEvent) =>
      setRect(wm, win.id, resizeRect(start, edge, ev.clientX - sx, ev.clientY - sy, win.minW, win.minH, wm.area));
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  // GNOME gives key focus to the window it focuses: once per focus change, when no menu or dialog is above it, back
  // to whatever had focus inside the window last time.
  let lastFocus: HTMLElement | null = null;
  let given = false;
  $effect(() => {
    if (!focused || hidden) {
      given = false;
      return;
    }
    if (given || layers.open > 0 || !el) return;
    given = true;
    if (!el.contains(document.activeElement)) (lastFocus?.isConnected ? lastFocus : el).focus({ preventScroll: true });
  });
</script>

<div
  bind:this={el}
  class="window"
  class:backdrop={!focused}
  class:maximized
  class:tiled={win.state.startsWith('tiled')}
  class:hidden
  class:opening={phase === 'opening'}
  class:closing={phase === 'closing'}
  class:minimizing={phase === 'minimizing'}
  class:unminimizing={phase === 'unminimizing'}
  class:overviewing={inOverview || motion.settling}
  class:ov-hidden={inOverview && !slot}
  role="dialog"
  aria-label={win.title}
  inert={hidden || inOverview}
  data-win={win.id}
  data-app={win.app}
  data-style={win.style}
  tabindex="-1"
  onfocusin={(e) => (lastFocus = e.target as HTMLElement)}
  style="translate: {slot ? slot.x : win.rect.x}px {slot ? slot.y : win.rect.y}px; scale: {slot ? slot.scale : 1}; width: {win.rect.w}px; height: {win.rect.h}px; z-index: {win.z}; {target}{win.style ? `--accent: ${ACCENTS[settings.accent][win.style]};` : ''}"
  onpointerdowncapture={() => focus(win.id)}
>
  <div class="frame">
    {#if View}<View winId={win.id} args={win.args} />{/if}
  </div>
  {#if win.state === 'normal'}
    {#each EDGES as edge (edge)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="edge {edge}" aria-hidden="true" onpointerdown={(e) => startResize(e, edge)}></div>
    {/each}
  {/if}
</div>

<style>
  .window { position: absolute; left: 0; top: 0; transform-origin: 0 0; pointer-events: auto; }
  .window:focus { outline: none; }
  .window.hidden { visibility: hidden; pointer-events: none; }
  .overviewing { transition: translate var(--dur) var(--ease), scale var(--dur) var(--ease), opacity var(--dur) var(--ease); }
  .ov-hidden { opacity: 0; }
  /* libadwaita 1.9: window.csd. The header bar and the content are the app's (apps/adw/HeaderBar.svelte). */
  .frame {
    position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden;
    border-radius: var(--win-radius); background: var(--win-bg); color: var(--win-fg);
    box-shadow: var(--win-shadow); outline: 1px solid var(--win-outline); outline-offset: -1px;
    transition: box-shadow 200ms ease-out;
  }
  .backdrop .frame { box-shadow: var(--win-shadow-backdrop); }
  .maximized .frame { border-radius: 0; box-shadow: none; outline: none; }
  .tiled .frame { border-radius: 0; outline: none; box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 15%, transparent); }
  .edge { position: absolute; }
  .n { top: -6px; left: 10px; right: 10px; height: 10px; cursor: n-resize; }
  .s { bottom: -6px; left: 10px; right: 10px; height: 10px; cursor: s-resize; }
  .e { right: -6px; top: 10px; bottom: 10px; width: 10px; cursor: e-resize; }
  .w { left: -6px; top: 10px; bottom: 10px; width: 10px; cursor: w-resize; }
  .ne { right: -6px; top: -6px; width: 16px; height: 16px; cursor: ne-resize; }
  .nw { left: -6px; top: -6px; width: 16px; height: 16px; cursor: nw-resize; }
  .se { right: -6px; bottom: -6px; width: 16px; height: 16px; cursor: se-resize; }
  .sw { left: -6px; bottom: -6px; width: 16px; height: 16px; cursor: sw-resize; }
  /* windowManager.js: open 150ms ease-out-expo from (0.01, 0.05) at the bottom centre; close 150ms to 0.8;
     minimise 400ms ease-out-expo into the dock icon. */
  .opening { animation: win-open 150ms var(--ease-expo) both; transform-origin: 50% 100%; }
  .closing { animation: win-close 150ms var(--ease) both; transform-origin: 50% 50%; pointer-events: none; }
  .minimizing { animation: win-min 400ms var(--ease-expo) both; pointer-events: none; }
  .unminimizing { animation: win-min 400ms var(--ease-expo) reverse both; }
  @keyframes win-open { from { scale: .01 .05; opacity: 0; } }
  @keyframes win-close { to { scale: .8; opacity: 0; } }
  @keyframes win-min {
    to { translate: var(--to-x, 50vw) var(--to-y, 100vh); scale: var(--to-sx, 0) var(--to-sy, 0); opacity: 0; }
  }
</style>
