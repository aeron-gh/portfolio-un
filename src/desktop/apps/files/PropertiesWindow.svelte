<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { close, fitHeight } from '../../wm/wm.svelte';
  import HeaderBar from '../adw/HeaderBar.svelte';
  import type { AppProps } from '../registry';
  import Properties from './Properties.svelte';

  // nautilus-properties-window.blp: Properties popped out of its dialog into an AdwWindow of Files, 480 wide and at
  // least 360 by 294, with no title. Esc closes it.
  let { winId, args }: AppProps = $props();
  const { paths, recent } = args as { paths: string[]; recent: boolean };
  let root = $state<HTMLElement>();

  onMount(() => {
    // default-width 480 and no default height: as tall as its header and page, before it is first painted.
    const bar = root?.querySelector<HTMLElement>('.headerbar');
    const scroll = root?.querySelector<HTMLElement>('.scroll');
    fitHeight(winId, (bar?.offsetHeight ?? 0) + (scroll?.scrollHeight ?? 0));
    root?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
  });
</script>

{#snippet bar(start: Snippet, title: Snippet)}
  <HeaderBar flat {start} {title} />
{/snippet}

<div bind:this={root} class="properties-window">
  <Properties {paths} {recent} {bar} active={() => true} onescape={() => close(winId)} onempty={() => close(winId)} />
</div>

<style>
  .properties-window {
    --properties-bg: var(--win-bg);
    position: relative; display: flex; flex-direction: column; height: 100%; background: var(--win-bg); color: var(--win-fg);
  }
</style>
