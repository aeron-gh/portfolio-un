<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /** `checked` makes it a check item (GTK_BUTTON_ROLE_CHECK): a tick at the start when on. */
  export type MenuItem = { label: string; accel?: string; disabled?: boolean; checked?: boolean; onactivate?: () => void };
  /** A GMenu section: plain items, or a custom widget row (gtk_popover_menu_add_child). */
  export type MenuSection = MenuItem[] | Snippet;
</script>

<script lang="ts">
  import check from './assets/check-symbolic.svg?url';

  // GtkPopoverMenu (libadwaita 1.9 style): sections split by separators; items 32px high with the accelerator dimmed
  // at the end. Up and Down move between items; activating one closes the menu.
  let { sections, onclose }: { sections: MenuSection[]; onclose: () => void } = $props();

  let root = $state<HTMLElement>();

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
    onclose();
    item.onactivate?.();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={root} class="menu-box" {onkeydown}>
  {#each sections as section, i (i)}
    {#if i > 0}<div class="separator" role="separator"></div>{/if}
    {#if typeof section === 'function'}
      {@render section()}
    {:else}
      {#each section as item (item.label)}
        <button
          class="modelbutton"
          role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
          aria-checked={item.checked}
          disabled={item.disabled}
          onclick={() => activate(item)}
          >{#if item.checked !== undefined}<span class="check" class:on={item.checked} style:--icon={`url(${check})`}></span>{/if}<span
            class="label">{item.label}</span>{#if item.accel}<span class="accel">{item.accel}</span>{/if}</button
        >
      {/each}
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
  .modelbutton:hover, .modelbutton:focus-visible { background-color: color-mix(in srgb, currentColor 10%, transparent); }
  .modelbutton:active { background-color: color-mix(in srgb, currentColor 19%, transparent); }
  .modelbutton:disabled { opacity: .5; background: none; }
  .label { flex: 1; }
  /* popover.menu check(.left): 14px + 2 × 2px, no box, a tick when on. */
  .check { flex: none; width: 18px; height: 18px; margin: 0 6px 0 -2px; }
  .check.on { background: currentColor; mask: var(--icon) center / 14px no-repeat; }
  /* popover.menu accelerator: 12px after the label, at the end, dimmed. */
  .accel { margin-left: 12px; color: color-mix(in srgb, currentColor 55%, transparent); }
  .separator { height: 1px; margin: 6px 0; background: color-mix(in srgb, currentColor 15%, transparent); }
</style>
