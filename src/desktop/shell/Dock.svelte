<script lang="ts">
  import type PopupMenuView from './PopupMenu.svelte';
  import { loadPopupMenu } from './surfaces';
  import { appById, isAvailable, type AppId } from '../apps/registry';
  import { icon } from '../icons';
  import { safeStorage } from '../system/settings';
  import { appWindows, runningApps, switchWorkspace } from '../wm/windows';
  import { close, dockIcons, focus, launch, wm } from '../wm/wm.svelte';
  import { clickAction, dockItems, dockMenu, loadPins, pinApp, savePins, unpinApp } from './dock';
  import { hideOverview, overview, showAppsClicked, spread } from './overview.svelte';
  // The menu loads on first use (prefetched when the browser is idle after login).
  let PopupMenu = $state.raw<typeof PopupMenuView | null>(null);

  const store = safeStorage();
  let pins = $state(loadPins(store));
  let nav = $state<HTMLElement>();
  let menu = $state<{ app: AppId; anchor: DOMRect } | null>(null);
  let tip = $state<{ text: string; y: number } | null>(null);
  let tipTimer: ReturnType<typeof setTimeout> | undefined;
  let lastScroll = 0;

  const focusedApp = $derived(wm.wins.find((w) => w.id === wm.focused)?.app ?? null);
  const items = $derived(
    dockItems({
      pins,
      running: runningApps(wm),
      focusedApp,
      windows: (a) => appWindows(wm, a).length,
      available: (a) => isAvailable(appById(a)),
      trash: { show: appById('files').built, full: false },
    }),
  );

  // Minimise targets: each app tile's place on screen.
  $effect(() => {
    void items;
    const update = () => {
      for (const el of nav?.querySelectorAll<HTMLElement>('.tile[data-app]') ?? []) {
        dockIcons.set(el.dataset.app as AppId, el.querySelector('.icon-box')!.getBoundingClientRect());
      }
    };
    update();
    addEventListener('resize', update);
    return () => removeEventListener('resize', update);
  });

  function activate(app: AppId) {
    if (overview.spread === app) {
      hideOverview();
      return;
    }
    const wins = appWindows(wm, app);
    const action = clickAction(wins.length, focusedApp === app && overview.mode === 'hidden');
    if (action === 'launch') launch(app);
    else if (action === 'spread') spread(app);
    else {
      focus(wins[0].id);
      hideOverview();
    }
  }

  function onMenu(app: AppId, id: string) {
    if (id.startsWith('win:')) {
      focus(id.slice(4));
      hideOverview();
    } else if (id === 'new-window') launch(app);
    else if (id === 'pin' || id === 'unpin') {
      pins = id === 'pin' ? pinApp(pins, app) : unpinApp(pins, app);
      savePins(store, pins);
    } else if (id === 'quit') for (const w of appWindows(wm, app)) close(w.id);
  }

  function hover(app: AppId, el: HTMLElement) {
    clearTimeout(tipTimer);
    appById(app).load?.(); // prefetch the app's code
    const r = el.getBoundingClientRect();
    tipTimer = setTimeout(() => (tip = { text: appById(app).name, y: r.top + r.height / 2 }), 300);
  }
  function leave() {
    clearTimeout(tipTimer);
    tip = null;
  }

  function onwheel(e: WheelEvent) {
    const now = performance.now();
    if (now - lastScroll < 150 || e.deltaY === 0) return;
    lastScroll = now;
    switchWorkspace(wm, wm.workspace + (e.deltaY > 0 ? 1 : -1));
  }
  $effect(() => {
    if (menu && !PopupMenu) loadPopupMenu().then((m) => (PopupMenu = m.default));
  });
</script>

<nav class="dock" aria-label="Dock" bind:this={nav} {onwheel}>
  <div class="apps" role="toolbar" aria-orientation="vertical">
    {#each items as item, i (item.kind === 'app' ? item.app : `${item.kind}${i}`)}
      {#if item.kind === 'app'}
        {@const entry = appById(item.app)}
        <button
          class="tile"
          class:focused={item.focused}
          class:running={item.windows > 0}
          data-app={item.app}
          aria-label={entry.name}
          onclick={(e) => (e.shiftKey ? launch(item.app) : activate(item.app))}
          onauxclick={(e) => e.button === 1 && launch(item.app)}
          oncontextmenu={(e) => {
            e.preventDefault();
            leave();
            menu = { app: item.app, anchor: (e.currentTarget as HTMLElement).getBoundingClientRect() };
          }}
          onpointerenter={(e) => hover(item.app, e.currentTarget as HTMLElement)}
          onpointerleave={leave}
        >
          <span class="icon-box"><img src={icon(entry.icon)} alt="" width="48" height="48" draggable="false" /></span>
          {#if item.windows > 0}
            <span class="dots" aria-hidden="true">{#each { length: Math.min(item.windows, 4) } as _, d (d)}<i></i>{/each}</span>
          {/if}
        </button>
      {:else if item.kind === 'separator'}
        <div class="separator" role="separator"></div>
      {:else}
        <button class="tile" aria-label="Trash">
          <span class="icon-box"><img src={icon(item.full ? 'user-trash-full' : 'user-trash')} alt="" width="48" height="48" /></span>
        </button>
      {/if}
    {/each}
  </div>
  <button class="tile show-apps" class:checked={overview.mode === 'apps'} aria-label="Show Apps" aria-pressed={overview.mode === 'apps'} onclick={showAppsClicked}>
    <span class="icon-box"><span class="sym" style:--icon={`url(${icon('view-app-grid-ubuntu-symbolic')})`}></span></span>
  </button>
</nav>

{#if tip}<div class="dash-label" style:top="{tip.y}px">{tip.text}</div>{/if}
{#if menu && PopupMenu}
  {@const m = menu}
  <PopupMenu
    items={dockMenu(appById(m.app).name, pins.includes(m.app), appWindows(wm, m.app).map((w) => ({ id: w.id, title: w.title })))}
    anchor={m.anchor}
    side="right"
    app
    label={appById(m.app).name}
    onactivate={(id) => onMenu(m.app, id)}
    onclose={() => (menu = null)}
  />
{/if}

<style>
  /* #dashtodockContainer.left.extended.shrink.fixed in the compiled Yaru shell CSS; 66px wide on real 26.04. */
  .dock { position: fixed; left: 0; top: 32px; bottom: 0; width: 66px; z-index: 40; display: flex; flex-direction: column; padding: 3px 0; background: var(--dock-bg); }
  .apps { display: flex; flex-direction: column; gap: 4px; }
  .tile { position: relative; display: block; padding: 1px 3px; }
  .icon-box { display: grid; place-items: center; width: 60px; height: 60px; padding: 6px; border-radius: 16px; transition: background-color 100ms; }
  .icon-box img { width: 48px; height: 48px; }
  .tile:hover .icon-box, .tile.focused .icon-box, .show-apps.checked .icon-box { background: var(--dock-hover); }
  .tile:focus-visible .icon-box { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 80%, transparent); }
  /* Running dots (ubuntu-dock DOTS): one per window up to 4, on the side facing the screen edge. */
  .dots { position: absolute; left: 3px; top: 50%; translate: 0 -50%; display: grid; gap: 2.7px; }
  .dots i { width: 5.45px; height: 5.45px; border-radius: 50%; background: #f2f2f2; }
  .separator { height: 1px; margin: 1px 3px; background: rgb(242 242 242 / .1); }
  .show-apps { margin-top: auto; padding-bottom: 3px; color: #f2f2f2; }
  .show-apps .sym { width: 48px; height: 48px; }
  /* .dash-label: dark pill 8px from the dock. */
  .dash-label {
    position: fixed; left: 74px; z-index: 60; translate: 0 -50%; padding: 6px 12px; border-radius: 999px;
    background: var(--tooltip-bg); border: 1px solid var(--tooltip-border); color: #fff; white-space: nowrap;
    animation: label-in 150ms var(--ease) both; pointer-events: none;
  }
  @keyframes label-in { from { opacity: 0; } }
</style>
