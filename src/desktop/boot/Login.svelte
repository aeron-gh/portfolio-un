<script lang="ts">
  import TopBar from '../shell/TopBar.svelte';
  import { dispatch } from '../system/session.svelte';
  import { icon } from '../icons';
  import type { Env } from '../env';

  let { env }: { env: Env } = $props();
  let step = $state<'users' | 'password'>('users');
  let entry = $state<HTMLInputElement>();
  let userButton = $state<HTMLButtonElement>();

  $effect(() => {
    if (step === 'password') entry?.focus();
    else userButton?.focus();
  });

  function onKey(e: KeyboardEvent) {
    if (step === 'users' && e.key === 'Enter') {
      e.preventDefault();
      step = 'password';
    } else if (step === 'password' && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      step = 'users';
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="gdm">
  <TopBar mode="login" />
  <div class="gdm-center">
    {#if step === 'users'}
      <button class="gdm-user" bind:this={userButton} onclick={() => (step = 'password')}>
        <img src={env.avatar} alt="" width="48" height="48" />
        <span>{env.fullName}</span>
      </button>
      <p class="gdm-notlisted">Not listed?</p>
    {:else}
      <img class="gdm-avatar" src={env.avatar} alt="" width="96" height="96" />
      <p class="gdm-name">{env.fullName}</p>
      <form class="gdm-prompt" onsubmit={(e) => { e.preventDefault(); dispatch('login'); }}>
        <input bind:this={entry} type="password" placeholder="Password" aria-label="Password" autocomplete="off" />
        <button aria-label="Log in"><span class="sym" style:--icon={`url(${icon('go-next-symbolic')})`}></span></button>
      </form>
    {/if}
  </div>
  <div class="gdm-logo" aria-hidden="true"><span class="sym" style:--icon={`url(${icon('distributor-logo-symbolic')})`}></span>ubuntu</div>
</div>

<style>
  .gdm { position: fixed; inset: 0; background: var(--sys-bg); color: var(--sys-fg); }
  .gdm-center { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -55%); width: 25em; display: grid; justify-items: center; gap: 12px; }
  .gdm-user { display: flex; align-items: center; gap: 12px; width: 100%; padding: calc(var(--pad) * 1.5); border-radius: var(--radius); font-weight: bold; }
  .gdm-user:hover, .gdm-user:focus-visible { background: var(--sys-hover); outline: none; }
  .gdm-user img, .gdm-avatar { border-radius: 50%; object-fit: cover; }
  .gdm-notlisted { color: rgb(242 242 242 / .6); font-size: .9em; }
  .gdm-name { font-size: 1.4em; font-weight: bold; }
  .gdm-prompt { display: flex; align-items: center; gap: 8px; width: 100%; }
  .gdm-prompt input { flex: 1; height: 2.75em; padding: 0 12px; border: 0; border-radius: var(--radius); background: rgb(242 242 242 / .1); color: var(--sys-fg); outline: 2px solid transparent; }
  .gdm-prompt input:focus { outline-color: var(--accent); }
  .gdm-prompt button { display: grid; place-items: center; width: 2.75em; height: 2.75em; border-radius: 50%; background: rgb(242 242 242 / .1); }
  .gdm-logo { position: absolute; left: 50%; bottom: 6%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; font-size: 24px; font-weight: 500; }
  .gdm-logo .sym { width: 24px; height: 24px; }
</style>
