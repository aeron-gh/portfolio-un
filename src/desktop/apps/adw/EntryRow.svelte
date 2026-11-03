<script lang="ts">
  import './adw.css';

  // AdwEntryRow: the title sits where the text would be until the row is focused or has text, then moves above it.
  let { title, value = $bindable(''), warning = false, onactivate }: { title: string; value?: string; warning?: boolean; onactivate?: () => void } = $props();
  let focused = $state(false);
</script>

<label class="adw-boxed-list row" class:raised={focused || !!value} class:focused class:warning>
  <span class="title">{title}</span>
  <input
    bind:value
    aria-label={title}
    spellcheck="false"
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
    onkeydown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onactivate?.();
      }
    }}
  />
</label>

<style>
  /* row.entry in a boxed list: 50px high, its title in the .subtitle style once it has moved up. */
  .row { position: relative; display: block; min-height: 50px; padding: 0 12px; cursor: text; }
  .row.focused { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -1px; }
  .title { position: absolute; left: 12px; top: 15px; transform-origin: 0 0; opacity: .55; transition: transform 150ms ease-out; pointer-events: none; }
  .raised .title { transform: translateY(-9px) scale(.8333); }
  input { position: absolute; left: 12px; right: 12px; bottom: 6px; height: 22px; padding: 0; border: 0; background: none; color: inherit; font: inherit; outline: none; caret-color: currentColor; }
  .warning, .warning .title { color: var(--adw-warning); }
  .warning .title { opacity: 1; }
</style>
