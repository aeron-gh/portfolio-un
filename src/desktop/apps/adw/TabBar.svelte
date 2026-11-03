<script lang="ts" module>
  export type Tab = { id: string; title: string; tooltip: string; icon?: string };
</script>

<script lang="ts">
  import { icon as themed } from '../../icons';
  import './adw.css';

  // AdwTabBar inside an AdwToolbarView (libadwaita 1.9): tabs share the width, 5px apart, with thin separators that
  // hide next to the selected or hovered tab. The icon and title are centred together; the close button sits at the end.
  // A middle-click closes a tab. The owner hides the bar with fewer than two tabs (autohide).
  let { tabs, selected, onselect, onclose, oncontext }: {
    tabs: Tab[];
    selected: string;
    onselect: (id: string) => void;
    onclose: (id: string) => void;
    /** Right-click: the owner shows the tab menu at the pointer (AdwTabView's menu-model). */
    oncontext?: (id: string, x: number, y: number, anchor: HTMLElement) => void;
  } = $props();
</script>

<div class="tabbar" role="tablist">
  {#each tabs as tab (tab.id)}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="tab"
      class:selected={tab.id === selected}
      role="tab"
      tabindex={tab.id === selected ? 0 : -1}
      aria-selected={tab.id === selected}
      aria-label={tab.title}
      title={tab.tooltip}
      onclick={() => onselect(tab.id)}
      onauxclick={(e) => e.button === 1 && onclose(tab.id)}
      oncontextmenu={(e) => {
        e.preventDefault();
        oncontext?.(tab.id, e.clientX, e.clientY, e.currentTarget);
      }}
    >
      <span class="center">
        {#if tab.icon}<span class="sym" style:--icon={`url(${tab.icon})`}></span>{/if}
        <span class="title">{tab.title}</span>
      </span>
      <button class="close" aria-label="Close" title="Close Tab" onclick={(e) => (e.stopPropagation(), onclose(tab.id))}>
        <span class="sym" style:--icon={`url(${themed('window-close-symbolic')})`}></span>
      </button>
    </div>
  {/each}
</div>

<style>
  /* toolbarview > .top-bar tabbar .box, tabbar tabbox, tabbar tab, tabbar tab button.image-button, separator. */
  .tabbar { flex: none; display: flex; gap: 5px; padding: 6px 1px; min-height: 46px; user-select: none; }
  .tab {
    position: relative; flex: 1 1 0; min-width: 0; height: 34px; padding: 4px; border-radius: 9px;
    display: grid; grid-template-columns: 1fr auto; align-items: center; transition: background 150ms ease-in-out; outline: none;
  }
  .tab:hover { background: color-mix(in srgb, currentColor 7%, transparent); }
  .tab:active { background: color-mix(in srgb, currentColor 16%, transparent); }
  .tab.selected { background: color-mix(in srgb, currentColor 10%, transparent); }
  .tab.selected:hover { background: color-mix(in srgb, currentColor 13%, transparent); }
  :global(:root[data-focus-ring]) .tab:focus { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
  /* The separator in the 5px gap before each tab: gone beside the selected or hovered one. */
  .tab + .tab::before {
    content: ''; position: absolute; left: -3px; top: 9px; bottom: 9px; width: 1px;
    background: color-mix(in srgb, currentColor 15%, transparent); transition: opacity 150ms ease-in-out;
  }
  .tab.selected::before, .tab.selected + .tab::before, .tab:hover::before, .tab:hover + .tab::before { opacity: 0; }
  .center { grid-column: 1 / -1; grid-row: 1; justify-self: center; display: flex; align-items: center; min-width: 0; max-width: calc(100% - 56px); }
  .center .sym { margin: 0 2px 0 4px; }
  .title { margin: 0 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .close {
    grid-column: 2; grid-row: 1; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 99px;
    opacity: 0; transition: opacity 150ms ease-in-out, background 200ms var(--ease);
  }
  .tab:hover .close, .tab.selected .close, :global(:root[data-focus-ring]) .close:focus { opacity: 1; }
  .close:hover { background: color-mix(in srgb, currentColor 7%, transparent); }
  .close:active { background: color-mix(in srgb, currentColor 16%, transparent); }
</style>
