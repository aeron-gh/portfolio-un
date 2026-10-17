<script lang="ts">
  import AlertDialog from '../adw/AlertDialog.svelte';
  import check from '../adw/assets/check-symbolic.svg?url';
  import { draftTitle, subtitleOf, titleOf, type Doc } from './document';

  // editor-save-changes-dialog.c: every unsaved document, ticked; Save writes the ticked ones, Discard drops them all.
  let { docs, onresponse }: { docs: Doc[]; onresponse: (response: 'cancel' | 'discard' | 'save', keep: Doc[]) => void } = $props();

  let ticked = $state(docs.map(() => true));
  // A draft has no file yet: it is listed as "… (new)" and is saved in ~/Documents.
  const title = (d: Doc) => (d.path ? titleOf(d) : `${draftTitle(d.text) ?? 'Untitled Document'} (new)`);
  const folder = (d: Doc) => (d.path ? subtitleOf(d) : '~/Documents');
</script>

<AlertDialog
  heading="Save Changes?"
  body="Open documents contain unsaved changes. Changes which are not saved will be permanently lost."
  responses={[
    { id: 'cancel', label: 'Cancel' },
    { id: 'discard', label: docs.length > 1 ? 'Discard All' : 'Discard', appearance: 'destructive' },
    { id: 'save', label: 'Save', appearance: 'suggested' },
  ]}
  onresponse={(id) => onresponse(id as 'cancel' | 'discard' | 'save', docs.filter((_, i) => ticked[i]))}
>
  <div class="adw-boxed-list" style:--check={`url(${check})`}>
    {#each docs as doc, i (doc.id)}
      <label class="adw-row activatable">
        <input type="checkbox" bind:checked={ticked[i]} aria-label={title(doc)} />
        <span class="titles"><span class="title">{title(doc)}</span><span class="subtitle">{folder(doc)}</span></span>
      </label>
    {/each}
  </div>
</AlertDialog>

<style>
  /* The tick: check, check:checked (libadwaita 1.9); rows and the list are .adw-row / .adw-boxed-list (adw.css). */
  .title, .subtitle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  input {
    appearance: none; flex: none; width: 20px; height: 20px; margin: 3px; border-radius: 6px;
    box-shadow: inset 0 0 0 2px color-mix(in srgb, currentColor 15%, transparent);
    transition: background 200ms var(--ease), box-shadow 200ms var(--ease);
  }
  input:checked { box-shadow: none; background: var(--accent); }
  input:checked::after { content: ''; display: block; width: 14px; height: 14px; margin: 3px; background: #fff; mask: var(--check) center / 14px no-repeat; }
  input:focus-visible { outline: 2px solid color-mix(in srgb, var(--adw-accent) 50%, transparent); outline-offset: -2px; }
</style>
