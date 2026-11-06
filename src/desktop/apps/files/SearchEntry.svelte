<script lang="ts">
  import { onMount } from 'svelte';
  import { HOME } from '../../fs/vfs';
  import Popover from '../adw/Popover.svelte';
  import StatusPage from '../adw/StatusPage.svelte';
  import { sym } from './icons';
  import { isSpecial } from './places';
  import { hasActiveFilter, type SearchText, type TimeType } from './query';

  // NautilusQueryEditor: an entry with its icon, a clear icon, the filter button, and a note on folders the index does not
  // cover. `location` is null for Search Everywhere.
  let { query, location, content, timeType, onchange, onactivate, onfocusview, oncontent, ontime }: {
    query: SearchText;
    location: string | null;
    content: boolean;
    timeType: TimeType;
    onchange: (next: SearchText) => void;
    onactivate: () => void;
    onfocusview: () => void;
    oncontent: (on: boolean) => void;
    ontime: (type: TimeType) => void;
  } = $props();

  let entry = $state<HTMLInputElement>();
  let filtersFor = $state<HTMLElement | null>(null);
  let infoFor = $state<HTMLElement | null>(null);
  // update_search_information: Home is all indexed here, so a note only comes up outside it.
  const noted = $derived(location !== null && !isSpecial(location) && location !== HOME && !location.startsWith(`${HOME}/`));

  /** The filters load apart from Files; they start loading as the entry opens, so they are there by the time of a click. */
  const filters = import('./SearchFilters.svelte');

  onMount(() => {
    entry?.focus();
    const end = entry?.value.length ?? 0;
    entry?.setSelectionRange(end, end);
  });
  export const focus = () => entry?.focus();
  /** nautilus_query_editor_select_all_text */
  export const selectAll = () => {
    entry?.focus();
    entry?.select();
  };

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') onactivate();
    else if (e.key === 'ArrowDown') onfocusview(); // the focus-view shortcut
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
</script>

<div class="entry">
  <span class="sym prefix" style:--icon={`url(${sym(location !== null ? 'nautilus-folder-search-symbolic' : 'edit-find-symbolic')})`}></span>
  <input
    bind:this={entry}
    type="text"
    role="searchbox"
    value={query.text}
    placeholder={location !== null ? 'Search current folder' : 'Search everywhere'}
    aria-label={location !== null ? 'Search current folder' : 'Search everywhere'}
    spellcheck="false"
    autocomplete="off"
    oninput={(e) => onchange({ ...query, text: e.currentTarget.value })}
    {onkeydown}
  />
  <button
    class="icon"
    class:gone={!query.text}
    aria-label="Clear Entry"
    title="Clear Entry"
    tabindex="-1"
    onmousedown={(e) => e.preventDefault()}
    onclick={() => onchange({ ...query, text: '' })}
  >
    <span class="sym" style:--icon={`url(${sym('edit-clear-symbolic')})`}></span>
  </button>
  <button
    class="small"
    class:accent={hasActiveFilter(query, content)}
    aria-label="Filter Search Results"
    title="Filter Search Results"
    aria-haspopup="dialog"
    aria-expanded={!!filtersFor}
    onclick={(e) => (filtersFor = filtersFor ? null : e.currentTarget)}
  >
    <span class="sym" style:--icon={`url(${sym('nautilus-search-filters-symbolic')})`}></span>
  </button>
  {#if noted}
    <button class="small" aria-label="Search Information" title="Search Information" aria-haspopup="dialog" aria-expanded={!!infoFor} onclick={(e) => (infoFor = infoFor ? null : e.currentTarget)}>
      <span class="sym" style:--icon={`url(${sym('info-outline-symbolic')})`}></span>
    </button>
  {/if}
</div>
{#if filtersFor}
  {#await filters then { default: SearchFilters }}
  <SearchFilters
    anchor={filtersFor}
    {query}
    {content}
    {timeType}
    {onchange}
    {oncontent}
    {ontime}
    onclose={() => {
      filtersFor = null;
      entry?.focus(); // g_signal_connect_swapped (popover, "closed", gtk_widget_grab_focus, editor)
    }}
    refocus={() => entry?.focus()}
  />
  {/await}
{/if}
{#if infoFor}
  <Popover anchor={infoFor} label="Search Information" flush onclose={() => (infoFor = null)}>
    <div class="note">
      <StatusPage compact title="Folder Not in Search Locations" description="Search may be slow and will not include file contents">
        <button class="adw-button pill" disabled>Search Settings</button>
      </StatusPage>
    </div>
  </Popover>
{/if}

<style>
  /* entry.search, .nautilus-query-editor: prefix icon 4px in and 6px before the text. */
  .entry { display: flex; align-items: center; height: 34px; padding: 0 5px 0 9px; border-radius: 9px; background: color-mix(in srgb, currentColor 10%, transparent); }
  .entry:focus-within { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
  .prefix { flex: none; margin: 0 6px 0 4px; opacity: .7; }
  input { flex: 1; min-width: 0; border: 0; padding: 0; background: none; color: inherit; font: inherit; outline: none; }
  input::placeholder { color: inherit; opacity: .5; }
  /* entry > image: 70% until the pointer is over it. It keeps its room when gone (gtk_widget_set_child_visible). */
  .icon { flex: none; display: grid; place-items: center; margin: 0 4px; opacity: .7; }
  .icon:hover { opacity: 1; }
  .gone { visibility: hidden; }
  /* .nautilus-query-editor > menubutton > button: round, 24px, no background and 70% until the pointer is over it or it is open. */
  .small { flex: none; display: grid; place-items: center; width: 24px; height: 24px; margin: 5px 0; border-radius: 100%; opacity: .7; transition: background 200ms var(--ease); }
  .small:hover { opacity: 1; background: color-mix(in srgb, currentColor 7%, transparent); }
  .small[aria-expanded="true"] { opacity: 1; background: color-mix(in srgb, currentColor 10%, transparent); }
  .accent { color: var(--adw-accent); }
  .note { display: flex; width: 300px; }
</style>
