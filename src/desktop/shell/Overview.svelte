<script lang="ts">
  import { onMount } from 'svelte';
  import AppGrid from './AppGrid.svelte';
  import SearchResults from './SearchResults.svelte';
  import { icon } from '../icons';
  import { openLayer, type Layer } from '../system/layers.svelte';
  import { session } from '../system/session.svelte';
  import { currentStyle } from '../system/settings.svelte';
  import { moveToWorkspace, switchWorkspace, visibleWins, workspaceCount } from '../wm/windows';
  import { close, focus, wm } from '../wm/wm.svelte';
  import { CARD_GAP, THUMB_SCALE, cardRect, pickerSlots, showThumbnails } from './overview';
  import { hideOverview, overview, slots } from './overview.svelte';
  import type { Env } from '../env';
  let layer: Layer | undefined;

  let { env }: { env: Env } = $props();
  let entry = $state<HTMLInputElement>();
  let results: { activateFirst: () => void } | undefined = $state();
  let dragId: string | null = null;

  const count = $derived(workspaceCount(wm));
  const picking = $derived(overview.mode === 'windows' && !overview.query);
  const thumbs = $derived(picking && showThumbnails(count));
  const card = $derived(cardRect(wm.area, thumbs));
  const wins = $derived(visibleWins(wm).filter((w) => !overview.spread || w.app === overview.spread));
  const wallpaper = $derived(currentStyle() === 'dark' ? env.wallpaperDark : env.wallpaperLight);
  const box = $derived(`left: ${wm.area.x}px; top: ${wm.area.y}px; width: ${wm.area.w}px; height: ${wm.area.h}px`);
  const cx = $derived(card.x - wm.area.x);
  const cy = $derived(card.y - wm.area.y);

  // The real windows move into these slots (GNOME's window picker shows live windows).
  $effect(() => {
    slots.map = picking ? pickerSlots(wins.map((w) => ({ id: w.id, rect: { ...w.rect } })), card, wm.area) : {};
  });

  onMount(() => {
    layer = openLayer();
    entry?.focus();
    return () => {
      layer?.close();
      slots.map = {};
    };
  });

  function onkey(e: KeyboardEvent) {
    // Keys on the whole window: only while the Overview is the top layer of an unlocked session.
    if (!layer?.top() || session.state !== 'session') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (overview.folder) overview.folder = null;
      else if (overview.query) overview.query = '';
      else hideOverview();
      return;
    }
    // Type to search: printable keys go to the search entry wherever the focus is.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement !== entry) entry?.focus();
  }

  function pick(id: string) {
    focus(id);
    hideOverview();
  }

  function drop(e: DragEvent, ws: number) {
    e.preventDefault();
    const id = e.dataTransfer?.getData('text/x-window') || dragId;
    dragId = null;
    if (id) moveToWorkspace(wm, id, ws);
  }

  const thumbStyle = () => `width: ${Math.round(wm.area.w * THUMB_SCALE)}px; height: ${Math.round(wm.area.h * THUMB_SCALE)}px; background-image: url(${wallpaper})`;
</script>

<svelte:window onkeydown={onkey} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overview ov-back" role="presentation" style={box} onclick={(e) => e.target === e.currentTarget && hideOverview()}>
  {#if picking}
    <div class="ws-card" style="translate: {cx}px {cy}px; width: {card.w}px; height: {card.h}px; background-image: url({wallpaper})"></div>
    {#if wm.workspace > 0}
      <button
        class="ws-card sliver prev"
        aria-label="Previous workspace"
        style="translate: {cx - card.w - CARD_GAP}px {cy}px; width: {card.w}px; height: {card.h}px; background-image: url({wallpaper})"
        onclick={() => switchWorkspace(wm, wm.workspace - 1)}
        ondragover={(e) => e.preventDefault()}
        ondrop={(e) => drop(e, wm.workspace - 1)}
      ></button>
    {/if}
    <button
      class="ws-card sliver next"
      aria-label="Next workspace"
      style="translate: {cx + card.w + CARD_GAP}px {cy}px; width: {card.w}px; height: {card.h}px; background-image: url({wallpaper})"
      onclick={() => switchWorkspace(wm, wm.workspace + 1)}
      ondragover={(e) => e.preventDefault()}
      ondrop={(e) => drop(e, wm.workspace + 1)}
    ></button>
  {/if}
</div>

<div class="ov-front" style={box}>
  <label class="search">
    <span class="sym" style:--icon={`url(${icon('edit-find-symbolic')})`}></span>
    <input
      class="search-entry"
      bind:this={entry}
      bind:value={overview.query}
      placeholder="Type to search"
      aria-label="Type to search"
      onkeydown={(e) => e.key === 'Enter' && results?.activateFirst()}
    />
  </label>

  {#if thumbs}
    <div class="ws-thumbs">
      {#each { length: count } as _, i (i)}
        <button
          class="ws-thumb"
          class:current={i === wm.workspace}
          aria-label="Workspace {i + 1}"
          style={thumbStyle()}
          onclick={() => switchWorkspace(wm, i)}
          ondragover={(e) => e.preventDefault()}
          ondrop={(e) => drop(e, i)}
        >
          {#each wm.wins.filter((w) => w.workspace === i && !w.minimized) as w (w.id)}
            <span
              class="mini"
              style="left: {(w.rect.x - wm.area.x) * THUMB_SCALE}px; top: {(w.rect.y - wm.area.y) * THUMB_SCALE}px; width: {w.rect.w * THUMB_SCALE}px; height: {w.rect.h * THUMB_SCALE}px"
            ></span>
          {/each}
        </button>
      {/each}
    </div>
  {/if}

  {#if picking}
    {#each wins as w (w.id)}
      {@const s = slots.map[w.id]}
      {#if s}
        <div
          class="preview"
          role="button"
          tabindex="0"
          aria-label={w.title}
          data-preview={w.id}
          draggable="true"
          style="translate: {s.x - wm.area.x}px {s.y - wm.area.y}px; width: {w.rect.w * s.scale}px; height: {w.rect.h * s.scale}px"
          onclick={() => pick(w.id)}
          onkeydown={(e) => e.key === 'Enter' && pick(w.id)}
          ondragstart={(e) => {
            dragId = w.id;
            e.dataTransfer?.setData('text/x-window', w.id);
          }}
        >
          <button
            class="window-close"
            aria-label="Close"
            onclick={(e) => {
              e.stopPropagation();
              close(w.id);
            }}
          >
            <span class="sym" style:--icon={`url(${icon('preview-close-symbolic')})`}></span>
          </button>
          <span class="window-caption">{w.title}</span>
        </div>
      {/if}
    {/each}
  {/if}

  {#if overview.query}
    <SearchResults bind:this={results} />
  {:else if overview.mode === 'apps'}
    <AppGrid {env} />
  {/if}
</div>

<style>
  /* The Overview: #222222 behind a 30px-radius workspace card (compiled Yaru), fading in over 250ms. */
  .ov-back, .ov-front { position: fixed; animation: ov-in 250ms var(--ease) both; }
  .ov-back { z-index: 5; background: var(--overview-bg); overflow: hidden; }
  .ov-front { z-index: 20; pointer-events: none; }
  .ov-front > :global(*) { pointer-events: auto; }
  .ws-card { position: absolute; left: 0; top: 0; border-radius: 30px; background: center / cover; box-shadow: 0 4px 16px 4px rgb(0 0 0 / .05); }
  .search {
    position: absolute; left: 50%; top: 12px; translate: -50% 0; width: 24em; display: flex; align-items: center; gap: 6px;
    padding: 9px; border-radius: 999px; background: var(--search-bg); color: rgb(242 242 242 / .7);
  }
  .search:hover { background: #454545; color: #f2f2f2; }
  .search:focus-within { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 80%, transparent); }
  .search-entry { flex: 1; min-width: 0; border: 0; outline: none; background: none; color: #f2f2f2; }
  .search-entry::placeholder { color: rgb(242 242 242 / .7); }
  .search-entry::selection { background: color-mix(in srgb, var(--accent) 30%, transparent); }
  .ws-thumbs { position: absolute; left: 50%; top: 66px; translate: -50% 0; display: flex; gap: 6px; padding: 6px; }
  .ws-thumb { position: relative; overflow: hidden; border-radius: 8px; background: center / cover; outline: 3px solid transparent; outline-offset: -3px; }
  .ws-thumb.current { outline-color: var(--accent); }
  .mini { position: absolute; border-radius: 2px; background: var(--win-bg); box-shadow: 0 0 0 1px rgb(0 0 0 / .2); }
  .preview { position: absolute; left: 0; top: 0; border-radius: 12px; }
  .window-close {
    position: absolute; right: -16px; top: -16px; width: 32px; height: 32px; padding: 3px; display: grid; place-items: center;
    border: 2px solid transparent; border-radius: 999px; background: rgb(52 52 52 / .98); color: #f2f2f2;
    box-shadow: 0 2px 4px 0 rgb(0 0 0 / .05); opacity: 0; transition: opacity 150ms;
  }
  .window-caption {
    position: absolute; left: 50%; bottom: 0; translate: -50% 50%; max-width: 100%; padding: 6px 12px; border-radius: 999px;
    background: rgb(0 0 0 / .9); border: 1px solid rgb(255 255 255 / .1); color: #fff; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; opacity: 0; transition: opacity 150ms;
  }
  .preview:hover .window-close, .preview:hover .window-caption, .preview:focus-visible .window-close, .preview:focus-visible .window-caption { opacity: 1; }
  @keyframes ov-in { from { opacity: 0; } }
</style>
