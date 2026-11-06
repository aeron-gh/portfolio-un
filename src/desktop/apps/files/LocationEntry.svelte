<script lang="ts">
  import { onMount } from 'svelte';
  import { icon } from '../../icons';
  import { wm } from '../../wm/wm.svelte';
  import { sym } from './icons';
  import { commonPrefix, completions, typedLocation, type Listing } from './location';

  // NautilusLocationEntry and the Cancel button linked to it (nautilus-toolbar.blp). It shows where you are, all selected,
  // or starts from `initial` when `/` or `~` opened it. Completions list under it as you type at the end of the text, and
  // the part they share is filled in and selected, ready for Tab.
  let { location, initial, winId, list, onsubmit, onclose }: {
    location: string;
    initial: string | null;
    winId: string;
    list: Listing;
    onsubmit: (text: string) => void;
    onclose: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let text = $state(initial ?? location);
  let entry = $state<HTMLInputElement>();
  /** What the list is for: the text as typed, with no filled-in part. Null until something is typed. */
  let typed = $state<string | null>(null);
  let row = $state(-1);
  const rows = $derived(typed ? completions(typed, location, list) : []);
  const before = $derived(typed ? typed.slice(0, typed.lastIndexOf('/') + 1) : '');
  const here = $derived(typedLocation(text) === location);

  onMount(() => {
    entry?.focus();
    if (initial === null) entry?.select();
    else entry?.setSelectionRange(text.length, text.length);
    if (initial !== null) typed = initial;
  });

  function oninput(e: Event & { currentTarget: HTMLInputElement }) {
    const el = e.currentTarget;
    text = el.value;
    row = -1;
    const atEnd = el.selectionStart === el.value.length;
    typed = atEnd ? el.value : null;
    if (!atEnd || !(e as InputEvent).inputType?.startsWith('insert')) return;
    const shared = commonPrefix(completions(el.value, location, list));
    if (shared.length > el.value.length && shared.toLowerCase().startsWith(el.value.toLowerCase())) {
      const from = el.value.length;
      text = shared;
      el.value = shared;
      el.setSelectionRange(from, shared.length);
    }
  }

  /** inline-selection: moving through the list shows that row in the entry. */
  function moveRow(by: 1 | -1) {
    if (!rows.length) return;
    row = (row + by + rows.length) % rows.length;
    text = rows[row];
    entry!.value = text;
    entry!.setSelectionRange(text.length, text.length);
  }

  function choose(value: string) {
    text = value;
    entry!.value = value;
    entry!.focus();
    entry!.setSelectionRange(value.length, value.length);
    typed = value;
    row = -1;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') onsubmit(text);
    else if (e.key === 'Escape') {
      e.stopPropagation();
      onclose();
    } else if (e.key === 'Tab') {
      // Tab accepts what was filled in, and goes nowhere else.
      const el = entry!;
      if (el.selectionStart !== el.selectionEnd) choose(text);
    } else if (e.key === 'ArrowDown') moveRow(1);
    else if (e.key === 'ArrowUp') moveRow(-1);
    else return;
    e.preventDefault();
  }

  /** on_location_entry_focus_leave: it goes when the focus leaves it, but not when the whole window lost the focus. */
  function onblur() {
    setTimeout(() => {
      if (entry && document.activeElement !== entry && wm.focused === winId) onclose();
    });
  }
</script>

<div class="location">
  <div class="linked">
    <div class="entry">
      <input bind:this={entry} value={text} aria-label="Location" spellcheck="false" autocomplete="off" {oninput} {onkeydown} {onblur} />
      {#if here}
        <button class="icon" aria-label="Clear Entry" title="Clear Entry" onmousedown={(e) => e.preventDefault()} onclick={() => choose('')}>
          <span class="sym" style:--icon={`url(${sym('edit-clear-symbolic')})`}></span>
        </button>
      {:else}
        <button class="icon" aria-label="Go to Location" title="Go to Location" onmousedown={(e) => e.preventDefault()} onclick={() => onsubmit(text)}>
          <span class="sym" style:--icon={`url(${sym('go-next-symbolic')})`}></span>
        </button>
      {/if}
    </div>
    <button class="adw-button cancel" aria-label="Cancel" title="Cancel" onmousedown={(e) => e.preventDefault()} onclick={onclose}>
      <span class="sym" style:--icon={`url(${icon('window-close-symbolic')})`}></span>
    </button>
  </div>
  {#if rows.length}
    <div class="completions" role="listbox" aria-label="Completions">
      {#each rows as item, i (item)}
        <button class="completion" class:selected={i === row} role="option" aria-selected={i === row} tabindex="-1" onmousedown={(e) => e.preventDefault()} onclick={() => choose(item)}>
          <span class="typed">{before}</span>{item.slice(before.length)}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .location { position: relative; flex: 1; min-width: 0; }
  .linked { display: flex; }
  /* entry (libadwaita 1.9), with .linked's squared inner corners and the focus ring GtkEntry always draws. */
  .entry {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 9px; border-radius: 9px 0 0 9px;
    background: color-mix(in srgb, currentColor 10%, transparent);
  }
  .entry:focus-within { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
  input { flex: 1; min-width: 0; border: 0; padding: 0; background: none; color: inherit; font: inherit; outline: none; }
  /* entry > image: 70% until the pointer is over it. */
  .icon { flex: none; display: grid; place-items: center; opacity: .7; }
  .icon:hover { opacity: 1; }
  .cancel { min-width: 34px; padding: 5px; border-radius: 0 9px 9px 0; margin-left: 1px; }
  /* GtkEntryCompletion's popup: a borderless popover under the entry; xpad 6 on the text, what was typed dimmed. */
  .completions {
    position: absolute; top: 100%; left: 0; right: 35px; z-index: 6; margin-top: 4px; max-height: 280px; overflow: auto; scrollbar-width: none; padding: 6px;
    display: flex; flex-direction: column; border-radius: 15px; background: var(--adw-popover-bg); color: var(--adw-popover-fg);
    box-shadow: 0 1px 5px 1px rgb(0 0 6 / 9%), 0 2px 14px 3px rgb(0 0 6 / 5%), 0 0 0 1px rgb(0 0 6 / 14%);
  }
  .completion { flex: none; min-height: 30px; padding: 0 12px; border-radius: 9px; text-align: start; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .completion:hover, .completion.selected { background: color-mix(in srgb, currentColor 10%, transparent); }
  .typed { opacity: .55; }
</style>
