<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { icon as themed } from '../../icons';
  import { trapFocus } from '../../shell/focus-trap';
  import { openLayer } from '../../system/layers.svelte';
  import '../adw/adw.css';
  import { sym } from './icons';
  import Properties from './Properties.svelte';

  // nautilus_properties_present_dialog: an AdwDialog over its window, 480px wide, whose main page has a button that
  // pops it out into a window of its own (popout_window_clicked).
  let { paths, recent, onpopout, onclose }: {
    paths: string[];
    /** Opened from Recent. */
    recent: boolean;
    /** With the height its content wants. */
    onpopout: (height: number) => void;
    onclose: () => void;
  } = $props();

  const layer = openLayer();
  const before = document.activeElement as HTMLElement | null;
  let sheet = $state<HTMLElement>();

  onMount(() => {
    sheet?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    return () => {
      layer.close();
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  });

  function popout() {
    const bar = sheet?.querySelector<HTMLElement>('.hb');
    const scroll = sheet?.querySelector<HTMLElement>('.scroll');
    onpopout((bar?.offsetHeight ?? 0) + (scroll?.scrollHeight ?? 0));
  }
</script>

{#snippet bar(start: Snippet, title: Snippet, page: 'main' | 'permissions')}
  <header class="hb">
    <div class="start">{@render start()}</div>
    <div class="title">{@render title()}</div>
    <div class="end">
      {#if page === 'main'}
        <!-- popout_button has no tooltip; the name is only for screen readers, and is this desktop's own. -->
        <button class="adw-button flat image" aria-label="Open in Window" onclick={popout}>
          <span class="sym" style:--icon={`url(${sym('external-link-symbolic')})`}></span>
        </button>
      {/if}
      <button class="close" aria-label="Close" title="Close" onclick={onclose}><span class="ctl"><span class="sym" style:--icon={`url(${themed('window-close-symbolic')})`}></span></span></button>
    </div>
  </header>
{/snippet}

<div class="dialog-host">
  <div class="dimming"></div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div bind:this={sheet} class="sheet" role="dialog" aria-modal="true" aria-label="Properties" tabindex="-1" use:trapFocus onkeydown={(e) => e.stopPropagation()}>
    <Properties {paths} {recent} {bar} active={() => layer.top()} onescape={onclose} onempty={onclose} />
  </div>
</div>

<style>
  /* dialog-host, floating-sheet > dimming / sheet (AdwDialog) */
  .dialog-host { position: absolute; inset: 0; z-index: 10; display: grid; place-items: center; padding: 12px; }
  .dimming { position: absolute; inset: 0; background: rgb(from var(--adw-shade) r g b / calc(alpha * 2)); }
  .sheet {
    --properties-bg: var(--adw-dialog-bg);
    position: relative; display: flex; flex-direction: column; width: 480px; max-width: 100%; max-height: 100%;
    border-radius: 15px; background: var(--adw-dialog-bg); color: var(--adw-dialog-fg); overflow: hidden;
    box-shadow: 0 0 14px 2px rgb(0 0 6 / 3%), 0 0 5px 2px rgb(0 0 6 / 10%), 0 0 0 1px rgb(0 0 0 / 5%);
  }
  /* toolbarview > .top-bar headerbar: flat, 46px; show-title is off on the main page. */
  .hb { flex: none; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; min-height: 46px; padding: 6px 7px; }
  .start { justify-self: start; align-self: stretch; display: flex; }
  .end { justify-self: end; display: flex; align-items: center; gap: 6px; }
  .close { min-width: 24px; padding: 5px; display: grid; place-items: center; }
  .ctl {
    display: grid; place-items: center; width: 24px; height: 24px; border-radius: 100%;
    background: color-mix(in srgb, currentColor 10%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 15%, transparent);
  }
  .close:hover .ctl { background: color-mix(in srgb, currentColor 15%, transparent); }
</style>
