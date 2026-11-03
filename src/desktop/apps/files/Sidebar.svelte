<script lang="ts">
  import { fs, fsState } from '../../fs/fs.svelte';
  import { TRASH } from '../../fs/vfs';
  import Scrollbar from '../adw/Scrollbar.svelte';
  import { sym } from './icons';
  import { BOOKMARKS, LOCATIONS, type Place } from './places';

  // NautilusSidebar: .navigation-sidebar rows in sections with a separator between them. Only the row that is exactly
  // the current location is selected. The Trash shows whether it holds anything (nautilus_trash_monitor).
  let { location, ongo, oncontext, popupFor }: {
    location: string;
    ongo: (path: string) => void;
    oncontext: (place: Place, kind: 'bookmark' | 'location', x: number, y: number, anchor: HTMLElement) => void;
    popupFor: string | null;
  } = $props();
  let list = $state<HTMLElement>();

  const full = $derived.by(() => {
    void fsState.version;
    return fs().list(TRASH, { hidden: true }).length > 0;
  });
  const iconOf = (p: Place) => (p.path === TRASH && full ? 'user-trash-full-symbolic' : p.icon);
</script>

{#snippet row(p: Place, kind: 'bookmark' | 'location')}
  <button
    class="row"
    class:has-open-popup={popupFor === p.path}
    role="option"
    aria-selected={location === p.path}
    title={p.tooltip}
    onclick={() => ongo(p.path)}
    oncontextmenu={(e) => {
      e.preventDefault();
      oncontext(p, kind, e.clientX, e.clientY, e.currentTarget);
    }}
  >
    <span class="sym" style:--icon={`url(${sym(iconOf(p))})`}></span>
    <span class="label">{p.label}</span>
  </button>
{/snippet}

<div class="scroll">
  <div bind:this={list} class="places" role="listbox" aria-label="Places">
    {#each LOCATIONS as p (p.path)}{@render row(p, 'location')}{/each}
    <div class="separator" role="separator"></div>
    {#each BOOKMARKS as p (p.path)}{@render row(p, 'bookmark')}{/each}
  </div>
  <Scrollbar target={list} />
</div>

<style>
  /* .navigation-sidebar and its rows (libadwaita 1.9), nautilus-sidebar-row.blp (icon margin 8px, label margin 2px). */
  .scroll { position: relative; flex: 1; min-height: 0; display: flex; }
  .places { flex: 1; min-width: 0; overflow-y: auto; scrollbar-width: none; padding: 6px 0 4px; display: flex; flex-direction: column; }
  .row {
    flex: none; display: flex; align-items: center; min-height: 36px; padding: 0 8px; margin: 0 6px 2px; border-radius: 9px;
    text-align: start; outline: none; transition: background-color 200ms var(--ease);
  }
  .row:hover, .row.has-open-popup { background: color-mix(in srgb, currentColor 7%, transparent); }
  .row:active { background: color-mix(in srgb, currentColor 16%, transparent); }
  .row[aria-selected="true"] { background: color-mix(in srgb, currentColor 10%, transparent); }
  .row[aria-selected="true"]:hover { background: color-mix(in srgb, currentColor 13%, transparent); }
  .row[aria-selected="true"]:active { background: color-mix(in srgb, currentColor 19%, transparent); }
  :global(:root[data-focus-ring]) .row:focus { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
  .sym { flex: none; margin-right: 8px; }
  .label { flex: 1; min-width: 0; margin-right: 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .separator { flex: none; height: 1px; margin: 6px; background: color-mix(in srgb, currentColor 15%, transparent); }
</style>
