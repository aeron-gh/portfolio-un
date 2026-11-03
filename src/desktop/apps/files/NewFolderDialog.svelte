<script lang="ts">
  import Dialog from '../adw/Dialog.svelte';
  import EntryRow from '../adw/EntryRow.svelte';
  import { checkName } from './names';

  // NautilusNewFolderDialog (nautilus-new-folder-dialog.blp), checking names as NautilusFilenameValidator does. Saying
  // that a name is taken waits half a second, so it does not flash while typing.
  let { exists, oncreate, onclose }: { exists: (name: string) => boolean; oncreate: (name: string) => void; onclose: () => void } = $props();

  let name = $state('');
  const check = $derived(checkName(name, { folder: true, exists }));
  let clash = $state(false);

  $effect(() => {
    clash = false;
    if (!check.duplicate) return;
    const timer = setTimeout(() => (clash = true), 500);
    return () => clearTimeout(timer);
  });
  const feedback = $derived(clash ? 'A folder with that name already exists' : check.feedback);
  const accept = () => check.passed && oncreate(name.trim());
</script>

<Dialog title="New Folder" width={450} {onclose}>
  <div class="page">
    <EntryRow title="Folder Name" bind:value={name} warning={!!feedback} onactivate={accept} />
    {#if feedback}<p class="feedback">{feedback}</p>{/if}
    <button class="adw-button suggested pill create" disabled={!check.passed} onclick={accept}>Create</button>
  </div>
</Dialog>

<style>
  /* preferencespage > … > box: 24px and 12px in; the label and the button 6px below the row. */
  .page { display: flex; flex-direction: column; padding: 24px 12px; }
  .feedback { margin: 6px 0 0; font-size: 82%; line-height: 140%; color: var(--adw-warning); }
  .create { align-self: center; margin-top: 6px; }
</style>
