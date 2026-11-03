<script lang="ts">
  import { onMount } from 'svelte';
  import Popover from '../adw/Popover.svelte';
  import { checkName, nameEnd } from './names';

  // NautilusRenameFilePopover (nautilus-rename-file-popover.blp): pointing at the item, the name selected up to its
  // extension for a file and whole for a folder.
  let { name, folder, anchor, exists, onrename, onclose }: {
    name: string;
    folder: boolean;
    anchor: HTMLElement;
    exists: (name: string) => boolean;
    onrename: (name: string) => void;
    onclose: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let text = $state(name);
  let entry = $state<HTMLInputElement>();
  const check = $derived(checkName(text, { folder, exists, original: name }));
  const title = $derived(folder ? 'Rename Folder' : 'Rename File');
  let clash = $state(false);

  $effect(() => {
    clash = false;
    if (!check.duplicate) return;
    const timer = setTimeout(() => (clash = true), 500);
    return () => clearTimeout(timer);
  });
  const feedback = $derived(clash ? `A ${folder ? 'folder' : 'file'} with that name already exists` : check.feedback);
  const accept = () => check.passed && onrename(text.trim());

  onMount(() => {
    entry?.focus();
    entry?.setSelectionRange(0, folder ? name.length : nameEnd(name));
  });
  // RENAME_ENTRY_MIN_CHARS and _MAX_CHARS: as wide as the name, within reason.
  const chars = Math.min(Math.max(name.length, 30), 50);
</script>

<Popover {anchor} label={title} flush {onclose}>
  <div class="box">
    <h2 class="heading">{title}</h2>
    <input
      bind:this={entry}
      bind:value={text}
      class="entry"
      aria-label="New Filename"
      style:width="{chars}ch"
      spellcheck="false"
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          accept();
        }
      }}
    />
    {#if feedback}<p class="feedback">{feedback}</p>{/if}
    <button class="adw-button suggested rename" disabled={!check.passed} onclick={accept}>Rename</button>
  </div>
</Popover>

<style>
  /* nautilus-rename-file-popover.blp: 18px in, 12px between; .title-2. */
  .box { display: flex; flex-direction: column; padding: 18px; }
  .heading { margin: 0 0 12px; font-size: 136%; font-weight: 800; text-align: center; }
  /* entry (libadwaita 1.9) */
  .entry {
    box-sizing: content-box; max-width: 100%; min-height: 34px; margin-bottom: 12px; padding: 0 9px; border: 0; border-radius: 9px; color: inherit; font: inherit;
    background: color-mix(in srgb, currentColor 10%, transparent); outline: 0 solid transparent;
  }
  .entry:focus { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
  .feedback { margin: 0 0 12px; max-width: 100%; overflow-wrap: anywhere; }
  .rename { align-self: flex-end; }
</style>
