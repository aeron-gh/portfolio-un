<script lang="ts">
  import { tick } from 'svelte';
  import { iconFor } from '../../shell/file-icons';
  import { uses24h } from '../../system/clock';
  import { settings } from '../../system/settings.svelte';
  import { dateText, formatSize, itemCount } from './format';
  import { fileIcon, sym } from './icons';
  import Popover from '../adw/Popover.svelte';
  import Scrollbar from '../adw/Scrollbar.svelte';
  import emblemUnreadable from './icons/emblem-unreadable.png?url';
  import { fit } from './fit';
  import type { ViewMode } from './prefs';
  import { dropRegion, THRESHOLD, watchPress, type Region } from './drag';
  import type { Action } from './drop';
  import { clickItem, edgeDelta, invert, moveCursor, none, selectAll, targetIndex, type Selection } from './selection';
  import type { Entry, Sort, SortKey } from './sort';

  // NautilusGridView (a GtkGridView of NautilusGridCell) and NautilusListView (a GtkColumnView with name, size, date and
  // star columns). Clicks and keys select as GTK's list widgets do.
  let { entries, selection = $bindable(), mode, iconSize, sort, kind, starable, isCut, isStarred, startScroll, onscrolled, onactivate, onnewtab, onsort, onstar, ondrop }: {
    entries: Entry[];
    selection: Selection;
    mode: ViewMode;
    iconSize: number;
    sort: Sort;
    /** What kind of place this is decides its last column. */
    kind: 'folder' | 'trash' | 'recent' | 'starred';
    /** nautilus_tag_manager_can_star_contents: whether there is a star column at all. */
    starable: boolean;
    isCut: (path: string) => boolean;
    isStarred: (path: string) => boolean;
    /** Where this tab had got to, and where to report it. */
    startScroll: number;
    onscrolled: (top: number) => void;
    onactivate: (picked: Entry[]) => void;
    onnewtab: (picked: Entry[]) => void;
    onsort: (sort: Sort) => void;
    onstar: (entry: Entry) => void;
    /** A drop on a folder in the view. */
    ondrop: (place: string, action: Action, paths: string[]) => void;
  } = $props();

  // nautilus-column-utilities.c: the Trash shows when things went, and Recent when they were used.
  const lastColumn = { folder: { key: 'date_modified', label: 'Modified' }, starred: { key: 'date_modified', label: 'Modified' }, trash: { key: 'trashed_on', label: 'Trashed On' }, recent: { key: 'recency', label: 'Recency' } } as const;
  const columns = $derived<{ key: SortKey; label: string }[]>([{ key: 'name', label: 'Name' }, { key: 'size', label: 'Size' }, lastColumn[kind]]);
  /** A star just clicked turns as it changes (rotate_star, rotate_unstar). */
  let interacted = $state<string | null>(null);
  let matchShown = $state<{ entry: Entry; anchor: HTMLElement } | null>(null);
  const clock24 = $derived(settings.clock24 ?? uses24h());
  const sizeText = (e: Entry) => (e.node.kind !== 'dir' ? formatSize(e.node.size) : e.count < 0 ? '' : itemCount(e.count));
  /** A column header: sorts by that column; on the column already in use, turns the order round. */
  const toggleSort = (key: SortKey) => onsort({ key, reversed: sort.key === key ? !sort.reversed : false });

  let root = $state<HTMLElement>();
  let scrolled = $state(false);
  let headerHeight = $state(0);
  const order = $derived(entries.map((e) => e.path));
  const THUMBNAIL_MINIMUM = 32; // NAUTILUS_THUMBNAIL_MINIMUM_ICON_SIZE
  const isHidden = (e: Entry) => e.node.hidden === true || e.node.name.startsWith('.');

  /** Thumbnails stand in for an image file's icon (show-image-thumbnails). */
  const thumbnail = (e: Entry) => (iconSize >= THUMBNAIL_MINIMUM && e.node.mime?.startsWith('image/') && e.node.url ? e.node.url : null);

  const itemAt = (target: EventTarget | null) => (target as Element).closest<HTMLElement>('.item')?.dataset.path ?? null;
  const elementFor = (path: string) => root?.querySelector<HTMLElement>(`.item[data-path="${CSS.escape(path)}"]`);

  /** A plain click on something already selected waits for the release, in case it becomes a drag. */
  let collapse: string | null = null;
  /** gtk_list_base_start_rubberband: in the content's own coordinates, so it stays put when the view scrolls. */
  let band = $state<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  let bandFrom: { x: number; y: number; id: number; keep: string[] } | null = null;

  const toContent = (e: PointerEvent) => {
    const r = root!.getBoundingClientRect();
    return { x: e.clientX - r.left + root!.scrollLeft, y: e.clientY - r.top + root!.scrollTop };
  };

  let bandFrame = 0;
  let bandLast: PointerEvent | null = null;
  function bandMove(e: PointerEvent) {
    if (!bandFrom) return;
    bandLast = e;
    const to = toContent(e);
    // gtk_list_base_drag_update: a band once the pointer is past the drag threshold, and a click before.
    if (!band && Math.abs(to.x - bandFrom.x) <= THRESHOLD && Math.abs(to.y - bandFrom.y) <= THRESHOLD) return;
    band = { x0: Math.min(bandFrom.x, to.x), y0: Math.min(bandFrom.y, to.y), x1: Math.max(bandFrom.x, to.x), y1: Math.max(bandFrom.y, to.y) };
    const r = root!.getBoundingClientRect();
    const touched = [...root!.querySelectorAll<HTMLElement>('.item')]
      .filter((el) => {
        const b = el.getBoundingClientRect();
        const [x, y] = [b.left - r.left + root!.scrollLeft, b.top - r.top + root!.scrollTop];
        return x < band!.x1 && x + b.width > band!.x0 && y < band!.y1 && y + b.height > band!.y0;
      })
      .map((el) => el.dataset.path!);
    const on = new Set([...bandFrom.keep, ...touched]);
    selection = { ...selection, selected: order.filter((p) => on.has(p)) };
  }
  /** Each frame, as GTK's tick callback does: near or past an edge the view scrolls, and the band goes with it. */
  function bandTick() {
    bandFrame = requestAnimationFrame(bandTick);
    if (band && bandLast && autoscroll(bandLast.clientX, bandLast.clientY, true)) bandMove(bandLast);
  }

  function bandEnd() {
    bandFrom = null;
    band = null;
    bandLast = null;
    cancelAnimationFrame(bandFrame);
  }

  let drift = 0;
  /** update_autoscroll, on the list below its column header. The band goes on past the edge; a drag only over the view.
   *  The steps are fractions of a pixel, so what is left over is kept for the next frame. */
  function autoscroll(x: number, y: number, past = false): boolean {
    if (!root) return false;
    const r = root.getBoundingClientRect();
    const top = r.top + (mode === 'list' ? headerHeight : 0);
    if (!past && (x < r.left || x > r.right || y < top || y > r.bottom)) return false;
    const step = edgeDelta(y - top, r.bottom - top);
    if (!step) {
      drift = 0;
      return false;
    }
    const whole = Math.trunc(step + drift);
    drift = step + drift - whole;
    const before = root.scrollTop;
    root.scrollTop += whole;
    return root.scrollTop !== before;
  }

  /** setup_cell_common's drop target on each folder, and hover_timer that opens it. Anything else is left to the view
   *  around it. */
  const region: Region = {
    at: (x, y, drag) => {
      if (drag.dragged.kind !== 'items') return null;
      const { paths } = drag.dragged;
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('.item');
      const entry = el && root?.contains(el) ? entries.find((en) => en.path === el.dataset.path) : undefined;
      const action = entry?.node.kind === 'dir' ? drag.preferred(entry.path) : null;
      if (!el || !entry || !action) return null;
      return {
        key: entry.path,
        element: mode === 'grid' ? el.querySelector<HTMLElement>('.cell') : el,
        action,
        open: { moved: true, restart: true, run: () => onactivate([entry]) },
        drop: (a) => ondrop(entry.path, a, paths),
      };
    },
    scroll: (x, y) => autoscroll(x, y),
  };

  function onpointerdown(e: PointerEvent) {
    if ((e.target as Element).closest('button')) return; // a column header, or a star
    const path = itemAt(e.target);
    const mods = { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey };
    collapse = null;
    if (!path) {
      // on_view_click_pressed: the background takes the focus, and only Ctrl or Shift keep the selection.
      if (!mods.ctrl && !mods.shift) selection = none;
      root?.focus({ preventScroll: true });
      if (e.button === 0) {
        const at = toContent(e);
        bandFrom = { ...at, id: e.pointerId, keep: mods.ctrl || mods.shift ? [...selection.selected] : [] };
        root?.setPointerCapture(e.pointerId);
        bandFrame = requestAnimationFrame(bandTick);
      }
      return;
    }
    const on = selection.selected.includes(path);
    if (e.button === 0) {
      if (on && !mods.ctrl && !mods.shift) collapse = path;
      else selection = clickItem(order, selection, path, mods);
      // on_item_drag_prepare: what is dragged is the selection, with the pressed item in it.
      watchPress(e, () => {
        collapse = null;
        if (!selection.selected.includes(path)) selection = clickItem(order, selection, path, {});
        const paths = order.filter((p) => selection.selected.includes(p));
        const one = paths.length === 1 ? entries.find((en) => en.path === paths[0]) : undefined;
        return { dragged: { kind: 'items', paths, folder: one?.node.kind === 'dir' } };
      });
    } else if (e.button === 2 && !on) selection = clickItem(order, selection, path, {});
    elementFor(path)?.focus({ preventScroll: true });
  }

  /** on_item_click_pressed: a middle-click selects what is under it if need be, and opens the selection in new tabs. */
  function onauxclick(e: MouseEvent) {
    const path = e.button === 1 ? itemAt(e.target) : null;
    if (!path) return;
    if (!selection.selected.includes(path)) selection = clickItem(order, selection, path, {});
    onnewtab(entries.filter((en) => selection.selected.includes(en.path)));
  }

  function onpointerup() {
    if (collapse) selection = clickItem(order, selection, collapse, {});
    collapse = null;
    bandEnd();
  }

  function ondblclick(e: MouseEvent) {
    // on_item_click_pressed: with Ctrl or Shift held it only selects.
    if (itemAt(e.target) && !e.ctrlKey && !e.metaKey && !e.shiftKey) onactivate(entries.filter((en) => selection.selected.includes(en.path)));
  }

  function onkeydown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
    // gtk_list_base_class_init: Ctrl+A or Ctrl+/ for all, Ctrl+Shift+A or Ctrl+\ for none.
    if (ctrl && !e.altKey && !e.shiftKey && (e.key.toLowerCase() === 'a' || e.key === '/')) selection = selectAll(order);
    else if (ctrl && !e.altKey && ((e.shiftKey && e.key.toLowerCase() === 'a') || e.key === '\\')) selection = none;
    else if (ctrl && e.shiftKey && e.key.toLowerCase() === 'i') selection = invert(order, selection);
    else if (e.key === 'Enter' && !ctrl && !e.altKey) onactivate(entries.filter((en) => selection.selected.includes(en.path)));
    else if (!e.altKey) return move(e);
    else return;
    e.preventDefault();
  }

  function move(e: KeyboardEvent) {
    const cols = mode === 'grid' && root ? getComputedStyle(root).gridTemplateColumns.split(' ').length : 1;
    const first = root?.querySelector<HTMLElement>('.item');
    const page = first && root ? Math.max(1, Math.floor(root.clientHeight / first.offsetHeight)) : 1;
    const from = selection.cursor ? order.indexOf(selection.cursor) : -1;
    const to = targetIndex(from, e.key, cols, order.length, page);
    if (to === null || !order.length) return;
    e.preventDefault();
    selection = moveCursor(order, selection, order[to], { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
    void tick().then(() => {
      const el = elementFor(order[to]);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  /** get_dash_width, get_dash_length, get_dash_radius (nautilus-ui-utilities.c), by icon size. */
  const DASH: Record<number, [number, number, number]> = {
    16: [1, 4, 2], 32: [1.5, 6, 4], 48: [2, 10, 5.33], 64: [2, 10, 5.33], 96: [3, 15, 8], 168: [4, 20, 10.66], 256: [5, 25, 13.33],
  };

  $effect(() => {
    if (root && startScroll) root.scrollTop = startScroll;
  });

  // GtkListBase keeps the keyboard while its items change. Here the focused item can be removed with them, which leaves
  // the keyboard nowhere: it comes back to the cursor.
  let hadFocus = false;
  /** A focused element that is removed sends focusout just before it goes, with nowhere else to go; what is still in
   *  the page afterwards had the keyboard taken from it, and the view lets it go. */
  function onfocusout(e: FocusEvent) {
    const left = e.target as Element;
    if (e.relatedTarget) hadFocus = !!root?.contains(e.relatedTarget as Node);
    else queueMicrotask(() => left.isConnected && (hadFocus = false));
  }
  $effect(() => {
    void order;
    if (hadFocus && (document.activeElement === document.body || !document.activeElement)) focus({ preventScroll: true });
  });

  export const element = (path: string) => elementFor(path);
  /** The view, or an item in it, has the keyboard. */
  export const hasFocus = () => !!root?.contains(document.activeElement);
  /** A view that has just been filled starts at the top. */
  export const toTop = () => {
    if (root) root.scrollTop = 0;
  };
  /** What a move has selected may be out of sight. */
  export const reveal = () => selection.cursor && elementFor(selection.cursor)?.scrollIntoView({ block: 'nearest' });
  export const focus = (options?: FocusOptions) => (selection.cursor && elementFor(selection.cursor) ? elementFor(selection.cursor)! : root)?.focus(options);
</script>

{#snippet icon(entry: Entry)}
  <span class="icon" class:hidden-file={isHidden(entry)}>
    {#if isCut(entry.path)}
      {@render cutMark()}
    {:else if thumbnail(entry)}
      <img class="thumbnail" src={thumbnail(entry)} alt="" loading="lazy" draggable="false" />
    {:else}
      <img src={fileIcon(iconFor(entry.path, entry.node), iconSize)} alt="" width={iconSize} height={iconSize} draggable="false" />
    {/if}
  </span>
{/snippet}

{#snippet cutMark()}
  <!-- nautilus_ui_draw_icon_dashed_border, and cut-symbolic in the middle: where a cut file's icon was. -->
  <span class="cut-mark">
    {#if iconSize >= 32}
      {@const d = DASH[iconSize]}
      {@const stroke = d[0]}
      {@const side = iconSize - stroke}
      {@const length = side * 4 + 2 * Math.PI * d[2] - 8 * d[2]}
      {@const dash = length / Math.round(length / (d[1] + stroke))}
      <svg width={iconSize} height={iconSize} aria-hidden="true">
        <rect x={stroke / 2} y={stroke / 2} width={side} height={side} rx={d[2]} fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width={stroke} stroke-dasharray="{dash * 0.65} {dash * 0.35}" />
      </svg>
    {/if}
    <span class="sym scissors" style:--icon={`url(${sym(iconSize <= 32 ? 'cut-symbolic' : 'cut-large-symbolic')})`}></span>
  </span>
{/snippet}

<div class="scroll" use:dropRegion={region}>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={root}
  class={['view', mode]}
  onscroll={(e) => {
    scrolled = e.currentTarget.scrollTop > 0;
    onscrolled(e.currentTarget.scrollTop);
  }}
  onmousedown={(e) => e.button === 1 && e.preventDefault()}
  {onauxclick}
  class:no-star={!starable}
  class:compact={mode === 'list' && iconSize === 16}
  style:--icon="{iconSize}px"
  tabindex="-1"
  {onpointerdown}
  onpointermove={bandMove}
  {onpointerup}
  onpointercancel={bandEnd}
  {ondblclick}
  {onkeydown}
  onfocusin={() => (hadFocus = true)}
  {onfocusout}
>
  {#if mode === 'list'}
    <div class="header" role="row" bind:clientHeight={headerHeight}>
      {#each columns as col (col.key)}
        <button
          class={['col', col.key]}
          role="columnheader"
          aria-sort={sort.key === col.key ? (sort.reversed ? 'descending' : 'ascending') : undefined}
          onclick={() => toggleSort(col.key)}
        >
          <span>{col.label}</span>
          {#if sort.key === col.key}<span class="sym indicator" style:--icon={`url(${sym(sort.reversed ? 'pan-down-symbolic' : 'pan-up-symbolic')})`}></span>{/if}
        </button>
      {/each}
      {#if starable}<span class="col star" role="columnheader"></span>{/if}
    </div>
  {/if}
  <div class="items" role="listbox" aria-label="Content" aria-multiselectable="true">
    {#each entries as entry, i (entry.path)}
      <div class="item" role="option" aria-label={entry.node.name} aria-selected={selection.selected.includes(entry.path)} tabindex={selection.cursor === entry.path || (!selection.cursor && i === 0) ? 0 : -1} data-path={entry.path}>
        {#if mode === 'list'}
          <div class="cell name">
            {@render icon(entry)}
            <span class="labels">
              <span class="label" use:fit={{ text: entry.node.name, lines: 1 }}></span>
              {#if entry.where}<span class="path"><bdi>{entry.where}</bdi></span>{/if}
            </span>
            {#if entry.node.denied}<img class="emblem" src={emblemUnreadable} alt="" width="16" height="16" />{/if}
            {#if entry.snippet}
              <button class="adw-button fts-snippet" aria-label="Full Text Match" title="Full Text Match" tabindex="-1" onclick={(e) => (matchShown = { entry, anchor: e.currentTarget })}>
                <span class="sym" style:--icon={`url(${sym('quotation-symbolic')})`}></span>
              </button>
            {/if}
          </div>
          <span class="cell dim size">{sizeText(entry)}</span>
          <span class="cell dim date">{dateText((kind === 'recent' && entry.at) || (kind === 'trash' && entry.node.trashed) || entry.node.mtime, new Date(), clock24)}</span>
          {#if starable}
            {@const on = isStarred(entry.path)}
            <span class="cell star">
              <button
                class="star-button"
                class:starred={on}
                class:interacted={interacted === entry.path}
                aria-label={on ? 'Unstar' : 'Star'}
                title={on ? 'Unstar' : 'Star'}
                tabindex="-1"
                onclick={() => {
                  interacted = entry.path;
                  onstar(entry);
                }}
              >
                <span class="sym" style:--icon={`url(${sym(on ? 'starred-symbolic' : 'non-starred-symbolic')})`}></span>
              </button>
            </span>
          {/if}
        {:else}
          <div class="cell">
            {@render icon(entry)}
            {#if isStarred(entry.path) || entry.node.denied}
              <span class="emblems">
                {#if isStarred(entry.path)}<span class="sym emblem-star" style:--icon={`url(${sym('starred-symbolic')})`}></span>{/if}
                {#if entry.node.denied}<img class="emblem" src={emblemUnreadable} alt="" width="16" height="16" />{/if}
              </span>
            {/if}
            <span class="label" use:fit={{ text: entry.node.name, lines: 3 }}></span>
          </div>
        {/if}
      </div>
    {/each}
  </div>
  {#if band}
    <div class="rubberband" style:left="{band.x0}px" style:top="{band.y0}px" style:width="{band.x1 - band.x0}px" style:height="{band.y1 - band.y0}px"></div>
  {/if}
</div>
{#if scrolled}<div class="undershoot" style:top="{mode === 'list' ? headerHeight : 0}px"></div>{/if}
<Scrollbar target={root} />
</div>
{#if matchShown}
  <Popover anchor={matchShown.anchor} label="Full Text Match" flush onclose={() => (matchShown = null)}>
    <p class="snippet">{#each matchShown.entry.snippet ?? [] as part, i (i)}{#if part.bold}<b>{part.text}</b>{:else}{part.text}{/if}{/each}</p>
  </Popover>
{/if}

<style>
  /* style.css: the view keeps its own grey accent (--accent-bg-color: #959595), so selecting a file is not orange. */
  .view {
    --file-accent: #959595; --file-focus: oklab(from #959595 min(l, 0.5) a b);
    position: relative; flex: 1; min-width: 0; overflow: auto; scrollbar-width: none; outline: none; user-select: none; align-content: start;
  }
  :global(:root[data-style="dark"]) .view { --file-focus: oklab(from #959595 max(l, 0.85) a b); }

  .items { display: contents; }
  .scroll { position: relative; flex: 1; min-width: 0; min-height: 0; display: flex; }
  /* AdwToolbarView's undershoot-top, under the header when there is one: the content has gone under the bar. */
  .undershoot {
    position: absolute; left: 0; right: 0; z-index: 1; height: 4px; pointer-events: none; box-shadow: inset 0 1px color-mix(in srgb, var(--adw-shade) 75%, transparent);
    background: linear-gradient(to bottom, color-mix(in srgb, var(--adw-shade) 75%, transparent), transparent 4px);
  }

  /* .nautilus-grid-view gridview (18px, 6px apart, at most 20 columns); nautilus-grid-cell.c: an 18px emblem margin
     either side of the icon, inside the cell's 6px. */
  .grid { display: grid; gap: 6px; padding: 18px; grid-template-columns: repeat(auto-fill, minmax(max(calc(var(--icon) + 48px), calc((100% - 114px) / 20)), 1fr)); }

  /* .nautilus-list-view: columnview 24px in, its listview 16px down and 24px up, rows 8px apart (4px when compact). The
     name column takes the room left; the others are as wide as their widest cell. The rows share the header's columns. */
  .list { display: grid; grid-template-columns: minmax(0, 1fr) max-content max-content max-content; grid-auto-rows: min-content; align-content: start; padding: 0 24px 24px; }
  .list.no-star { grid-template-columns: minmax(0, 1fr) max-content max-content; }
  .header { position: sticky; top: 0; z-index: 1; grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; margin-bottom: 16px; background: var(--view-bg); }
  .list .item { scroll-margin-top: 40px; grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; align-items: center; margin-bottom: 8px; border-radius: 9px; }
  .compact .item { margin-bottom: 4px; }
  /* columnview > header > button */
  .col { display: flex; align-items: center; gap: 6px; padding: 3px 6px; line-height: 100%; font-size: 82%; font-weight: 700; color: color-mix(in srgb, currentColor 40%, transparent); text-align: start; }
  button.col:hover { color: color-mix(in srgb, currentColor 70%, transparent); }
  button.col:active { color: currentColor; }
  .col.date_modified, .col.trashed_on { justify-content: flex-end; }
  .indicator { width: 16px; height: 16px; }
  .list .cell { padding: 6px; }
  .compact .cell { padding-top: 3px; padding-bottom: 3px; }
  .list .name { flex-direction: row; min-width: 0; }
  .labels { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .list .label { width: auto; min-width: 0; text-align: start; white-space: pre; overflow: hidden; }
  /* nautilus-name-cell.blp path: .caption, .dim-label, cut at the start (the end is the part that tells them apart). */
  .path { font-size: 82%; line-height: 140%; opacity: .55; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; direction: rtl; text-align: left; }
  /* menubutton.fts-snippet > button */
  .fts-snippet { flex: none; min-height: 0; padding: 2px 12px; border-radius: 100px; }
  /* its popover: 18px in, 65 characters wide, 10 lines at most */
  .snippet { margin: 0; padding: 18px; max-width: 65ch; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 10; line-clamp: 10; overflow: hidden; overflow-wrap: anywhere; white-space: pre-wrap; }
  .dim { opacity: .55; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .date { text-align: right; }
  .star { display: grid; justify-items: end; }
  /* button.star, .flat.circular, margins reaching into the row's padding */
  .star-button { display: grid; place-items: center; width: 34px; height: 34px; margin: -3px 0; border-radius: 100%; opacity: .55; transition: background 200ms var(--ease); }
  .star-button:hover { opacity: 1; background: color-mix(in srgb, currentColor 7%, transparent); }
  .star-button:active { background: color-mix(in srgb, currentColor 16%, transparent); }
  .star-button.starred { opacity: 1; }
  .star-button.interacted.starred .sym { animation: rotate-star 400ms ease; }
  .star-button.interacted:not(.starred) .sym { animation: rotate-unstar 400ms ease; }
  @keyframes rotate-star { from { transform: rotate(-72deg); } }
  @keyframes rotate-unstar { from { transform: rotate(72deg); } }
  .compact .star-button { width: 24px; height: 24px; }
  .item { min-width: 0; border-radius: 12px; outline: none; transition: background 150ms var(--ease); }
  .item:hover { background: color-mix(in srgb, currentColor 4%, transparent); }
  .item:active { background: color-mix(in srgb, currentColor 8%, transparent); }
  .item[aria-selected="true"] { background: color-mix(in srgb, var(--file-accent) 25%, transparent); }
  .item[aria-selected="true"]:hover { background: color-mix(in srgb, var(--file-accent) 32%, transparent); }
  .item[aria-selected="true"]:active { background: color-mix(in srgb, var(--file-accent) 39%, transparent); }
  /* :drop(active): libadwaita's inset line in the drop colour, the view's grey; on the whole row in the list. */
  .list .item:global(.drop-active), .cell:global(.drop-active) { box-shadow: inset 0 0 0 1px var(--file-accent); }
  :global(:root[data-focus-ring]) .item:focus { outline: 2px solid color-mix(in srgb, var(--file-focus) 50%, transparent); outline-offset: -2px; }
  /* rubberband in libadwaita and style.css */
  .rubberband { position: absolute; z-index: 1; border: 1px solid var(--file-focus); border-radius: 6px; background: color-mix(in srgb, var(--file-focus) 20%, transparent); pointer-events: none; }
  .cell { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 6px; border-radius: 12px; }
  /* nautilus-grid-cell.c: emblems in the 18px margin beside the icon; in the list, 6px after the name. Both dim. */
  .emblem { opacity: .55; }
  .emblems { position: absolute; top: 6px; left: calc(50% + var(--icon) / 2 + 2px); display: flex; flex-direction: column; gap: 6px; opacity: .55; }
  .emblems .emblem { opacity: 1; }
  .hidden-file { opacity: .55; }
  .icon { display: grid; place-items: center; width: var(--icon); height: var(--icon); filter: drop-shadow(0 1px 1px rgb(0 0 0 / .3)); }
  .icon img { display: block; }
  .icon:has(.cut-mark) { filter: none; }
  .cut-mark { position: relative; display: grid; place-items: center; width: var(--icon); height: var(--icon); }
  .cut-mark svg { position: absolute; inset: 0; }
  .scissors { width: calc(var(--icon) * .6); height: calc(var(--icon) * .6); min-width: 16px; min-height: 16px; opacity: .55; --mask-size: 100%; mask-size: 100%; }
  /* .view .thumbnail */
  .thumbnail { max-width: 100%; max-height: 100%; border-radius: 2px; box-shadow: 0 1px 1px 1px rgb(0 0 0 / .18), 0 0 0 1px var(--adw-shade), 0 2px 0 0 var(--adw-shade); }
  .icon:has(.thumbnail) { filter: none; }
  .label { width: 100%; text-align: center; overflow-wrap: anywhere; white-space: pre-line; }
</style>
