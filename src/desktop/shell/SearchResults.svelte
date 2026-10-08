<script lang="ts">
  import { TEST_MODE, appById, availableApps, type AppId } from '../apps/registry';
  import { fs } from '../fs/fs.svelte';
  import { icon } from '../icons';
  import { launch } from '../wm/wm.svelte';
  import { iconFor } from './file-icons';
  import { hideOverview, overview } from './overview.svelte';
  import { MAX_ROWS, fileHits, searchApps, searchPanels } from './search';

  // Search providers belong to apps: file results need Files, settings panels need Settings.
  const filesOn = appById('files').built || TEST_MODE;
  const settingsOn = appById('settings').built || TEST_MODE;
  const apps = $derived(searchApps(availableApps(), overview.query));
  const files = $derived(filesOn ? fileHits(fs().search(overview.query, MAX_ROWS)) : []);
  const panels = $derived(settingsOn ? searchPanels(overview.query) : []);
  const empty = $derived(!apps.length && !files.length && !panels.length);

  function run(id: AppId) {
    launch(id);
    hideOverview();
  }

  /** Enter in the search entry opens the first result. */
  export function activateFirst(): void {
    if (apps[0]) run(apps[0].id);
    else if (files[0] || panels[0]) hideOverview();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="search-results" role="presentation" onclick={(e) => e.target === e.currentTarget && hideOverview()}>
  {#if empty}
    <p class="search-statustext">No results</p>
  {:else}
    {#if apps.length}
      <div class="grid-results" role="list" aria-label="Apps">
        {#each apps as app, i (app.id)}
          <button class="overview-tile" class:first={i === 0} onclick={() => run(app.id)}>
            <img src={icon(app.icon)} alt="" width="64" height="64" draggable="false" />
            <span class="tile-label">{app.name}</span>
          </button>
        {/each}
      </div>
    {/if}
    {#if files.length}
      <section class="search-section-content" aria-label="Files">
        <div class="provider"><img src={icon('folder')} alt="" width="48" height="48" /><span>Files</span></div>
        <ul>
          {#each files as f, i (f.path)}
            <li class="list-search-result" class:first={!apps.length && i === 0}>
              <img src={icon(iconFor(f.path, fs().stat(f.path)!))} alt="" width="32" height="32" />
              <span class="title">{f.name}</span><span class="description">{f.parent}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
    {#if panels.length}
      <section class="search-section-content" aria-label="Settings">
        <div class="provider"><img src={icon('application-x-executable')} alt="" width="48" height="48" /><span>Settings</span></div>
        <ul>
          {#each panels as p (p.id)}
            <li class="list-search-result"><span class="title">{p.name}</span></li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}
</div>

<style>
  /* search.js layout with the compiled Yaru values: sections 18px apart, section boxes #373737 radius 24px. */
  .search-results { position: absolute; inset: 76px 0 0 0; display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 0 48px; overflow: auto; color: #f2f2f2; }
  .search-statustext { margin-top: 18vh; font-size: 1.818em; font-weight: 550; color: rgb(242 242 242 / .8); }
  .grid-results { display: flex; gap: 30px; flex-wrap: wrap; justify-content: center; }
  .overview-tile { display: grid; justify-items: center; gap: 6px; width: 120px; padding: 12px; border-radius: 24px; }
  .overview-tile:hover { background: #343434; }
  .overview-tile:active { background: #393939; }
  .overview-tile.first, .list-search-result.first, .overview-tile:focus-visible { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 80%, transparent); }
  .tile-label { max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .search-section-content { display: flex; gap: 12px; width: min(100%, 840px); margin: 0 12px; padding: 12px; border-radius: 24px; background: #373737; }
  .provider { display: grid; justify-items: center; align-content: start; gap: 6px; width: 120px; padding: 6px; border-radius: 13.2px; }
  ul { list-style: none; flex: 1; display: grid; gap: 6px; }
  .list-search-result { display: flex; align-items: center; gap: 12px; padding: 6px; border-radius: 13.2px; }
  .list-search-result:hover { background: #494949; }
  .description { color: #a5a5a5; }
</style>
