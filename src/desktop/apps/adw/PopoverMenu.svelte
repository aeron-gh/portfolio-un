<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /** `checked` makes it a check item (GTK_BUTTON_ROLE_CHECK): a tick at the start when on. With `radio`, a radio item
   *  (GTK_BUTTON_ROLE_RADIO): a dot in a ring. */
  export type MenuItem = {
    label: string;
    accel?: string;
    disabled?: boolean;
    checked?: boolean;
    radio?: boolean;
    onactivate?: () => void;
    /** A submenu: GTK_POPOVER_MENU_SLIDING swaps the menu for this page, with a row at the top to come back. */
    submenu?: MenuSection[];
  };
  /** A GMenu section: plain items, items under a title, or a custom widget row (gtk_popover_menu_add_child). */
  export type MenuSection = MenuItem[] | { title: string; items: MenuItem[] } | Snippet;
</script>

<script lang="ts">
  import bullet from './assets/bullet-symbolic.svg?url';
  import check from './assets/check-symbolic.svg?url';
  import previous from './assets/go-previous-symbolic.svg?url';
  import { icon } from '../../icons';
  import { tick } from 'svelte';

  // GtkPopoverMenu (libadwaita 1.9 style): sections split by separators; items 32px high with the accelerator dimmed
  // at the end. Up and Down move between items; activating one closes the menu.
  let { sections, onclose }: { sections: MenuSection[]; onclose: () => void } = $props();

  let root = $state<HTMLElement>();
  let page = $state<MenuItem | null>(null);
  const shown = $derived(page?.submenu ?? sections);

  function slide(to: MenuItem | null) {
    page = to;
    void tick().then(() => root?.querySelector<HTMLElement>('.modelbutton:not(:disabled)')?.focus());
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...root!.querySelectorAll<HTMLButtonElement>('.modelbutton:not(:disabled)')];
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? (at + 1) % items.length : (at <= 0 ? items.length : at) - 1;
    items[next].focus();
  }

  function activate(item: MenuItem) {
    if (item.submenu) return slide(item);
    onclose();
    item.onactivate?.();
  }

  const roleOf = (item: MenuItem) => (item.checked === undefined ? 'menuitem' : item.radio ? 'menuitemradio' : 'menuitemcheckbox');
</script>

{#snippet items(list: MenuItem[])}
  {#each list as item, i (i)}
    <button
      class="modelbutton"
      role={roleOf(item)}
      aria-checked={item.checked}
      aria-haspopup={item.submenu ? 'menu' : undefined}
      disabled={item.disabled}
      onclick={() => activate(item)}
      >{#if item.checked !== undefined}<span class={['check', item.radio && 'radio']} class:on={item.checked} style:--icon={`url(${item.radio ? bullet : check})`}></span>{/if}<span
        class="label">{item.label}</span>{#if item.accel}<span class="accel">{item.accel}</span>{/if}{#if item.submenu}<span class="arrow right" style:--icon={`url(${icon('go-next-symbolic')})`}></span>{/if}</button
    >
  {/each}
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={root} class="menu-box" {onkeydown}>
  {#if page}
    <button class="modelbutton title" role="menuitem" onclick={() => slide(null)}
      ><span class="arrow left" style:--icon={`url(${previous})`}></span><span class="label">{page.label}</span></button
    >
    <div class="separator" role="separator"></div>
  {/if}
  {#each shown as section, i (i)}
    {#if i > 0}<div class="separator" role="separator"></div>{/if}
    {#if typeof section === 'function'}
      {@render section()}
    {:else if 'title' in section}
      <span class="section-title">{section.title}</span>
      {@render items(section.items)}
    {:else}
      {@render items(section)}
    {/if}
  {/each}
</div>

<style>
  /* popover.menu > contents > stack > box, popover.menu modelbutton, popover.menu separator, popover.menu accelerator. */
  .menu-box { display: flex; flex-direction: column; padding: 6px; }
  .modelbutton {
    display: flex; align-items: center; min-height: 32px; min-width: 40px; padding: 0 12px; border-radius: 9px;
    text-align: left; white-space: nowrap; outline: none;
  }
  .modelbutton:hover, :global(:root[data-focus-ring]) .modelbutton:focus { background-color: color-mix(in srgb, currentColor 10%, transparent); }
  .modelbutton:active { background-color: color-mix(in srgb, currentColor 19%, transparent); }
  .modelbutton:disabled { opacity: .5; background: none; }
  .label { flex: 1; }
  /* popover.menu check(.left): 14px + 2 × 2px, no box, a tick when on. */
  .check { flex: none; width: 18px; height: 18px; margin: 0 6px 0 -2px; }
  .check.on { background: currentColor; mask: var(--icon) center / 14px no-repeat; }
  /* popover.menu radio: only menu radios have a border. */
  .radio { position: relative; border-radius: 100%; box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 30%, transparent); }
  .radio.on { background: none; mask: none; }
  .radio.on::after { content: ''; position: absolute; inset: 2px; background: currentColor; mask: var(--icon) center / 14px no-repeat; }
  /* GtkMenuSectionBox: one size group for the marks, so every label lines up with the ones that have a mark. */
  .menu-box:has(.check) .modelbutton:not(:has(.check))::before { content: ''; flex: none; width: 18px; margin: 0 6px 0 -2px; }
  /* popover.menu arrow: 16px, dim; .left and .right keep the same margins as the marks. */
  .arrow { flex: none; width: 16px; height: 16px; background: currentColor; mask: var(--icon) center / 16px no-repeat; opacity: .3; }
  .arrow.right { margin: 0 -2px 0 6px; }
  .arrow.left { margin: 0 6px 0 -2px; }
  /* GTK_BUTTON_ROLE_TITLE: the way back, named for the page it came from. */
  .title { font-weight: bold; }
  .title .label { text-align: center; padding-right: 20px; }
  .menu-box:has(.check) .title::before { display: none; }
  /* popover.menu label.title, under its section's separator. */
  .section-title { padding: 4px 32px; font-weight: bold; }
  /* popover.menu accelerator: 12px after the label, at the end, dimmed. */
  .accel { margin-left: 12px; color: color-mix(in srgb, currentColor 55%, transparent); }
  .separator { height: 1px; margin: 6px 0; background: color-mix(in srgb, currentColor 15%, transparent); }
</style>
