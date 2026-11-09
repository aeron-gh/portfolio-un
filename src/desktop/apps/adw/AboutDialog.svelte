<script lang="ts">
  import { onMount } from 'svelte';
  import { icon as themed } from '../../icons';
  import { trapFocus } from '../../shell/focus-trap';
  import { openLayer } from '../../system/layers.svelte';
  import Toast from './Toast.svelte';
  import external from './assets/adw-external-link-symbolic.svg?url';
  import back from './assets/go-previous-symbolic.svg?url';
  import './adw.css';

  // AdwAboutDialog (libadwaita 1.9, adw-about-dialog.ui): a 360px dialog over its window. The main page shows the
  // icon, name, developer and version, then rows; Credits and Legal are pages of an AdwNavigationView (Esc or Alt+Left
  // goes back, Esc on the main page closes). Rows for things this desktop cannot show are insensitive.
  let { name, appIcon, developer, version, website, supportUrl, issueUrl, credits, copyright, license, onclose }: {
    name: string;
    appIcon: string;
    developer: string;
    version: string;
    website: string;
    /** Adds Support Questions, as support-url does. */
    supportUrl?: string;
    issueUrl: string;
    credits: { title: string; people: string[] }[];
    copyright: string;
    license: { name: string; url: string };
    onclose: () => void;
  } = $props();

  const layer = openLayer();
  const before = document.activeElement as HTMLElement | null;
  let page = $state<'main' | 'credits' | 'legal'>('main');
  let sheet = $state<HTMLElement>();
  const TITLES = { main: '', credits: 'Credits', legal: 'Legal' };

  onMount(() => {
    sheet?.querySelector<HTMLElement>('button, a')?.focus();
    return () => {
      layer.close();
      if (before?.isConnected) before.focus();
    };
  });

  // The version button copies it, with AdwToast's "Copied to clipboard". Copying again restarts the toast.
  let toast = $state(0);
  function copyVersion() {
    navigator.clipboard?.writeText(version).catch(() => {});
    toast++;
  }

  function go(to: typeof page) {
    page = to;
    queueMicrotask(() => sheet?.querySelector<HTMLElement>('.scroll button, .scroll a, .back')?.focus());
  }

  function onkeydown(e: KeyboardEvent) {
    if (!layer.top()) return;
    const backKey = e.key === 'Escape' || (e.altKey && e.key === 'ArrowLeft');
    if (!backKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (page !== 'main') go('main');
    else if (e.key === 'Escape') onclose();
  }
</script>

<div class="dialog-host">
  <div class="dimming"></div>
  <div bind:this={sheet} class="sheet" role="dialog" aria-modal="true" aria-label="About" use:trapFocus {onkeydown}>
    <header class="hb">
      {#if page !== 'main'}
        <button class="adw-button flat image back" aria-label="Back" title="Back" onclick={() => go('main')}><span class="sym" style:--icon={`url(${back})`}></span></button>
      {/if}
      <span class="hb-title">{TITLES[page]}</span>
      <button class="close" aria-label="Close" onclick={onclose}><span class="ctl"><span class="sym" style:--icon={`url(${themed('window-close-symbolic')})`}></span></span></button>
    </header>
    <div class="scroll">
      {#if page === 'main'}
        <div class="main">
          <img class="app-icon" src={appIcon} alt="" width="128" height="128" />
          <h2 class="title-1">{name}</h2>
          <p>{developer}</p>
          <button class="adw-button app-version" onclick={copyVersion}>{version}</button>
          <div class="groups">
            <div class="adw-boxed-list">
              <a class="adw-row activatable" href={website} target="_blank" rel="noreferrer"><span class="titles">Website</span><span class="sym" style:--icon={`url(${external})`}></span></a>
            </div>
            <div class="adw-boxed-list">
              {#if supportUrl}
                <a class="adw-row activatable" href={supportUrl} target="_blank" rel="noreferrer"><span class="titles">Support Questions</span><span class="sym" style:--icon={`url(${external})`}></span></a>
              {/if}
              <a class="adw-row activatable" href={issueUrl} target="_blank" rel="noreferrer"><span class="titles">Report an Issue</span><span class="sym" style:--icon={`url(${external})`}></span></a>
              <button class="adw-row" disabled><span class="titles">Troubleshooting</span><span class="sym" style:--icon={`url(${themed('go-next-symbolic')})`}></span></button>
            </div>
            <div class="adw-boxed-list">
              <button class="adw-row activatable" onclick={() => go('credits')}><span class="titles">Credits</span><span class="sym" style:--icon={`url(${themed('go-next-symbolic')})`}></span></button>
              <button class="adw-row activatable" onclick={() => go('legal')}><span class="titles">Legal</span><span class="sym" style:--icon={`url(${themed('go-next-symbolic')})`}></span></button>
            </div>
          </div>
        </div>
      {:else if page === 'credits'}
        <div class="subpage">
          {#each credits as section (section.title)}
            <div class="adw-group">
              <h3 class="heading">{section.title}</h3>
              <div class="adw-boxed-list">
                {#each section.people as person (person)}<div class="adw-row"><span class="titles">{person}</span></div>{/each}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="subpage">
          <p class="body">{copyright}<br /><br />This application comes with absolutely no warranty. See the <a href={license.url} target="_blank" rel="noreferrer">{license.name}</a> for details.</p>
        </div>
      {/if}
    </div>
    {#if toast}
      {#key toast}<Toast title="Copied to clipboard" ondismiss={() => (toast = 0)} />{/key}
    {/if}
  </div>
</div>

<style>
  /* dialog-host, floating-sheet > dimming / sheet (AdwDialog), dialog.about .main-page / .subpage, .app-version. */
  .dialog-host { position: absolute; inset: 0; z-index: 10; display: grid; place-items: center; padding: 12px; }
  .dimming { position: absolute; inset: 0; background: rgb(from var(--adw-shade) r g b / calc(alpha * 2)); }
  .sheet {
    position: relative; display: flex; flex-direction: column; width: 360px; max-width: 100%; max-height: 100%;
    border-radius: 15px; background: var(--win-bg); color: var(--win-fg); overflow: hidden;
    box-shadow: 0 0 14px 2px rgb(0 0 6 / 3%), 0 0 5px 2px rgb(0 0 6 / 10%), 0 0 0 1px rgb(0 0 0 / 5%); outline: 1px solid rgb(255 255 255 / 7%); outline-offset: -1px;
  }
  /* toolbarview > .top-bar headerbar: flat, 46px; the dialog's own close button. */
  .hb { flex: none; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; min-height: 46px; padding: 6px 7px; }
  .back { grid-column: 1; justify-self: start; }
  .hb-title { grid-column: 2; font-weight: bold; }
  .close { grid-column: 3; justify-self: end; min-width: 24px; padding: 5px; display: grid; place-items: center; }
  .ctl {
    display: grid; place-items: center; width: 24px; height: 24px; border-radius: 100%;
    background: color-mix(in srgb, currentColor 10%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 15%, transparent);
  }
  .close:hover .ctl { background: color-mix(in srgb, currentColor 15%, transparent); }
  .scroll { flex: 1; min-height: 0; overflow: auto; }
  .main { display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 12px; text-align: center; }
  .app-icon { filter: drop-shadow(0 1px 12px rgb(0 0 6 / 5%)) drop-shadow(0 1px rgb(0 0 6 / 30%)); }
  .title-1 { margin: 0; font-size: 181%; font-weight: 800; }
  p { margin: 0; }
  .app-version { margin-top: 3px; min-height: 0; padding: 3px 18px; border-radius: 999px; color: var(--adw-accent); }
  .groups { align-self: stretch; display: flex; flex-direction: column; gap: 18px; margin: 18px 0 6px; text-align: left; }
  .subpage { display: flex; flex-direction: column; gap: 18px; margin: 18px 12px; }
  .heading { margin: 0; font-size: 1em; }
  .body { line-height: 1.4; }
  .body a { color: var(--adw-accent); }
</style>
