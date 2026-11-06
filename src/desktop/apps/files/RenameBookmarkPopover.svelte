<script lang="ts">
  import { onMount } from 'svelte';
  import Popover from '../adw/Popover.svelte';

  // The sidebar's rename popover (create_rename_popover): "Name" over an entry and a Rename button, 10px in and 6px apart,
  // with a line under them when another bookmark already has that name.
  let { name, anchor, taken, onrename, onclose }: {
    name: string;
    anchor: HTMLElement;
    taken: (name: string) => boolean;
    onrename: (name: string) => void;
    onclose: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let text = $state(name);
  let entry = $state<HTMLInputElement>();
  const clash = $derived(taken(text));
  const passed = $derived(!!text && !clash);

  onMount(() => {
    entry?.focus();
    entry?.select();
  });
</script>

<Popover {anchor} label="Rename" flush {onclose}>
  <div class="grid">
    <label class="name" for="bookmark-name">Name</label>
    <input
      bind:this={entry}
      bind:value={text}
      id="bookmark-name"
      aria-label="Name"
      spellcheck="false"
      onkeydown={(e) => {
        if (e.key === 'Enter' && passed) onrename(text);
      }}
    />
    <button class="adw-button suggested" disabled={!passed} onclick={() => onrename(text)}>Rename</button>
    <span class="error">{clash ? 'This name is already taken' : ''}</span>
  </div>
</Popover>

<style>
  .grid { display: grid; grid-template-columns: 1fr auto; gap: 6px; padding: 10px; }
  .name { grid-column: 1 / -1; font-weight: bold; }
  input { min-height: 34px; padding: 0 9px; border: 0; border-radius: 9px; color: inherit; font: inherit; background: color-mix(in srgb, currentColor 10%, transparent); outline: none; }
  input:focus { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
  .error { grid-column: 1 / -1; min-height: 1.4em; }
</style>
