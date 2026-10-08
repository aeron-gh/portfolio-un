<script lang="ts">
  import { onMount } from 'svelte';
  import MessageCard from './MessageCard.svelte';
  import { bannerDone, dismiss, notifications } from '../system/notifications.svelte';

  // messageTray.js: it drops in below the top bar, stays 4 s once it has arrived, waits while the pointer is on it,
  // and leaves 200 ms after the pointer does.
  const notice = notifications.banner!;
  let leaving = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function wait(ms: number) {
    clearTimeout(timer);
    timer = setTimeout(() => (leaving = true), ms);
  }
  function ended() {
    if (leaving) bannerDone();
    else wait(4000);
  }
  function remove() {
    dismiss(notice.id);
    clearTimeout(timer);
    leaving = true;
  }
  onMount(() => () => clearTimeout(timer));
</script>

<div class="banner-area">
  <div
    class="notification-banner"
    class:leaving
    role="alert"
    onanimationend={ended}
    onpointerenter={() => clearTimeout(timer)}
    onpointerleave={() => !leaving && wait(200)}
  >
    <MessageCard {notice} now={notice.time} banner onactivate={remove} onclose={remove} />
  </div>
</div>

<style>
  .banner-area { position: fixed; top: 32px; left: 0; right: 0; z-index: 450; display: grid; justify-items: center; pointer-events: none; }
  /* .notification-banner: 34em wide, min-height 64px; shows and hides in 200 ms with ease-out-back. */
  .notification-banner {
    width: 34em; max-width: calc(100vw - 8px); min-height: 64px; margin: 4px; border-radius: 16px; pointer-events: auto;
    box-shadow: var(--banner-shadow); animation: banner-in 200ms cubic-bezier(.175, .885, .32, 1.275) both;
  }
  .notification-banner.leaving { animation: banner-out 200ms cubic-bezier(.175, .885, .32, 1.275) both; }
  @keyframes banner-in { from { opacity: 0; translate: 0 -100%; scale: .9; } }
  @keyframes banner-out { to { opacity: 0; translate: 0 -100%; } }
</style>
