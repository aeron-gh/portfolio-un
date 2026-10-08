<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Slider from './Slider.svelte';
  import { icon } from '../icons';
  import { systemAction, type SystemAction } from '../system/actions';
  import { batteryIcon, batteryLabel } from '../system/battery';
  import { devices } from '../system/devices.svelte';
  import { openLayer, type Layer } from '../system/layers.svelte';
  import { dispatch } from '../system/session.svelte';
  import type { PowerMode } from '../system/settings';
  import { currentStyle, settings, updateSettings } from '../system/settings.svelte';
  import { closePanel } from './panel.svelte';
  import { PROFILES, powerModeClick, profileOf, setRadio, volumeIcon, wifiIcon, type Radios } from './quick-settings';
  let layer: Layer | undefined;

  type MenuId = 'power' | 'wifi' | 'bluetooth' | 'power-mode';
  type Row =
    | { kind: 'item'; id: string; label: string; icon?: string; ornament?: 'check' | 'none'; secure?: boolean; selected?: boolean; run?: () => void }
    | { kind: 'separator' };
  type Menu = { icon: string; title: string; active: boolean; rows: Row[]; placeholder?: string };
  type Tile = { id: string; title: string; subtitle?: string | null; icon: string; checked: boolean; toggle: () => void; menu?: MenuId; menuLabel?: string };

  let box = $state<HTMLElement>();
  let menuEl = $state<HTMLElement>();
  let open = $state<{ id: MenuId; top: number; from: HTMLElement } | null>(null);
  let closing = $state(false);
  let gridMin = $state(0);
  const opener = document.activeElement as HTMLElement | null;
  const dark = $derived(currentStyle() === 'dark');
  const radios = $derived<Radios>({ wifi: settings.wifi, bluetooth: settings.bluetooth, airplane: settings.airplane });

  const radio = (which: keyof Radios, on: boolean) => updateSettings(setRadio(radios, which, on));
  function setPowerMode(mode: PowerMode) {
    updateSettings(mode === 'balanced' ? { powerMode: mode } : { powerMode: mode, lastPowerMode: mode });
  }
  function setVolume(v: number) {
    const volume = Math.round(v * 100);
    updateSettings(volume < 1 ? { volume: 0, muted: true } : { volume, muted: false });
  }
  function toggleMute() {
    // volume.js: unmuting at 0 brings the volume back to 25%.
    if (settings.muted && settings.volume === 0) updateSettings({ volume: 25, muted: false });
    else updateSettings({ muted: !settings.muted });
  }
  function act(action: SystemAction) {
    closePanel();
    systemAction(action);
  }

  const tiles: Tile[] = $derived([
    {
      id: 'wifi', title: 'Wi–Fi', subtitle: settings.wifi ? 'Home' : null, icon: wifiIcon(settings.wifi, devices.online),
      checked: settings.wifi, toggle: () => radio('wifi', !settings.wifi), menu: 'wifi', menuLabel: 'Open Wi–Fi menu',
    },
    {
      id: 'bluetooth', title: 'Bluetooth', icon: settings.bluetooth ? 'bluetooth-active-symbolic' : 'bluetooth-disabled-symbolic',
      checked: settings.bluetooth, toggle: () => radio('bluetooth', !settings.bluetooth), menu: 'bluetooth', menuLabel: 'Open Bluetooth menu',
    },
    {
      id: 'power-mode', title: 'Power Mode', subtitle: profileOf(settings.powerMode).name, icon: profileOf(settings.powerMode).icon,
      checked: settings.powerMode !== 'balanced', toggle: () => setPowerMode(powerModeClick(settings.powerMode, settings.lastPowerMode)),
      menu: 'power-mode', menuLabel: 'Open power profiles menu',
    },
    { id: 'night-light', title: 'Night Light', icon: 'night-light-symbolic', checked: settings.nightLight, toggle: () => updateSettings({ nightLight: !settings.nightLight }) },
    { id: 'dark-style', title: 'Dark Style', icon: 'dark-mode-symbolic', checked: dark, toggle: () => updateSettings({ style: dark ? 'light' : 'dark' }) },
    { id: 'dnd', title: 'Do Not Disturb', icon: 'notifications-disabled-symbolic', checked: settings.dnd, toggle: () => updateSettings({ dnd: !settings.dnd }) },
    { id: 'airplane', title: 'Airplane Mode', icon: 'airplane-mode-symbolic', checked: settings.airplane, toggle: () => radio('airplane', !settings.airplane) },
  ]);

  const menus: Record<MenuId, Menu> = $derived({
    power: {
      icon: 'system-shutdown-symbolic', title: 'Power Off', active: false,
      rows: [
        { kind: 'item', id: 'suspend', label: 'Suspend', run: () => act('suspend') },
        { kind: 'item', id: 'restart', label: 'Restart…', run: () => act('restart') },
        { kind: 'item', id: 'power-off', label: 'Power Off…', run: () => act('power-off') },
        { kind: 'separator' },
        { kind: 'item', id: 'log-out', label: 'Log Out…', run: () => act('log-out') },
      ],
    },
    wifi: {
      icon: 'network-wireless-symbolic', title: 'Wi–Fi', active: settings.wifi,
      rows: settings.wifi ? [{ kind: 'item', id: 'home', label: 'Home', icon: 'network-wireless-signal-excellent-symbolic', secure: true, selected: true }] : [],
    },
    bluetooth: {
      icon: 'bluetooth-active-symbolic', title: 'Bluetooth', active: settings.bluetooth, rows: [],
      placeholder: settings.bluetooth ? 'No available or connected devices' : 'Turn on Bluetooth to connect to devices',
    },
    'power-mode': {
      icon: 'power-profile-balanced-symbolic', title: 'Power Mode', active: settings.powerMode !== 'balanced',
      rows: PROFILES.map((p) => ({ kind: 'item' as const, id: p.id, label: p.name, icon: p.icon, ornament: p.id === settings.powerMode ? ('check' as const) : ('none' as const), run: () => setPowerMode(p.id) })),
    },
  });

  // A tile's menu opens right under its row, across the whole grid; the panel grows when the menu needs the room.
  function toggleMenu(id: MenuId, from: HTMLElement, byKey: boolean) {
    if (open?.id === id) return closeMenu();
    const row = from.closest<HTMLElement>('[data-row]')!;
    open = { id, top: row.offsetTop + row.offsetHeight, from };
    closing = false;
    if (byKey) tick().then(() => menuEl?.querySelector<HTMLElement>('.item')?.focus());
  }
  function closeMenu() {
    if (open) closing = true;
  }
  function closed() {
    if (!closing) return;
    const from = open?.from;
    open = null;
    closing = false;
    from?.focus();
  }
  $effect(() => {
    gridMin = open && menuEl ? open.top + 12 + menuEl.offsetHeight : 0;
  });

  onMount(() => {
    layer = openLayer();
    box!.focus();
    const away = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!box?.contains(t) && !t.closest?.('[data-panel-button="quick-settings"]')) closePanel();
    };
    // Added at once: the opening click is already over, and Chromium can run the next click before a timer.
    addEventListener('pointerdown', away, true);
    return () => {
      layer?.close();
      removeEventListener('pointerdown', away, true);
      if (opener?.isConnected) opener.focus();
    };
  });

  function onkey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (open) closeMenu();
      else closePanel();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && menuEl?.contains(document.activeElement)) {
      const items = [...menuEl.querySelectorAll<HTMLElement>('.item')];
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
    } else return;
    e.preventDefault();
    e.stopPropagation();
  }
</script>

<div class="quick-settings" bind:this={box} role="dialog" aria-label="System" tabindex="-1" onkeydown={onkey}>
  <div class="qs-panel" class:dim={open && !closing}>
    <div class="grid" style:min-height={gridMin ? `${gridMin}px` : null}>
      <div class="system" data-row>
        <div class="battery">
          <span class="sym" style:--icon={`url(${icon(batteryIcon(devices.battery))})`}></span>{batteryLabel(devices.battery)}
        </div>
        <span class="spacer"></span>
        <button class="round" aria-label="Lock Screen" onclick={() => { closePanel(); dispatch('lock'); }}>
          <span class="sym" style:--icon={`url(${icon('system-lock-screen-symbolic')})`}></span>
        </button>
        <button class="round" aria-label="Power Off Menu" aria-expanded={open?.id === 'power'} onclick={(e) => toggleMenu('power', e.currentTarget, e.detail === 0)}>
          <span class="sym" style:--icon={`url(${icon('system-shutdown-symbolic')})`}></span>
        </button>
      </div>
      <div class="slider-row" data-row>
        <button class="slider-icon" aria-label={settings.muted ? 'Unmute' : 'Mute'} onclick={toggleMute}>
          <span class="sym" style:--icon={`url(${icon(volumeIcon(settings.volume, settings.muted))})`}></span>
        </button>
        <Slider value={settings.muted ? 0 : settings.volume / 100} label="Volume" onchange={setVolume} />
      </div>
      <div class="slider-row" data-row>
        <span class="slider-icon"><span class="sym" style:--icon={`url(${icon('display-brightness-symbolic')})`}></span></span>
        <Slider value={settings.brightness / 100} label="Brightness" onchange={(v) => updateSettings({ brightness: Math.round(v * 100) })} />
      </div>
      {#each tiles as t (t.id)}
        <div class="tile" class:checked={t.checked} class:has-menu={!!t.menu} data-row data-tile={t.id}>
          <button class="tile-main" role="switch" aria-checked={t.checked} onclick={t.toggle}>
            <span class="sym" style:--icon={`url(${icon(t.icon)})`}></span>
            <span class="text"><span class="title">{t.title}</span>{#if t.subtitle}<span class="subtitle">{t.subtitle}</span>{/if}</span>
          </button>
          {#if t.menu}
            <span class="sep"></span>
            <button class="arrow" aria-label={t.menuLabel} aria-expanded={open?.id === t.menu} onclick={(e) => toggleMenu(t.menu!, e.currentTarget, e.detail === 0)}>
              <span class="sym" style:--icon={`url(${icon('go-next-symbolic')})`}></span>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  {#if open}
    <!-- While a tile menu is open the rest of the panel is dimmed and inactive: a click there only closes the menu. -->
    <div class="catcher" role="presentation" onclick={closeMenu}></div>
    {@const m = menus[open.id]}
    <div class="menu" class:closing bind:this={menuEl} role="menu" aria-label={m.title} style:top={`${19 + open.top + 12}px`} onanimationend={closed}>
      <div class="header">
        <span class="header-icon" class:active={m.active}><span class="sym" style:--icon={`url(${icon(m.icon)})`}></span></span>
        <span class="header-title">{m.title}</span>
      </div>
      {#each m.rows as r, i (i)}
        {#if r.kind === 'separator'}
          <div class="separator" role="separator"></div>
        {:else}
          <button class="item" class:ornamented={!!r.ornament} role={r.ornament ? 'menuitemradio' : 'menuitem'} aria-checked={r.ornament ? r.ornament === 'check' : undefined} data-id={r.id} onclick={() => r.run?.()}>
            {#if r.ornament}
              <span class="ornament">{#if r.ornament === 'check'}<span class="sym" style:--icon={`url(${icon('ornament-check-symbolic')})`}></span>{/if}</span>
            {/if}
            {#if r.icon}
              <span class="item-icon">
                <span class="sym" style:--icon={`url(${icon(r.icon)})`}></span>
                {#if r.secure}<span class="sym secure" style:--icon={`url(${icon('network-wireless-encrypted-symbolic')})`}></span>{/if}
              </span>
            {/if}
            <span class="label">{r.label}</span>
            {#if r.selected}<span class="sym" style:--icon={`url(${icon('object-select-symbolic')})`}></span>{/if}
          </button>
        {/if}
      {/each}
      {#if m.placeholder}<p class="placeholder">{m.placeholder}</p>{/if}
    </div>
  {/if}
</div>

<style>
  /* .quick-settings, .quick-toggle, .quick-toggle-menu and friends in the compiled Yaru shell CSS. */
  .quick-settings {
    position: fixed; top: 38px; right: 6px; z-index: 300; width: 402px; max-width: calc(100vw - 12px);
    color: var(--pop-fg); outline: none; transform-origin: 100% 0; animation: qs-in 150ms var(--ease) both;
  }
  .qs-panel {
    padding: 18px; border: 1px solid var(--pop-border); border-radius: var(--pop-radius);
    background: var(--pop-bg); box-shadow: var(--pop-shadow); transition: filter 400ms var(--ease);
  }
  .qs-panel.dim { filter: brightness(.6); }
  .catcher { position: absolute; inset: 0; }
  .grid { position: relative; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; gap: 12px; }
  .system, .slider-row { grid-column: 1 / -1; display: flex; align-items: center; }
  .system { gap: 12px; }
  .spacer { flex: 1; }
  .battery { display: flex; align-items: center; gap: 9px; padding: 10.5px 12px; border-radius: 16.8px; background: var(--pop-button); font-weight: 500; }
  .round { display: grid; place-items: center; padding: 10.5px; border-radius: 999px; background: var(--pop-button); }
  .round:hover { background: var(--pop-button-hover); }
  .round:active, .round[aria-expanded='true'] { background: var(--pop-button-active); }
  .slider-row { gap: 6px; }
  .slider-icon { display: grid; place-items: center; padding: 6px; border-radius: 999px; }
  button.slider-icon:hover { background: var(--pop-button-hover); }
  .tile { display: flex; min-width: 0; min-height: 3.273em; }
  .tile-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 9px; padding: 0 12px 0 15px; border-radius: 16.8px; background: var(--pop-button); text-align: left; }
  .has-menu .tile-main { padding-right: .6135em; border-radius: 16.8px 0 0 16.8px; }
  .tile-main:hover { background: var(--pop-button-hover); }
  .checked .tile-main { background: var(--accent); color: #fff; }
  .checked .tile-main:hover { background: var(--accent-hover); }
  .text { display: grid; min-width: 0; }
  .title, .subtitle, .label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .title { font-weight: 500; }
  .subtitle { font-size: .818em; }
  .sep { width: 1px; background: var(--qs-sep); }
  .checked .sep { background: var(--qs-sep-on); }
  .arrow { display: grid; place-items: center; padding: .409em .71575em; border-radius: 0 16.8px 16.8px 0; background: var(--qs-arrow); }
  .arrow:hover { background: var(--qs-arrow-hover); }
  .checked .arrow { background: var(--qs-arrow-on); color: #fff; }
  .checked .arrow:hover { background: var(--qs-arrow-on-hover); }
  .quick-settings button:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--focus-ring); }
  .menu {
    position: absolute; left: 19px; right: 19px; z-index: 1; padding: .818em; border-radius: 16.8px;
    border: 1px solid var(--qs-menu-border); background: var(--qs-menu-bg); box-shadow: var(--qs-menu-shadow);
    animation: qs-menu-in 400ms var(--ease) both;
  }
  .menu.closing { animation: qs-menu-out 200ms var(--ease) both; }
  .header { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; }
  .header-icon { display: grid; place-items: center; padding: 9px; border-radius: 999px; background: var(--qs-header-icon); }
  .header-icon .sym { width: 1.6365em; height: 1.6365em; }
  .header-icon.active { background: var(--accent); color: #fff; }
  .header-title { font-size: 1.364em; font-weight: 500; }
  .item { display: flex; align-items: center; gap: 6px; width: 100%; padding: 9px 12px; border-radius: 12px; text-align: left; }
  .item:hover, .item:focus-visible { background: color-mix(in srgb, var(--pop-fg) 10%, transparent); box-shadow: none; }
  .item.ornamented { padding-left: 6px; } /* popupMenu.js: CHECK and NONE ornaments */
  .ornament { display: grid; place-items: center; width: 1.091em; flex: none; }
  .item-icon { display: flex; align-items: flex-end; }
  .secure { width: .5455em; height: .5455em; }
  .label { flex: 1; }
  .separator { height: 1px; margin: 6px 12px; background: color-mix(in srgb, var(--pop-fg) 15%, transparent); }
  :global(:root[data-style='dark']) .separator { background: rgb(255 255 255 / .1); }
  .placeholder { margin: 0; padding: 2em 4em; text-align: center; font-size: 1.182em; font-weight: 500; }
  /* boxpointer.js: the panel drops in from its button; quickSettings.js: a tile menu makes room, then fades in. */
  @keyframes qs-in { from { opacity: 0; scale: .96; translate: 0 -6px; } }
  @keyframes qs-menu-in { 0%, 50% { opacity: 0; } }
  @keyframes qs-menu-out { to { opacity: 0; } }
</style>
