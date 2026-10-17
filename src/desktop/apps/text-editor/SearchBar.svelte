<script lang="ts" module>
  import type { FindOptions } from './find';

  /** One page's search: what is typed, the options, and the match that is selected (1-based; 0 = none yet). */
  export type Search = FindOptions & { query: string; replace: boolean; replacement: string; position: number };
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { icon } from '../../icons';
  import Popover from '../adw/Popover.svelte';
  import PopoverMenu from '../adw/PopoverMenu.svelte';

  // EditorSearchBar (editor-search-bar.ui): a raised bar at the bottom of the page, its grid clamped to 600px.
  // Row 0: search entry ("n of m"), previous/next, Search & Replace, Search Options, Close. Row 1: replace entry, Replace,
  // Replace All. Up/Down in the entry move between matches; Enter takes the match and closes; Esc puts the cursor back.
  let { search, count, onmove, onaccept, oncancel, onclose, onreplace, onreplaceall }: {
    search: Search;
    count: number;
    onmove: (dir: 1 | -1) => void;
    onaccept: () => void;
    oncancel: () => void;
    onclose: () => void;
    onreplace: () => void;
    onreplaceall: () => void;
  } = $props();

  let entry = $state<HTMLInputElement>();
  let optionsButton = $state<HTMLButtonElement>();
  let options = $state(false);

  export function focusEntry() {
    entry?.focus();
    entry?.select();
  }
  onMount(focusEntry);

  function onentrykey(e: KeyboardEvent) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') onmove(e.key === 'ArrowDown' ? 1 : -1);
    else if (e.key === 'Enter') onaccept();
    else if (e.key === 'Escape') oncancel();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  const info = $derived(count ? `${search.position} of ${count}` : '');
</script>

<div class="searchbar">
  <div class="reveal">
    <div class="clamp">
      <div class="toolbar">
        <label class="entry" style="grid-area: 1 / 1">
          <span class="sym" style:--icon={`url(${icon('edit-find-symbolic')})`}></span>
          <input bind:this={entry} type="search" bind:value={search.query} placeholder="Search" aria-label="Search" onkeydown={onentrykey} />
          <span class="search-info">{info}</span>
          {#if search.query}
            <button class="clear" aria-label="Clear Entry" title="Clear Entry" onclick={() => (search.query = '')}><span class="sym" style:--icon={`url(${icon('edit-clear-symbolic')})`}></span></button>
          {/if}
        </label>
        <div class="moves" style="grid-area: 1 / 2">
          <button class="adw-button flat image" aria-label="Previous Match" title="Previous Match" disabled={!count} onclick={() => onmove(-1)}>
            <span class="sym" style:--icon={`url(${icon('go-up-symbolic')})`}></span>
          </button>
          <button class="adw-button flat image" aria-label="Next Match" title="Next Match" disabled={!count} onclick={() => onmove(1)}>
            <span class="sym" style:--icon={`url(${icon('go-down-symbolic')})`}></span>
          </button>
        </div>
        <button class="adw-button flat image" style="grid-area: 1 / 3" aria-label="Search & Replace" title="Search & Replace" aria-pressed={search.replace} onclick={() => (search.replace = !search.replace)}>
          <span class="sym" style:--icon={`url(${icon('edit-find-replace-symbolic')})`}></span>
        </button>
        <button bind:this={optionsButton} class="adw-button flat image" style="grid-area: 1 / 4" aria-label="Search Options" title="Search Options" aria-haspopup="menu" aria-expanded={options} onclick={() => (options = !options)}>
          <span class="sym" style:--icon={`url(${icon('emblem-system-symbolic')})`}></span>
        </button>
        <button class="adw-button flat circular close" style="grid-area: 1 / 5" aria-label="Close Search" title="Close Search" onclick={onclose}>
          <span class="sym" style:--icon={`url(${icon('window-close-symbolic')})`}></span>
        </button>
        {#if search.replace}
          <label class="entry" style="grid-area: 2 / 1">
            <span class="sym" style:--icon={`url(${icon('edit-find-replace-symbolic')})`}></span>
            <input type="text" bind:value={search.replacement} placeholder="Replace" aria-label="Replace" />
          </label>
          <button class="adw-button" style="grid-area: 2 / 2" disabled={!count} onclick={onreplace}>Replace</button>
          <button class="adw-button" style="grid-area: 2 / 3 / 3 / 6" disabled={!count} onclick={onreplaceall}>Replace All</button>
        {/if}
      </div>
    </div>
  </div>
</div>
{#if options && optionsButton}
  <Popover anchor={optionsButton} label="Search Options" menu onclose={() => (options = false)}>
    <PopoverMenu
      sections={[[
        { label: 'Regular Expressions', checked: search.regex, onactivate: () => (search.regex = !search.regex) },
        { label: 'Case Sensitive', checked: search.caseSensitive, onactivate: () => (search.caseSensitive = !search.caseSensitive) },
        { label: 'Match Whole Word Only', checked: search.wholeWord, onactivate: () => (search.wholeWord = !search.wholeWord) },
      ]]}
      onclose={() => (options = false)}
    />
  </Popover>
{/if}

<style>
  /* toolbarview > .bottom-bar.raised (editor-page.ui bottom-bar-style raised), revealer slide-up, AdwClamp, .toolbar. */
  .searchbar {
    flex: none; display: grid; background: var(--hb-bg);
    box-shadow: 0 -1px color-mix(in srgb, var(--hb-shade) 50%, transparent), 0 -2px 4px color-mix(in srgb, var(--hb-shade) 50%, transparent);
    animation: reveal 250ms var(--ease) both;
  }
  @keyframes reveal { from { grid-template-rows: 0fr; } to { grid-template-rows: 1fr; } }
  .reveal { min-height: 0; overflow: hidden; }
  .clamp { max-width: 600px; margin: 0 auto; }
  .toolbar { display: grid; grid-template-columns: 1fr auto auto auto auto; align-items: center; gap: 6px; padding: 6px; }
  .entry {
    min-width: 0; display: flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 9px; border-radius: 9px;
    background: color-mix(in srgb, currentColor 10%, transparent);
  }
  .entry:focus-within { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
  .entry > .sym { opacity: .7; }
  .entry input { flex: 1; min-width: 0; border: 0; outline: none; background: none; color: inherit; font: inherit; }
  .entry input::placeholder { color: inherit; opacity: .55; }
  .entry input::-webkit-search-cancel-button { appearance: none; }
  .clear { display: grid; place-items: center; }
  .clear .sym { opacity: .7; }
  .clear:hover .sym { opacity: 1; }
  .moves { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 3px; }
  /* style.css: .searchbar button.flat.circular is 24px + 2 × 3px; the close button sits 3px in from the end. */
  .close { min-width: 30px; min-height: 30px; width: 30px; height: 30px; padding: 3px; margin-right: 3px; }
</style>
