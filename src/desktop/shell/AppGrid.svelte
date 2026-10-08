<script lang="ts">
  import { appById, availableApps, type AppId } from '../apps/registry';
  import { icon } from '../icons';
  import { safeStorage } from '../system/settings';
  import { currentStyle } from '../system/settings.svelte';
  import { switchWorkspace, workspaceCount } from '../wm/windows';
  import { launch, wm } from '../wm/wm.svelte';
  import { gridShape, loadOrder, moveTile, pages, saveOrder, tiles, type GridTile } from './app-grid';
  import { hideOverview, overview, showOverview } from './overview.svelte';
  import type { Env } from '../env';

  let { env }: { env: Env } = $props();
  const store = safeStorage();
  let order = $state(loadOrder(store));
  let page = $state(0);
  let dragging: string | null = null;
  let lastWheel = 0;

  const shape = $derived(gridShape(wm.area.w));
  const all = $derived(tiles(availableApps(), order));
  const paged = $derived(pages(all, shape.cols * shape.rows));
  // Measured on real 26.04 at 1920 wide: 143×148px cells; narrower screens shrink the cells.
  const cellW = $derived(Math.min(143, Math.floor((wm.area.w - 96) / shape.cols)));
  const cellH = $derived(Math.round((cellW * 148) / 143));
  const count = $derived(workspaceCount(wm));
  const prevW = $derived(Math.round(wm.area.w * 0.15));
  const prevH = $derived(Math.round(wm.area.h * 0.15));
  const wallpaper = $derived(currentStyle() === 'dark' ? env.wallpaperDark : env.wallpaperLight);
  const folder = $derived(all.find((t): t is Extract<GridTile, { kind: 'folder' }> => t.kind === 'folder' && t.id === overview.folder));

  function open(t: GridTile) {
    if (t.kind === 'folder') {
      overview.folder = t.id;
      return;
    }
    run(t.id);
  }

  function run(id: AppId) {
    launch(id);
    hideOverview();
  }

  function drop(target: string) {
    if (!dragging || dragging === target) return;
    const ids = all.map((t) => t.id);
    order = moveTile(ids, dragging, ids.indexOf(target));
    saveOrder(store, order);
    dragging = null;
  }

  function onwheel(e: WheelEvent) {
    const now = performance.now();
    if (now - lastWheel < 400 || e.deltaY === 0) return;
    lastWheel = now;
    page = Math.min(paged.length - 1, Math.max(0, page + (e.deltaY > 0 ? 1 : -1)));
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="app-grid" role="presentation" onclick={(e) => e.target === e.currentTarget && hideOverview()}>
  <div class="ws-previews">
    {#each { length: count } as _, i (i)}
      <button
        class="ws-preview"
        class:current={i === wm.workspace}
        aria-label="Workspace {i + 1}"
        style="width: {prevW}px; height: {prevH}px; background-image: url({wallpaper})"
        onclick={() => {
          switchWorkspace(wm, i);
          showOverview('windows');
        }}
      ></button>
    {/each}
  </div>
  <div class="viewport" style:width="{shape.cols * cellW}px" {onwheel}>
    <div class="pages" style:translate="{-page * 100}% 0">
      {#each paged as list, p (p)}
        <div class="page" style="grid-template-columns: repeat({shape.cols}, {cellW}px); grid-auto-rows: {cellH}px">
          {#each list as t (t.id)}
            <button
              class="overview-tile"
              class:folder={t.kind === 'folder'}
              data-tile={t.id}
              draggable="true"
              ondragstart={() => (dragging = t.id)}
              ondragend={() => (dragging = null)}
              ondragover={(e) => e.preventDefault()}
              ondrop={(e) => {
                e.preventDefault();
                drop(t.id);
              }}
              onclick={() => open(t)}
            >
              {#if t.kind === 'app'}
                <img src={icon(appById(t.id).icon)} alt="" width={shape.icon} height={shape.icon} draggable="false" />
              {:else}
                <span class="folder-icon" style="width: {shape.icon}px; height: {shape.icon}px">
                  {#each t.apps.slice(0, 4) as a (a)}<img src={icon(appById(a).icon)} alt="" draggable="false" />{/each}
                </span>
              {/if}
              <span class="tile-label">{t.kind === 'app' ? appById(t.id).name : t.id}</span>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </div>
  {#if paged.length > 1}
    <div class="page-indicator">
      {#each paged as _, p (p)}
        <button class="dot" class:active={p === page} aria-label="Page {p + 1}" onclick={() => (page = p)}></button>
      {/each}
    </div>
  {/if}
</div>

{#if folder}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="folder-backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && (overview.folder = null)}>
    <div class="app-folder-dialog" role="dialog" aria-label={folder.id}>
      <h2 class="folder-name">{folder.id}</h2>
      <div class="folder-grid">
        {#each folder.apps as a (a)}
          <button class="overview-tile" onclick={() => run(a)}>
            <img src={icon(appById(a).icon)} alt="" width="64" height="64" draggable="false" />
            <span class="tile-label">{appById(a).name}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .app-grid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; padding-top: 75px; gap: 72px; color: #f2f2f2; }
  .ws-previews { display: flex; gap: 33px; }
  .ws-preview { border-radius: 16px; background: center / cover; box-shadow: 0 4px 16px 4px rgb(0 0 0 / .05); }
  .ws-preview.current { box-shadow: 0 0 0 3px var(--accent); }
  .viewport { overflow: hidden; }
  .pages { display: flex; transition: translate 400ms var(--ease); }
  .page { flex: none; width: 100%; display: grid; justify-content: center; }
  .overview-tile { display: grid; justify-items: center; align-content: start; gap: 6px; padding: 12px; border-radius: 24px; min-width: 0; }
  .overview-tile:hover { background: #343434; }
  .overview-tile:active { background: #393939; }
  .overview-tile:focus-visible { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 80%, transparent); }
  .tile-label { max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .folder-icon { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 6px; border-radius: 16px; background: #3b3b3b; }
  :global(:root[data-style='dark']) .folder-icon { background: #353535; }
  .folder:hover .folder-icon { background: #454545; }
  .folder-icon img { width: 100%; height: 100%; }
  .page-indicator { display: flex; padding: 6px 12px 0; }
  .dot { width: 22px; height: 22px; display: grid; place-items: center; }
  .dot::after { content: ''; width: 10px; height: 10px; border-radius: 999px; background: #f2f2f2; opacity: .5; scale: .667; transition: opacity 200ms, scale 200ms; }
  .dot.active::after, .dot:hover::after { opacity: 1; }
  .dot.active::after { scale: 1; }
  /* .app-folder-dialog: 720px square, radius 64px, #373737; title 1.818em weight 800. */
  .folder-backdrop { position: absolute; inset: 0; display: grid; place-items: center; z-index: 2; }
  .app-folder-dialog {
    width: min(720px, calc(100% - 96px)); aspect-ratio: 1; max-height: calc(100% - 48px); padding: 0 1px;
    border-radius: 64px; background: #373737; box-shadow: inset 0 0 0 1px rgb(242 242 242 / .1);
    display: grid; grid-template-rows: auto 1fr; animation: folder-in 200ms var(--ease) both;
  }
  .folder-name { padding: 24px 36px 0; text-align: center; font-size: 1.818em; font-weight: 800; }
  .folder-grid { display: grid; grid-template-columns: repeat(3, 1fr); align-content: center; justify-items: center; }
  @keyframes folder-in { from { opacity: 0; scale: .9; } }
</style>
