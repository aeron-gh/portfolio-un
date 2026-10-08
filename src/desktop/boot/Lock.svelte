<script lang="ts">
  import { dispatch } from '../system/session.svelte';
  import { formatClock } from '../system/clock';
  import { currentStyle, settings } from '../system/settings.svelte';
  import { icon } from '../icons';
  import type { Env } from '../env';

  let { env }: { env: Env } = $props();
  let step = $state<'curtain' | 'prompt'>('curtain');
  let now = $state(new Date());
  let entry = $state<HTMLInputElement>();
  let pending = '';
  const time = $derived(formatClock(now, settings.clock24).time);
  const date = $derived(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }));
  const wallpaper = $derived(currentStyle() === 'dark' ? env.wallpaperDark : env.wallpaperLight);

  $effect(() => {
    const t = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(t);
  });
  $effect(() => {
    if (step !== 'prompt' || !entry) return;
    entry.focus();
    if (pending) {
      entry.value = pending; // GNOME passes the key that lifted the curtain on to the password field
      pending = '';
    }
  });

  function onKey(e: KeyboardEvent) {
    if (step === 'curtain') {
      if (e.key === 'Shift' || e.key === 'CapsLock') return; // unlockDialog.js: these leave the curtain down
      if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); // typed below; otherwise the browser types it too, into the field it now finds focused
        pending = e.key;
      }
      step = 'prompt';
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      step = 'curtain';
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="lock" role="presentation" onclick={() => step === 'curtain' && (step = 'prompt')}>
  <div class="lock-bg" style:background-image={`url(${wallpaper})`}></div>
  {#if step === 'curtain'}
    <div class="lock-clock">
      <div class="lock-time">{time}</div>
      <div class="lock-date">{date}</div>
    </div>
    <p class="lock-hint">Click or press a key to unlock</p>
  {:else}
    <div class="lock-prompt">
      <img src={env.avatar} alt="" width="96" height="96" />
      <p class="lock-name">{env.fullName}</p>
      <form onsubmit={(e) => { e.preventDefault(); dispatch('unlock'); }}>
        <input bind:this={entry} type="password" placeholder="Password" aria-label="Password" autocomplete="off" />
        <button aria-label="Unlock"><span class="sym" style:--icon={`url(${icon('go-next-symbolic')})`}></span></button>
      </form>
    </div>
  {/if}
</div>

<style>
  .lock { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; background: #000; color: #fff; overflow: hidden; }
  /* blur() fades the layer's own edges to transparent over about 3 × 30 px: keep that fade off screen. */
  .lock-bg { position: absolute; inset: -100px; background: center / cover; filter: blur(30px) brightness(.65); }
  .lock-clock { position: relative; display: grid; justify-items: center; gap: 2em; transform: translateY(-15%); }
  .lock-time { font-size: 96px; font-weight: 800; line-height: 1; }
  .lock-date { font-size: 22px; font-weight: 400; }
  .lock-hint { position: absolute; bottom: 8%; font-size: .95em; color: rgb(255 255 255 / .8); }
  .lock-prompt { position: relative; display: grid; justify-items: center; gap: 12px; width: 25em; }
  .lock-prompt img { border-radius: 50%; object-fit: cover; }
  .lock-name { font-size: 1.4em; font-weight: bold; }
  .lock-prompt form { display: flex; gap: 8px; width: 100%; }
  .lock-prompt input { flex: 1; height: 2.75em; padding: 9px; border: 0; border-radius: 8px; background: #3b3b3b; color: rgb(242 242 242 / .7); outline: none; }
  .lock-prompt input:hover { background: #454545; color: #f2f2f2; }
  .lock-prompt input:focus { color: #f2f2f2; box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 80%, transparent); }
  .lock-prompt button { display: grid; place-items: center; width: 2.75em; height: 2.75em; border-radius: 50%; background: rgb(255 255 255 / .15); }
</style>
