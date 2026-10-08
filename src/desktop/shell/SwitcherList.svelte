<script lang="ts" module>
  export type SwitcherItem = { id: string; icon: string; label: string };
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { icon } from '../icons';

  let { items, selected, onpick, onhover, size = 96 }: {
    items: SwitcherItem[];
    selected: number;
    onpick: (id: string) => void;
    onhover?: (index: number) => void;
    size?: number;
  } = $props();

  // switcherPopup.js: the pointer is ignored for 500ms after the list appears and after each key press or scroll, so a
  // list that opens under a resting pointer does not jump to the item there.
  let mouseActive = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function disableHover() {
    mouseActive = false;
    clearTimeout(timer);
    timer = setTimeout(() => (mouseActive = true), 500);
  }
  onMount(() => {
    disableHover();
    addEventListener('keydown', disableHover, true);
    addEventListener('wheel', disableHover, true);
    return () => {
      clearTimeout(timer);
      removeEventListener('keydown', disableHover, true);
      removeEventListener('wheel', disableHover, true);
    };
  });
</script>

<div class="switcher-list" role="listbox" aria-label="Switcher">
  {#each items as item, i (item.id)}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="item-box" role="option" tabindex="-1" aria-selected={i === selected} data-id={item.id} onclick={() => onpick(item.id)} onpointermove={() => mouseActive && onhover?.(i)}>
      <img src={icon(item.icon)} alt="" width={size} height={size} draggable="false" />
      <span class="item-label" style:max-width="{size + 24}px">{item.label}</span>
    </div>
  {/each}
</div>

<style>
  /* .switcher-list in the compiled Yaru shell CSS (dark in both styles). */
  .switcher-list {
    display: flex; gap: 6px; padding: 12px; max-width: 100%; overflow: hidden;
    border-radius: 28px; border: 1px solid rgb(255 255 255 / .02);
    background: var(--switcher-bg); color: #fff; box-shadow: 0 8px 8px 0 rgb(0 0 0 / .05);
  }
  :global(:root[data-style='dark']) .switcher-list { box-shadow: 0 8px 8px 0 rgb(0 0 0 / .2); }
  .item-box { display: grid; justify-items: center; gap: 6px; padding: 6px; border-radius: 16px; min-width: 0; }
  .item-box[aria-selected='true'] { background: rgb(255 255 255 / .2); }
  .item-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
