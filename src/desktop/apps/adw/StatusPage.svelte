<script lang="ts">
  import type { Snippet } from 'svelte';
  import './adw.css';

  // AdwStatusPage (libadwaita 1.9): a dimmed 128px icon, a title-1 heading, a description and an optional child.
  let { icon, title, description, compact = false, children }: { icon?: string; title: string; description?: string; compact?: boolean; children?: Snippet } = $props();
</script>

<div class="statuspage" class:compact>
  <div class="box">
    {#if icon}<span class="sym icon" style:--icon={`url(${icon})`}></span>{/if}
    <h2 class="title">{title}</h2>
    {#if description}<p class="description">{description}</p>{/if}
    {#if children}<div class="child">{@render children()}</div>{/if}
  </div>
</div>

<style>
  /* statuspage > scrolledwindow > viewport > box (margin 36px 12px, 36px apart), its clamp box (12px apart), .icon, .title. */
  .statuspage { flex: 1; min-height: 0; overflow: auto; display: grid; place-items: center; }
  .box { margin: 36px 12px; display: flex; flex-direction: column; align-items: center; gap: 12px; max-width: 600px; text-align: center; }
  .icon { width: 128px; height: 128px; color: color-mix(in srgb, currentColor 55%, transparent); }
  .title { margin: 0; font-size: 181%; font-weight: 800; }
  /* .compact: 24px round the box; the title is .title-2. */
  .compact .box { margin: 24px 12px; }
  .compact .title { font-size: 136%; }
  .description { margin: 0; }
  .child { margin-top: 24px; }
</style>
