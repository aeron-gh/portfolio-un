<script lang="ts">
  import TopBar from '../shell/TopBar.svelte';
  import { dispatch } from '../system/session.svelte';
  import { EMBED, notifyParent } from '../embed';
  import { icon } from '../icons';
  import type { Env } from '../env';
  import type PopupMenuView from '../shell/PopupMenu.svelte';
  import { loadPopupMenu } from '../shell/surfaces';
  import { safeStorage } from '../system/settings';
  import { enterFullscreen, loadSession, saveSession, type SessionKind } from '../system/fullscreen';

  let { env }: { env: Env } = $props();
  let step = $state<'users' | 'password'>('users');
  let entry = $state<HTMLInputElement>();
  let userButton = $state<HTMLButtonElement>();
  const store = safeStorage();
  let kind = $state<SessionKind>(loadSession(store));
  let chooser = $state<DOMRect | null>(null);
  const SESSIONS: { id: SessionKind; label: string }[] = [
    { id: 'ubuntu', label: 'Ubuntu' },
    { id: 'fullscreen', label: 'Ubuntu (full screen)' },
  ];

  function logIn() {
    if (kind === 'fullscreen') void enterFullscreen(); // inside the key press or click: browsers allow it here
    dispatch('login');
  }

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
    } else if (step === 'users' && e.key === 'Escape' && EMBED) {
      // On the homepage, "Press Esc to come back to the page" works from the login screen too.
      notifyParent('desktop:exit');
    }
  }
  let PopupMenu = $state.raw<typeof PopupMenuView | null>(null);
  $effect(() => {
    if (chooser && !PopupMenu) loadPopupMenu().then((m) => (PopupMenu = m.default));
  });
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
      <form class="gdm-prompt" onsubmit={(e) => { e.preventDefault(); logIn(); }}>
        <input bind:this={entry} type="password" placeholder="Password" aria-label="Password" autocomplete="off" />
        <button aria-label="Log in"><span class="sym" style:--icon={`url(${icon('go-next-symbolic')})`}></span></button>
      </form>
    {/if}
  </div>
  <div class="gdm-logo" aria-hidden="true"><span class="sym" style:--icon={`url(${icon('distributor-logo-symbolic')})`}></span>ubuntu</div>
  <div class="gdm-bottom">
    {#if step === 'password'}
      <!-- Shell buttons take no key focus on a click: the password field keeps it, and gets it back when the menu closes. -->
      <button class="gdm-round gdm-session" aria-label="Choose Session" onmousedown={(e) => e.preventDefault()} onclick={(e) => (chooser = (e.currentTarget as HTMLElement).getBoundingClientRect())}>
        <span class="sym" style:--icon={`url(${icon('cog-wheel-symbolic')})`}></span>
      </button>
    {/if}
    <button class="gdm-round gdm-a11y" aria-label="Accessibility" onmousedown={(e) => e.preventDefault()}>
      <span class="sym" style:--icon={`url(${icon('org.gnome.Settings-accessibility-symbolic')})`}></span>
    </button>
  </div>
  {#if chooser && PopupMenu}
    <PopupMenu
      items={SESSIONS.map((s) => ({ kind: 'item' as const, id: s.id, label: s.label, ornament: s.id === kind ? ('dot' as const) : ('no-dot' as const) }))}
      anchor={chooser}
      side="top"
      label="Choose Session"
      onactivate={(id) => {
        kind = id as SessionKind;
        saveSession(store, kind);
      }}
      onclose={() => (chooser = null)}
    />
  {/if}
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
  .gdm-prompt input { flex: 1; height: 2.75em; padding: 9px; border: 0; border-radius: 8px; background: #3b3b3b; color: rgb(242 242 242 / .7); outline: none; }
  .gdm-prompt input:hover { background: #454545; color: #f2f2f2; }
  .gdm-prompt input:focus { color: #f2f2f2; box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 80%, transparent); }
  .gdm-bottom { position: absolute; right: 0; bottom: 0; display: flex; gap: 16px; padding: 32px; }
  .gdm-round { display: grid; place-items: center; width: 2.75em; height: 2.75em; border-radius: 50%; background: #3b3b3b; }
  .gdm-round:hover { background: #454545; }
  .gdm-prompt button { display: grid; place-items: center; width: 2.75em; height: 2.75em; border-radius: 50%; background: rgb(242 242 242 / .1); }
  .gdm-logo { position: absolute; left: 50%; bottom: 6%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; font-size: 24px; font-weight: 500; }
  .gdm-logo .sym { width: 24px; height: 24px; }
</style>
