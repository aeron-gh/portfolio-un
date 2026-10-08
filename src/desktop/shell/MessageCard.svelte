<script lang="ts">
  import { icon } from '../icons';
  import { timeSpan, type Notice } from '../system/notifications';

  let { notice, now, banner = false, onactivate, onclose }: {
    notice: Notice;
    now: number;
    /** Banners have no expand button (messageTray.js). */
    banner?: boolean;
    onactivate: () => void;
    onclose: () => void;
  } = $props();

  let body = $state<HTMLElement>();
  let expanded = $state(false);
  let cut = $state(false);
  $effect(() => {
    void notice.body;
    if (body && !expanded) cut = body.scrollWidth > body.clientWidth;
  });
</script>

<div class="message" role="group" aria-label={`${notice.appName}: ${notice.title}`} data-notice={notice.id}>
  <div class="header">
    <span class="sym source-icon" style:--icon={`url(${icon(notice.icon)})`}></span>
    <span class="header-content"><span class="source">{notice.appName}</span><span class="time">{timeSpan(now, notice.time)}</span></span>
    {#if cut && !banner}
      <button class="round" class:expanded aria-label={expanded ? 'Collapse' : 'Expand'} onclick={() => (expanded = !expanded)}>
        <span class="sym" style:--icon={`url(${icon('notification-expand-symbolic')})`}></span>
      </button>
    {/if}
    <button class="round close" aria-label="Close" onclick={onclose}>
      <span class="sym" style:--icon={`url(${icon('window-close-symbolic')})`}></span>
    </button>
  </div>
  <button class="box" onclick={onactivate}>
    <span class="title">{notice.title}</span>
    <span class="body" class:expanded bind:this={body}>{notice.body.replace(/\n/g, ' ')}</span>
  </button>
</div>

<style>
  /* .message in the compiled Yaru shell CSS. */
  .message { padding: 6px; border-radius: 16px; border: 1px solid var(--message-border); background: var(--message-bg); box-shadow: var(--message-shadow); color: var(--pop-fg); }
  .message:hover { background: var(--message-hover); }
  .header { display: flex; align-items: flex-start; gap: 6px; padding-left: 6px; color: var(--pop-dim); }
  .source-icon { margin-top: 3px; }
  .header-content { flex: 1; min-width: 0; display: flex; gap: 6px; min-height: 1.637em; padding-bottom: 6px; align-items: center; }
  .source { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .time { margin-left: auto; white-space: nowrap; }
  .round { display: grid; place-items: center; padding: 6px; border-radius: 999px; color: var(--pop-fg); background: color-mix(in srgb, var(--pop-fg) 15%, transparent); }
  .round:hover { background: color-mix(in srgb, var(--pop-fg) 30%, transparent); }
  .round.close { margin: 3px; }
  .round.expanded .sym { rotate: 180deg; }
  .box { display: grid; gap: 4px; width: 100%; padding: 6px; text-align: left; }
  .title { font-weight: bold; }
  .title, .body { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .body.expanded { white-space: normal; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; }
  button:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--focus-ring); }
</style>
