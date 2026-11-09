<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fs, fsState } from '../../fs/fs.svelte';
  import { freeSpace } from '../../fs/disk';
  import { dirname } from '../../fs/vfs';
  import { iconFor } from '../../shell/file-icons';
  import { uses24h } from '../../system/clock';
  import { settings } from '../../system/settings.svelte';
  import { launch } from '../../wm/wm.svelte';
  import back from '../adw/assets/go-previous-symbolic.svg?url';
  import '../adw/adw.css';
  import { stackLayout } from './drop';
  import { fileIcon, sym } from './icons';
  import { setStarred } from './operations';
  import { describeItems, type Subject } from './properties';
  import { canHoldStars, prefs, starredList } from './session.svelte';

  // NautilusPropertiesWidget, the same in the dialog over a Files window and in a window of its own. Its
  // AdwNavigationView has the main page and Set Custom Permissions; Esc or Alt+Left goes back, Esc on the main page is
  // the container's. What it says comes from properties.ts, read again whenever the files change. `bar` draws the
  // header around the page's own start and title.
  let { paths, recent, bar, active, onescape, onempty }: {
    paths: string[];
    /** Opened from Recent. */
    recent: boolean;
    bar: Snippet<[Snippet, Snippet, 'main' | 'permissions']>;
    /** Whether keys are for it now (the dialog may have another layer over it). */
    active: () => boolean;
    onescape: () => void;
    /** Every file it was about is gone. */
    onempty: () => void;
  } = $props();

  const items = $derived.by((): Subject[] => {
    void fsState.version;
    return paths.flatMap((path) => {
      const node = fs().stat(path);
      return node ? [{ path, node }] : [];
    });
  });
  const free = $derived.by(() => {
    void fsState.version;
    return freeSpace(fs().stat('/')!);
  });
  const clock24 = $derived(settings.clock24 ?? uses24h());
  const opened = (path: string) => prefs.recents.find((r) => r.path === path)?.at;
  const facts = $derived(items.length ? describeItems(items, { recent, clock24, free, starrable: canHoldStars, opened }) : null);
  // remove_from_dialog: when the last of its files goes, so does it.
  $effect(() => {
    if (!facts) onempty();
  });

  let page = $state<'main' | 'permissions'>('main');
  let root = $state<HTMLElement>();
  let announced = $state('');

  function go(to: typeof page) {
    page = to;
    queueMicrotask(() => root?.parentElement?.querySelector<HTMLElement>(to === 'main' ? '.permissions-row' : '.back')?.focus());
  }

  function onkeydown(e: KeyboardEvent) {
    if (!active()) return;
    const backKey = e.key === 'Escape' || (e.altKey && e.key === 'ArrowLeft');
    if (!backKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (page !== 'main') go('main');
    else if (e.key === 'Escape') onescape();
  }
  $effect(() => {
    const host = root?.parentElement;
    host?.addEventListener('keydown', onkeydown);
    return () => host?.removeEventListener('keydown', onkeydown);
  });

  // star_clicked: no Undo here, only what a screen reader hears.
  const starred = $derived(items.length === 1 && prefs.starred.includes(items[0].path));
  function star() {
    const on = !starred;
    setStarred(starredList, [items[0].path], on);
    announced = on ? 'starred' : 'unstarred';
  }
  /** open_parent_folder: a new window there, with the item selected. */
  const openParent = () => void launch('files', { path: dirname(items[0].path), select: [items[0].path] });

  // update_properties_widget_icon: 96px; several items show up to five different icons in a pile.
  const SIZE = 96;
  const SHADOW = 10; // STACK_SHADOW_RADIUS
  const thumbnail = (s: Subject) => (s.node.mime?.startsWith('image/') && s.node.url ? s.node.url : null);
  const pictures = $derived([...new Set(items.map((s) => thumbnail(s) ?? fileIcon(iconFor(s.path, s.node), SIZE)))].slice(0, 5));
  const pile = $derived(stackLayout(pictures.length));
  // The pile's box holds every icon with its shadow; GTK measures the drawing, this adds up the same parts.
  const pileSize = $derived(Math.max(...pile.map((p) => Math.max(p.x, p.y))) + SIZE + SHADOW);
</script>

{#snippet start()}
  {#if page === 'main'}
    {#if facts?.star}
      <button class="adw-button flat image star" class:starred aria-label={starred ? 'Unstar' : 'Star'} title={starred ? 'Unstar' : 'Star'} onclick={star}>
        <span class="sym" style:--icon={`url(${sym(starred ? 'starred-symbolic' : 'non-starred-symbolic')})`}></span>
      </button>
    {/if}
  {:else}
    <button class="adw-button flat image back" aria-label="Back" title="Back" onclick={() => go('main')}><span class="sym" style:--icon={`url(${back})`}></span></button>
  {/if}
{/snippet}
{#snippet title()}
  {#if page !== 'main'}<span class="hb-title">Set Custom Permissions</span>{/if}
{/snippet}

{#if facts}
  {@render bar(start, title, page)}
  <div bind:this={root} class="scroll">
    {#if page === 'main'}
      <div class="page">
        <div class="top">
          <div class="picture">
            {#if items.length === 1}
              {#if thumbnail(items[0])}
                <img class="thumbnail" src={thumbnail(items[0])} alt="" />
              {:else}
                <img class="icon" src={pictures[0]} alt="" width={SIZE} height={SIZE} />
              {/if}
              {#if facts.customIcon}
                <span class="cutout">
                  <button class="adw-button circular pencil" aria-label="Set Custom Icon" title="Set Custom Icon" disabled>
                    <span class="sym" style:--icon={`url(${sym('document-edit-symbolic')})`}></span>
                  </button>
                </span>
              {/if}
            {:else}
              <span class="pile" style:width="{pileSize}px" style:height="{pileSize}px">
                {#each pictures.toReversed() as src, i (src)}
                  {@const at = pile[pictures.length - 1 - i]}
                  <img class="icon" {src} alt="" width={SIZE} height={SIZE} style:left="{at.x}px" style:top="{at.y}px" />
                {/each}
              </span>
            {/if}
          </div>
          <div class="labels">
            <h2 class="title-3 name">{facts.title}</h2>
            {#if facts.type}<p>{facts.type}</p>{/if}
            {#if facts.size}<p class="caption" title={facts.size.tip}>{facts.size.text}</p>{/if}
            {#if facts.contents}<p class="contents" title={facts.contents.tip}>{facts.contents.text}</p>{/if}
            {#if facts.free}<p class="caption">{facts.free}</p>{/if}
          </div>
        </div>

        {#if facts.volume}
          <div class="adw-boxed-list">
            <div class="adw-row disk">
              <span class="level" role="meter" aria-label="Disk usage" aria-valuemin="0" aria-valuemax="1" aria-valuenow={facts.volume.fraction}>
                <span class="filled" style:width="{facts.volume.fraction * 100}%"></span>
              </span>
              <span class="legend">
                <span class="dim">{facts.volume.total} total</span>
                <span><span class="dot used" aria-hidden="true">●</span> <span class="caption-style dim">{facts.volume.used} used</span></span>
                <span><span class="dot free" aria-hidden="true">●</span> <span class="caption-style dim">{facts.volume.free} free</span></span>
              </span>
            </div>
            <button class="adw-row button-row" disabled><span class="titles">Open in Disks</span><span class="sym" style:--icon={`url(${sym('external-link-symbolic')})`}></span></button>
          </div>
        {/if}

        {#if facts.parent}
          <div class="adw-boxed-list">
            <!-- An activatable row with its own button: two buttons side by side, as the row is not a button inside a button. -->
            <div class="adw-row activatable parent-row">
              <button class="row-main" onclick={openParent}>
                <span class="titles"><span>Parent Folder</span><span class="subtitle">{facts.parent}</span></span>
              </button>
              <button class="adw-button flat image" aria-label="Open Parent Folder" title="Open Parent Folder" onclick={openParent}>
                <span class="sym" style:--icon={`url(${sym('folder-open-symbolic')})`}></span>
              </button>
            </div>
          </div>
        {/if}

        {#if facts.trash}
          <div class="adw-boxed-list">
            <div class="adw-row"><span class="titles"><span>Original Folder</span><span class="subtitle">{facts.trash.original}</span></span></div>
            <div class="adw-row"><span class="titles"><span>Trashed On</span><span class="subtitle">{facts.trash.on}</span></span></div>
          </div>
        {/if}

        {#if facts.modified}
          <div class="adw-boxed-list">
            {#if facts.accessed}<div class="adw-row"><span class="titles"><span>Accessed</span><span class="subtitle">{facts.accessed}</span></span></div>{/if}
            <div class="adw-row"><span class="titles"><span>Modified</span><span class="subtitle">{facts.modified}</span></span></div>
            <div class="adw-row"><span class="titles"><span>Created</span><span class="subtitle">{facts.created}</span></span></div>
          </div>
        {/if}

        {#if facts.permissions || facts.executable !== null}
          <div class="adw-boxed-list">
            {#if facts.permissions}
              <button class="adw-row activatable permissions-row" onclick={() => go('permissions')}>
                <span class="titles">Permissions</span>
                {#if facts.permissions.summary}<span class="value">{facts.permissions.summary}</span>{/if}
                <span class="sym" style:--icon={`url(${sym('go-next-symbolic')})`}></span>
              </button>
            {/if}
            {#if facts.executable !== null}
              <div class="adw-row" aria-disabled="true">
                <span class="titles">Executable as Program</span>
                <span class="switch" class:checked={facts.executable} role="switch" aria-checked={facts.executable} aria-label="Executable as Program" aria-disabled="true"><span class="slider"></span></span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else if facts.permissions}
      {#if facts.permissions.banner}<div class="banner">Only the owner can edit these permissions</div>{/if}
      <div class="page">
        {#each facts.permissions.rows as row (row.group)}
          <div class="adw-group">
            {#if row.group === 'others'}<h3 class="heading">Other Users</h3>{/if}
            <div class="adw-boxed-list">
              {#if row.name !== null}
                <button class="adw-row combo" disabled>
                  <span class="titles">{row.group === 'owner' ? 'Owner' : 'Group'}</span>
                  <span class="value">{row.name}</span>
                  <span class="sym" style:--icon={`url(${sym('pan-down-symbolic')})`}></span>
                </button>
              {/if}
              {#each row.access as access (access.title)}
                <button class="adw-row combo" disabled>
                  <span class="titles">{access.title}</span>
                  <span class="value">{access.value}</span>
                  <span class="sym" style:--icon={`url(${sym('pan-down-symbolic')})`}></span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
        <div class="adw-boxed-list">
          <div class="adw-row"><span class="titles"><span>Security Context</span><span class="subtitle">Unknown</span></span></div>
        </div>
        {#if items.some((s) => s.node.kind === 'dir')}
          <div class="adw-boxed-list">
            <button class="adw-row button-row" disabled><span class="titles">Change Permissions for Enclosed Files…</span></button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  <span class="announce" aria-live="polite">{announced}</span>
{/if}

<style>
  /* preferencespage, nautilus-properties */
  .scroll { flex: 1; min-height: 0; overflow: auto; }
  .page { display: flex; flex-direction: column; gap: 24px; margin: 24px 12px; }
  /* the star sits at the top (valign: start) and shows in the accent colour when on, as in the file view */
  .star { align-self: start; opacity: .55; }
  .star:hover, .star.starred { opacity: 1; }
  .star.starred .sym { background-color: var(--adw-accent); }
  .hb-title { font-weight: bold; }

  .top { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
  .picture { position: relative; display: grid; place-items: center; }
  .icon { filter: drop-shadow(0 1px 12px rgb(0 0 6 / 5%)) drop-shadow(0 1px rgb(0 0 6 / 30%)); }
  /* .nautilus-properties .thumbnail */
  .thumbnail {
    max-width: 96px; max-height: 96px; border-radius: 2px;
    box-shadow: 0 1px 1px 1px rgb(0 0 0 / .18), 0 0 0 1px var(--adw-shade), 0 2px 0 0 var(--adw-shade);
  }
  .pile { position: relative; display: block; filter: drop-shadow(0 2px 10px rgb(0 0 0 / 15%)); }
  .pile .icon { position: absolute; filter: drop-shadow(0 1px 1px rgb(0 0 0 / 30%)); }
  /* .cutout.background holds the circular button, cut out of the icon's corner */
  .cutout { position: absolute; right: -6px; bottom: -6px; padding: 3px; border-radius: 50%; background: var(--properties-bg); }
  .pencil { min-width: 34px; min-height: 34px; }
  .labels { display: flex; flex-direction: column; gap: 6px; max-width: 100%; }
  .labels p, .name { margin: 0; user-select: text; overflow-wrap: anywhere; }
  .title-3 { font-size: 136%; font-weight: 700; }
  /* lines: 3, max-width-chars: 24 */
  .name { max-width: 24em; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .caption { font-size: 82%; line-height: 140%; }
  .contents { white-space: pre-line; }

  .adw-row .subtitle { opacity: .55; user-select: text; }
  .value { opacity: .55; margin-right: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* the Permissions summary is a dim-label; a combo row's value is not */
  .combo .value { opacity: 1; }
  .button-row { justify-content: center; font-weight: bold; }
  .button-row .titles { flex: none; }
  .row-main { flex: 1; min-width: 0; display: flex; align-self: stretch; align-items: center; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; }
  .row-main .titles { flex: 1; display: flex; flex-direction: column; gap: 3px; margin: 6px 0; min-width: 0; }

  /* levelbar: 8px, round, accent where filled, a trough of 15% where not; the dots are .disk-space-used / -free */
  .disk { flex-direction: column; align-items: stretch; gap: 12px; padding: 18px 12px 12px; }
  .level { display: block; height: 8px; border-radius: 99px; background: color-mix(in srgb, currentColor 15%, transparent); overflow: hidden; }
  .filled { display: block; height: 100%; border-radius: 99px; background: var(--accent); }
  .legend { display: flex; justify-content: center; gap: 12px; }
  .dim { opacity: .55; }
  .caption-style { font-size: 82%; }
  .dot.used { color: var(--accent); }
  .dot.free { color: color-mix(in srgb, currentColor 15%, transparent); }

  /* switch: 14px radius, 3px padding, a 20px slider; insensitive here */
  .switch { flex: none; display: flex; width: 46px; padding: 3px; border-radius: 14px; background: color-mix(in srgb, currentColor 15%, transparent); }
  .switch.checked { justify-content: flex-end; background: var(--accent); }
  .slider { width: 20px; height: 20px; border-radius: 50%; background: color-mix(in srgb, white 80%, var(--adw-card-bg)); box-shadow: 0 2px 4px rgb(0 0 6 / 20%); }

  /* banner: #7d7d83 at 30% over the window, 6px */
  .banner { padding: 6px; min-height: 34px; display: grid; place-items: center; background: color-mix(in srgb, #7d7d83 30%, var(--properties-bg)); }
  .announce { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
