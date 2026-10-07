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
  const time = $derived(formatClock(now, settings.clock24).time);
  const date = $derived(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }));
  const wallpaper = $derived(currentStyle() === 'dark' ? env.wallpaperDark : env.wallpaperLight);

  $effect(() => {
    const t = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(t);
  });
  $effect(() => {
    if (step === 'prompt') entry?.focus();
  });

  function onKey(e: KeyboardEvent) {
    if (step === 'curtain') {
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
  .lock-prompt input { flex: 1; height: 2.75em; padding: 0 12px; border: 0; border-radius: var(--radius); background: rgb(255 255 255 / .15); color: #fff; outline: 2px solid transparent; }
  .lock-prompt input:focus { outline-color: var(--accent); }
  .lock-prompt button { display: grid; place-items: center; width: 2.75em; height: 2.75em; border-radius: 50%; background: rgb(255 255 255 / .15); }
</style>
