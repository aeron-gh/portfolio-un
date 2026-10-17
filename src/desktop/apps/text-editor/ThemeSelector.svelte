<script lang="ts">
  import { icon } from '../../icons';
  import { prefs, setStyle, type StyleVariant } from './session.svelte';

  // EditorThemeSelector (editor-theme-selector.ui, style.css): three 44px circles; the chosen one gets an accent ring
  // and a small check badge at its bottom-right.
  const CHOICES: { id: StyleVariant; tip: string }[] = [
    { id: 'follow', tip: 'Follow System Style' },
    { id: 'light', tip: 'Light Style' },
    { id: 'dark', tip: 'Dark Style' },
  ];
</script>

<div class="themeselector" role="radiogroup" aria-label="Style" style:--check={`url(${icon('object-select-symbolic')})`}>
  {#each CHOICES as c (c.id)}
    <input type="radio" name="style" class={c.id} title={c.tip} aria-label={c.tip} checked={prefs.style === c.id} onchange={() => setStyle(c.id)} />
  {/each}
</div>

<style>
  /* window.org-gnome-TextEditor themeselector (+ checkbutton, radio): GTK min sizes are content sizes, so 44 + 2 × 1 = 46px. */
  .themeselector { display: flex; justify-content: space-around; gap: 12px; margin: 9px; }
  input {
    appearance: none; position: relative; width: 46px; height: 46px; margin: 0; padding: 1px; border-radius: 9999px;
    background-clip: content-box; box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 15%, transparent);
  }
  input:checked { box-shadow: inset 0 0 0 2px var(--accent); }
  input:focus-visible { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: 2px; }
  .follow { background-image: linear-gradient(to bottom right, #fff 49.99%, #202020 50.01%); }
  .light { background-color: #fff; }
  .dark { background-color: #202020; }
  input:checked::after {
    content: ''; position: absolute; left: 28px; top: 29px; width: 16px; height: 16px; border-radius: 50%;
    background: var(--accent) center / 12px no-repeat;
  }
  input:checked::before {
    content: ''; position: absolute; left: 30px; top: 31px; width: 12px; height: 12px; z-index: 1;
    background: #fff; mask: var(--check) center / 12px no-repeat;
  }
</style>
