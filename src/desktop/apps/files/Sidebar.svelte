<script lang="ts">
  import { slide } from 'svelte/transition';
  import { fs, fsState } from '../../fs/fs.svelte';
  import { TRASH } from '../../fs/vfs';
  import Scrollbar from '../adw/Scrollbar.svelte';
  import { sym } from './icons';
  import { bookmarkPlace, type Bookmark } from './bookmarks';
  import { acceptsFor, dropRegion, watchPress, type DragInfo, type Region } from './drag';
  import type { Action } from './drop';
  import { LOCATIONS, RECENT, STARRED, type Place } from './places';

  // NautilusSidebar: .navigation-sidebar rows in sections with a separator between them. Only the row that is exactly
  // the current location is selected. The Trash shows whether it holds anything (nautilus_trash_monitor).
  let { location, bookmarks, ongo, oncontext, popupFor, ondrop, onbookmark, onreorder }: {
    location: string;
    bookmarks: Bookmark[];
    ongo: (path: string) => void;
    oncontext: (place: Place, kind: 'bookmark' | 'location', x: number, y: number, anchor: HTMLElement) => void;
    popupFor: string | null;
    ondrop: (place: string, action: Action, paths: string[]) => void;
    /** drop_files_as_bookmarks, on the New bookmark row: first among them. */
    onbookmark: (path: string) => void;
    /** reorder_bookmarks */
    onreorder: (path: string, to: number) => void;
  } = $props();
  let list = $state<HTMLElement>();

  const full = $derived.by(() => {
    void fsState.version;
    return fs().list(TRASH, { hidden: true }).length > 0;
  });
  const iconOf = (p: Place) => (p.path === TRASH && full ? 'user-trash-full-symbolic' : p.icon);

  // start_drop_feedback and stop_drop_feedback: while a drag is over the sidebar, rows it cannot go to are insensitive,
  // and a lone folder brings out the New bookmark row. A bookmark being moved leaves a line where it would go.
  let drag = $state.raw<DragInfo | null>(null);
  let placeholder = $state<number | null>(null);
  let moving = $state<string | null>(null);
  let movingHeight = 0;
  const takes = (d: DragInfo, path: string, kind: string) =>
    d.dragged.kind === 'bookmark' ? kind === 'bookmark' : path !== RECENT && d.preferred(path) !== null;

  /** drag_motion_callback, drag_drop_callback: the row under the pointer decides. */
  const region: Region = {
    at: (x, y, d) => {
      drag = d;
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-place]');
      if (!el || !list?.contains(el)) return null;
      const path = el.dataset.place!;
      const kind = el.dataset.kind!;
      if (d.dragged.kind === 'bookmark') {
        if (kind !== 'bookmark') return null;
        // The line goes above the row, or below it in its lower half.
        const order = Number(el.dataset.order);
        const lower = y - el.getBoundingClientRect().top > movingHeight / 2 && order > 0;
        const to = Math.max(order - 1, 0) + (lower ? 1 : 0);
        placeholder = to;
        const { path: dragged } = d.dragged;
        return { key: `to ${to}`, action: 'move', accepts: ['move'], drop: () => onreorder(dragged, to) };
      }
      const { paths } = d.dragged;
      if (kind === 'new') return { key: 'new', element: el, action: 'copy', drop: () => onbookmark(paths[0]) };
      const action = takes(d, path, kind) ? d.preferred(path) : null;
      // hover_timer: a row it can go to opens, but not the Trash or Starred.
      const open = action && path !== TRASH && path !== STARRED ? { restart: true, run: () => ongo(path) } : undefined;
      return { key: path, element: el, action, accepts: acceptsFor(path, TRASH), open, drop: (a) => ondrop(path, a, paths) };
    },
    leave: () => {
      drag = null;
      placeholder = null;
    },
  };

  /** A bookmark row can be dragged to another place among them (on_row_dragged). */
  function press(e: PointerEvent, path: string) {
    if (e.button !== 0) return;
    const row = e.currentTarget as HTMLElement;
    watchPress(e, () => {
      const r = row.getBoundingClientRect();
      movingHeight = r.height;
      return {
        dragged: { kind: 'bookmark', path },
        picture: { row, press: { x: e.clientX - r.left, y: e.clientY - r.top }, hide: () => (moving = path) },
        onend: () => (moving = null),
      };
    });
  }
</script>

{#snippet row(p: Place, kind: 'bookmark' | 'location', order?: number)}
  <button
    class="row"
    class:has-open-popup={popupFor === p.path}
    class:insensitive={drag !== null && !takes(drag, p.path, kind)}
    class:moving={moving === p.path}
    role="option"
    aria-selected={location === p.path}
    title={p.tooltip}
    data-place={p.path}
    data-kind={kind}
    data-order={order}
    onclick={() => ongo(p.path)}
    onpointerdown={(e) => kind === 'bookmark' && press(e, p.path)}
    oncontextmenu={(e) => {
      e.preventDefault();
      oncontext(p, kind, e.clientX, e.clientY, e.currentTarget);
    }}
  >
    <span class="sym" style:--icon={`url(${sym(iconOf(p))})`}></span>
    <span class="label">{p.label}</span>
  </button>
{/snippet}

<div class="scroll" use:dropRegion={region}>
  <div bind:this={list} class="places" role="listbox" aria-label="Places">
    {#each LOCATIONS as p (p.path)}{@render row(p, 'location')}{/each}
    <div class="separator" role="separator"></div>
    {#if drag?.dragged.kind === 'items' && drag.dragged.folder}
      <!-- NAUTILUS_SIDEBAR_ROW_NEW_BOOKMARK sorts before the bookmarks; its GtkRevealer slides it down. -->
      <div class="row new" role="option" aria-selected="false" title="Add a new bookmark" data-place="" data-kind="new" transition:slide={{ duration: 250 }}>
        <span class="sym" style:--icon={`url(${sym('bookmark-new-symbolic')})`}></span>
        <span class="label">New bookmark</span>
      </div>
    {/if}
    {#each bookmarks.map(bookmarkPlace) as p, i (p.path)}
      {#if placeholder === i}<div class="placeholder"></div>{/if}
      {@render row(p, 'bookmark', i + 1)}
    {/each}
    {#if placeholder !== null && placeholder >= bookmarks.length}<div class="placeholder"></div>{/if}
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
  /* _file-chooser.scss, placessidebar: the drop target, the New bookmark row, the line where a bookmark would go. An
     insensitive row's label is at --disabled-opacity (_labels.scss). */
  .row:global(.drop-active):not(.insensitive) { color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
  .new { color: var(--adw-accent); }
  .insensitive .label { filter: opacity(50%); }
  .moving { display: none; }
  .placeholder { flex: none; min-height: 2px; margin: 0 6px 2px; padding: 0 8px; background: var(--accent); background-clip: content-box; }
</style>
