<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { icon } from '../icons';
  import { openLayer, type Layer } from '../system/layers.svelte';
  import type { GtkItem } from './desktop-menu';
  let layer: Layer | undefined;

  // A GTK3 menu as Desktop Icons NG pops it up at the pointer (Yaru GTK3 theme): no animation, flips at screen edges.
  let { items, x, y, label, onactivate, onclose }: {
    items: GtkItem[];
    x: number;
    y: number;
    label: string;
    onactivate: (id: string) => void;
    onclose: () => void;
  } = $props();

  type Level = { items: GtkItem[]; x: number; y: number; active: number; parent: number };
  let levels = $state<Level[]>([{ items, x, y, active: -1, parent: -1 }]);
  let boxes = $state<HTMLElement[]>([]);
  const opener = document.activeElement as HTMLElement | null;
  const usable = (i: GtkItem) => i.kind !== 'separator' && !i.disabled;
  // GTK keeps room for check and radio marks in every item of a menu that has one.
  const toggles = (list: GtkItem[]) => list.some((i) => i.kind === 'check' || i.kind === 'radio');

  /** Keep each menu on screen: flip to the other side of the pointer (or parent item), as GTK does. */
  async function place(level: number) {
    await tick();
    const box = boxes[level];
    const l = levels[level];
    if (!box) return;
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    let nx = l.x;
    let ny = l.y;
    if (nx + w > innerWidth) nx = level === 0 ? l.x - w : Math.max(0, levels[level - 1].x - w);
    if (ny + h > innerHeight) ny = Math.max(0, level === 0 ? l.y - h : innerHeight - h);
    levels[level] = { ...l, x: Math.max(0, nx), y: ny };
  }

  function openSub(level: number, index: number, el: HTMLElement, focusFirst: boolean) {
    const item = levels[level].items[index];
    levels = levels.slice(0, level + 1);
    if (item.kind !== 'item' || !item.submenu || item.disabled) return;
    const r = el.getBoundingClientRect();
    levels.push({ items: item.submenu, x: r.right, y: r.top - 5, active: focusFirst ? item.submenu.findIndex(usable) : -1, parent: index });
    void place(level + 1).then(() => focusFirst && boxes[level + 1]?.focus());
  }

  function activate(level: number, index: number, el: HTMLElement) {
    const item = levels[level].items[index];
    if (!usable(item)) return;
    if (item.kind === 'item' && item.submenu) return openSub(level, index, el, true);
    if (item.kind === 'separator') return;
    onactivate(item.id); // act first: closing tears down whatever the action reads
    onclose();
  }

  function step(level: number, dir: 1 | -1) {
    const l = levels[level];
    const n = l.items.length;
    for (let k = 1; k <= n; k++) {
      const i = (((l.active + dir * k) % n) + n) % n;
      if (usable(l.items[i])) {
        levels[level] = { ...l, active: i };
        return;
      }
    }
  }

  function onkey(e: KeyboardEvent) {
    const level = levels.length - 1;
    const l = levels[level];
    const el = boxes[level]?.querySelectorAll<HTMLElement>('.menuitem')[l.active];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') step(level, e.key === 'ArrowDown' ? 1 : -1);
    else if ((e.key === 'Enter' || e.key === ' ') && el) activate(level, l.active, el);
    else if (e.key === 'ArrowRight' && el) openSub(level, l.active, el, true);
    else if ((e.key === 'ArrowLeft' || e.key === 'Escape') && level > 0) {
      levels = levels.slice(0, level);
      boxes[level - 1]?.focus();
    } else if (e.key === 'Escape') onclose();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  onMount(() => {
    layer = openLayer();
    void place(0).then(() => boxes[0]?.focus());
    const away = (e: PointerEvent) => {
      if (!boxes.some((b) => b?.contains(e.target as Node))) onclose();
    };
    // Added at once: the opening click is already over, and Chromium can run the next click before a timer.
    addEventListener('pointerdown', away, true);
    return () => {
      layer?.close();
      removeEventListener('pointerdown', away, true);
      if (opener?.isConnected) opener.focus();
    };
  });
</script>

{#each levels as l, level (level)}
  <div
    class="gtk-menu"
    class:toggles={toggles(l.items)}
    bind:this={boxes[level]}
    role="menu"
    aria-label={level === 0 ? label : undefined}
    tabindex="-1"
    style:left={`${l.x}px`}
    style:top={`${l.y}px`}
    onkeydown={onkey}
    oncontextmenu={(e) => e.preventDefault()}
  >
    {#each l.items as item, i (i)}
      {#if item.kind === 'separator'}
        <div class="separator" role="separator"></div>
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          class="menuitem"
          class:active={i === l.active || (item.kind === 'item' && item.submenu && levels[level + 1]?.parent === i)}
          role={item.kind === 'check' ? 'menuitemcheckbox' : item.kind === 'radio' ? 'menuitemradio' : 'menuitem'}
          aria-checked={item.kind === 'check' || item.kind === 'radio' ? item.checked : undefined}
          aria-disabled={item.disabled || undefined}
          aria-haspopup={item.kind === 'item' && item.submenu ? 'menu' : undefined}
          tabindex="-1"
          data-id={item.id}
          onclick={(e) => activate(level, i, e.currentTarget)}
          onpointerenter={(e) => {
            levels[level] = { ...levels[level], active: usable(item) ? i : -1 };
            if (item.kind === 'item' && item.submenu) openSub(level, i, e.currentTarget, false);
            else levels = levels.slice(0, level + 1);
          }}
        >
          {#if item.kind === 'check' || item.kind === 'radio'}<span class="indicator {item.kind}" class:checked={item.checked}>{#if item.kind === 'check' && item.checked}<span class="sym" style:--icon={`url(${icon('object-select-symbolic')})`}></span>{/if}</span>{/if}
          <span class="label">{item.label}</span>
          {#if item.kind === 'item' && item.submenu}<span class="sym arrow" style:--icon={`url(${icon('pan-end-symbolic')})`}></span>{/if}
        </div>
      {/if}
    {/each}
  </div>
{/each}

<style>
  /* menu, menu menuitem in the compiled Yaru GTK3 theme. */
  .gtk-menu {
    position: fixed; z-index: 320; min-width: 52px; padding: 4px 0; border-radius: 8px;
    background: var(--gtk-menu-bg); color: var(--gtk-menu-fg); box-shadow: var(--gtk-menu-shadow); outline: none;
    font-size: 11pt; user-select: none;
  }
  .menuitem { display: flex; align-items: center; min-height: 16px; min-width: 40px; padding: 4px 6px; white-space: nowrap; }
  .gtk-menu.toggles .menuitem:not(:has(.indicator)) { padding-left: 27px; }
  .menuitem.active { background: var(--gtk-menu-hover); }
  .menuitem[aria-disabled='true'] { color: var(--gtk-menu-disabled); }
  .label { flex: 1; }
  .arrow { margin-left: 10px; }
  .separator { height: 1px; margin: 3px 0; background: var(--gtk-menu-sep); }
  .indicator { flex: none; width: 14px; height: 14px; margin-right: 7px; box-sizing: border-box; border: 1px solid currentColor; }
  .indicator.check { border-radius: 3px; }
  .indicator.radio { border-radius: 50%; }
  .indicator { display: grid; place-items: center; }
  .indicator .sym { width: 12px; height: 12px; }
  .indicator.radio.checked { background: radial-gradient(circle, currentColor 0 3px, transparent 3.5px); }
</style>
