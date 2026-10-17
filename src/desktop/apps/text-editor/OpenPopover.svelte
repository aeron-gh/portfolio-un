<script lang="ts">
  import { fs } from '../../fs/fs.svelte';
  import { basename, dirname } from '../../fs/vfs';
  import { icon } from '../../icons';
  import Popover from '../adw/Popover.svelte';
  import { collapse } from './document';
  import { rank } from './recents';
  import { editors, forgetRecent, prefs } from './session.svelte';

  // EditorOpenPopover (editor-open-popover.ui, style.css): a search entry and "Open New Document" over the recently used
  // documents that are not open, newest first. Typing filters and ranks them; Enter opens the best one; Esc goes back
  // to the page. A search with no match shows the same empty page as no history.
  let { anchor, onclose, onopen, refocus }: { anchor: HTMLElement; onclose: () => void; onopen: (path: string) => void; refocus: () => void } = $props();

  let query = $state('');
  let list = $state<HTMLElement>();
  let search = $state<HTMLInputElement>();
  const open = $derived(new Set(Object.values(editors).flatMap((e) => e.docs.flatMap((d) => (d.path ? [d.path] : [])))));
  const items = $derived(
    prefs.recents
      .filter((r) => !open.has(r.path) && fs().exists(r.path))
      .map((r) => ({ path: r.path, title: basename(r.path), subtitle: collapse(dirname(r.path)) })),
  );
  const shown = $derived(rank(items, query));

  function choose(path: string) {
    onclose();
    onopen(path);
  }

  function onsearchkey(e: KeyboardEvent) {
    if (e.key === 'Enter' && shown.length) {
      e.preventDefault();
      choose(shown[0].path);
    } else if (e.key === 'ArrowDown' && shown.length) {
      e.preventDefault();
      list?.querySelector<HTMLElement>('[role="option"]')?.focus();
    }
  }

  function onrowkey(e: KeyboardEvent, path: string) {
    const rows = [...list!.querySelectorAll<HTMLElement>('[role="option"]')];
    const at = rows.indexOf(e.currentTarget as HTMLElement);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(path);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      rows[Math.max(0, Math.min(rows.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
    }
  }
</script>

<Popover {anchor} {onclose} {refocus} label="Recently Used Documents" align="start" flush>
  <div class="open-popover">
    <div class="top">
      <label class="entry">
        <span class="sym" style:--icon={`url(${icon('edit-find-symbolic')})`}></span>
        <input bind:this={search} type="search" bind:value={query} placeholder="Search documents" aria-label="Search documents" onkeydown={onsearchkey} />
        {#if query}<button class="clear" aria-label="Clear Entry" title="Clear Entry" onclick={() => (query = '')}><span class="sym" style:--icon={`url(${icon('edit-clear-symbolic')})`}></span></button>{/if}
      </label>
      <button class="adw-button image" aria-label="Open New Document" title="Open New Document" disabled>
        <span class="sym" style:--icon={`url(${icon('document-open-symbolic')})`}></span>
      </button>
    </div>
    <div class="separator"></div>
    {#if shown.length}
      <div bind:this={list} class="list" role="listbox" aria-label="Recently Used Documents">
        {#each shown as item (item.path)}
          <div class="row" role="option" aria-selected="false" tabindex="-1" onclick={() => choose(item.path)} onkeydown={(e) => onrowkey(e, item.path)}>
            <span class="titles"><span class="title">{item.title}</span><span class="subtitle">{item.subtitle}</span></span>
            <button class="adw-button flat circular remove" aria-label="Remove" title="Remove" onclick={(e) => (e.stopPropagation(), forgetRecent(item.path), search?.focus())}>
              <span class="sym" style:--icon={`url(${icon('window-close-symbolic')})`}></span>
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty">
        <span class="sym big" style:--icon={`url(${icon('document-open-recent-symbolic')})`}></span>
        <span>No Recent Documents</span>
      </div>
    {/if}
  </div>
</Popover>

<style>
  /* editor-open-popover.ui (350px wide, contents padding 0), entry (libadwaita 1.9), the rows in style.css. */
  .open-popover { width: 350px; }
  .top { display: flex; gap: 6px; margin: 6px; }
  .entry {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 9px; border-radius: 9px;
    background: color-mix(in srgb, currentColor 10%, transparent); outline: 0 solid transparent; transition: outline-color 200ms var(--ease);
  }
  .entry:focus-within { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
  .entry .sym { opacity: .7; }
  .clear { display: grid; place-items: center; }
  .clear:hover .sym { opacity: 1; }
  .clear:active .sym { opacity: .8; }
  .entry input { flex: 1; min-width: 0; border: 0; outline: none; background: none; color: inherit; font: inherit; }
  .entry input::placeholder { color: inherit; opacity: .55; }
  .entry input::-webkit-search-cancel-button { appearance: none; }
  .separator { height: 1px; background: color-mix(in srgb, currentColor 15%, transparent); }
  .list { max-height: 600px; overflow: auto; margin-bottom: 3px; }
  /* listview > row padding 2px + the row grid's margins (3px, end 6px) and its empty indicator column (6px gap). */
  .row { display: flex; align-items: center; gap: 6px; margin: 3px 6px; padding: 5px 8px; border-radius: 6px; outline: none; }
  .row:first-child { margin-top: 6px; }
  .row:hover, .row:focus-visible { background: color-mix(in srgb, currentColor 10%, transparent); }
  .titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .title, .subtitle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .subtitle { font-size: 82%; line-height: 140%; opacity: .55; }
  .remove { min-width: 24px; min-height: 24px; width: 30px; height: 30px; padding: 3px; }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 24px; margin: 36px 6px; }
  .empty > * { opacity: .55; }
  .big { width: 96px; height: 96px; }
</style>
