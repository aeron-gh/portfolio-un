<script lang="ts">
  import { onMount } from 'svelte';
  import { COUNTDOWN, dialogText, shownSeconds } from '../system/end-session';
  import { cancelEndSession, confirmEndSession, endSession } from '../system/end-session.svelte';
  import { openLayer, type Layer } from '../system/layers.svelte';
  import { trapFocus } from './focus-trap';
  let layer: Layer | undefined;

  let { realName }: { realName: string } = $props();

  const kind = endSession.kind ?? 'log-out';
  const before = document.activeElement as HTMLElement | null;
  let left = $state(COUNTDOWN);
  let cancel = $state<HTMLButtonElement>();
  const text = $derived(dialogText(kind, realName, shownSeconds(COUNTDOWN, left)));

  onMount(() => {
    layer = openLayer();
    cancel!.focus(); // dialog.js: the first button (Cancel) takes key focus
    const start = Date.now();
    // At zero the dialog runs its action by itself.
    const t = setInterval(() => {
      left = COUNTDOWN - (Date.now() - start) / 1000;
      if (left <= 0) confirmEndSession();
    }, 1000);
    return () => {
      layer?.close();
      clearInterval(t);
      if (before?.isConnected) before.focus();
    };
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    cancelEndSession();
  }
</script>

<div class="lightbox" role="presentation" {onkeydown}>
  <div class="modal-dialog" role="alertdialog" aria-modal="true" aria-labelledby="end-session-title" aria-describedby="end-session-text" use:trapFocus>
    <div class="content">
      <h2 id="end-session-title">{text.title}</h2>
      <p id="end-session-text">{text.description}</p>
    </div>
    <div class="buttons">
      <button bind:this={cancel} onclick={cancelEndSession}>Cancel</button>
      <button onclick={confirmEndSession}>{text.confirm}</button>
    </div>
  </div>
</div>

<style>
  /* lightbox.js with radialEffect: black, alpha 1 − mix(1, 0.3, t) × 0.5 from the centre (0.5) to the corners (0.85). */
  .lightbox {
    position: fixed; inset: 0; z-index: 500; display: grid; place-items: center;
    background: radial-gradient(farthest-corner, rgb(0 0 0 / .5), rgb(0 0 0 / .85));
    animation: modal-in 100ms var(--ease) both;
  }
  /* .modal-dialog and .end-session-dialog in the compiled Yaru shell CSS. */
  .modal-dialog {
    display: grid; gap: 18px; width: 24em; padding: 24px; border-radius: 18px;
    background: var(--modal-bg); color: var(--pop-fg); box-shadow: 0 12px 8px 12px rgb(0 0 0 / .03);
  }
  .content { display: grid; gap: 18px; padding-top: 12px; text-align: center; }
  h2 { margin: 0; font-size: 1.364em; font-weight: 550; }
  p { margin: 0; }
  .buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 6px; }
  .buttons button { padding: 12px; border-radius: 12px; font-weight: bold; background: color-mix(in srgb, var(--pop-fg) 10%, transparent); }
  .buttons button:hover { background: color-mix(in srgb, var(--pop-fg) 13%, transparent); }
  .buttons button:active { background: color-mix(in srgb, var(--pop-fg) 16%, transparent); }
  .buttons button:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--focus-ring); }
  @keyframes modal-in { from { opacity: 0; } }
</style>
