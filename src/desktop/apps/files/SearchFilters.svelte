<script lang="ts">
  import Popover from '../adw/Popover.svelte';
  import PopoverMenu from '../adw/PopoverMenu.svelte';
  import { sym } from './icons';
  import { DATE_FILTERS, TYPE_FILTERS, type DateFilter, type SearchText, type TimeType, type TypeFilter } from './query';

  // NautilusSearchPopover (nautilus-search-popover.blp): file types, which can add up; one date; and what text may match.
  let { anchor, query, content, timeType, onchange, oncontent, ontime, onclose, refocus }: {
    anchor: HTMLElement;
    query: SearchText;
    content: boolean;
    timeType: TimeType;
    onchange: (next: SearchText) => void;
    oncontent: (on: boolean) => void;
    ontime: (type: TimeType) => void;
    onclose: () => void;
    /** Where Esc sends the keyboard. */
    refocus: () => void;
  } = $props();

  const ICONS: Record<TypeFilter, string> = {
    Audio: 'audio-x-generic-symbolic',
    Documents: 'rich-text-symbolic',
    Folders: 'folder-symbolic',
    Images: 'image-print-symbolic',
    PDF: 'rich-text-symbolic',
    Spreadsheets: 'x-office-spreadsheet-symbolic',
    Text: 'paper-symbolic',
    Videos: 'camera-video-symbolic',
  };
  // time_type_to_label, and the menu's own short names.
  const TIMES: { type: TimeType; item: string; label: string }[] = [
    { type: 'last_used', item: 'Used', label: 'Date Used' },
    { type: 'last_modified', item: 'Modified', label: 'Date Modified' },
    { type: 'created', item: 'Created', label: 'Date Created' },
  ];
  let timeMenu = $state<HTMLElement | null>(null);

  const toggleType = (type: TypeFilter) => onchange({ ...query, types: query.types.includes(type) ? query.types.filter((t) => t !== type) : [...query.types, type] });
  const toggleDate = (date: DateFilter) => onchange({ ...query, date: query.date === date ? null : date });
</script>

<Popover {anchor} label="Filter Search Results" flush {onclose} {refocus}>
  <div class="filters">
    <div class="section">
      <div class="head"><h3>File Types</h3></div>
      <div class="wrap">
        {#each TYPE_FILTERS as type (type)}
          <button class="adw-button text" class:accent={query.types.includes(type)} role="checkbox" aria-checked={query.types.includes(type)} onclick={() => toggleType(type)}>
            <span class="sym" style:--icon={`url(${sym(ICONS[type])})`}></span>
            {type}
          </button>
        {/each}
        <button class="adw-button circular" aria-label="Specific Type" title="Specific Type" disabled>
          <span class="sym" style:--icon={`url(${sym('view-more-horizontal-symbolic')})`}></span>
        </button>
      </div>
    </div>
    <div class="section">
      <div class="head">
        <h3>{TIMES.find((t) => t.type === timeType)?.label}</h3>
        <button class="adw-button flat image" aria-label="Date Type" aria-haspopup="menu" aria-expanded={!!timeMenu} onclick={(e) => (timeMenu = timeMenu ? null : e.currentTarget)}>
          <span class="sym" style:--icon={`url(${sym('pan-down-symbolic')})`}></span>
        </button>
      </div>
      <div class="wrap" role="group" aria-label="Date">
        {#each DATE_FILTERS as date (date)}
          <button class="adw-button" class:accent={query.date === date} aria-pressed={query.date === date} onclick={() => toggleDate(date)}>{date}</button>
        {/each}
        <button class="adw-button circular" aria-label="Custom Date Range" title="Custom Date Range" disabled>
          <span class="sym" style:--icon={`url(${sym('view-more-horizontal-symbolic')})`}></span>
        </button>
      </div>
    </div>
    <div class="section">
      <div class="head"><h3>Text Matching</h3></div>
      <div class="wrap">
        <button class="adw-button" class:accent={content} aria-pressed={content} title="Search Inside Files" onclick={() => oncontent(true)}>Content &amp; Filename</button>
        <button class="adw-button" class:accent={!content} aria-pressed={!content} title="Don't Search Inside Files" onclick={() => oncontent(false)}>Only Filename</button>
      </div>
    </div>
  </div>
</Popover>
{#if timeMenu}
  <Popover anchor={timeMenu} label="Date Type" menu onclose={() => (timeMenu = null)}>
    <PopoverMenu
      sections={[TIMES.map((t) => ({ label: t.item, radio: true, checked: t.type === timeType, onactivate: () => ontime(t.type) }))]}
      onclose={() => (timeMenu = null)}
    />
  </Popover>
{/if}

<style>
  /* 12px in and 12px between sections, each with a heading 6px over an AdwWrapBox (natural-line-length 340, 6px apart).
     A size group gives every heading the height of the one with a button in it. */
  .filters { width: 340px; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
  .section { display: flex; flex-direction: column; gap: 6px; }
  .head { display: flex; align-items: center; gap: 6px; min-height: 34px; }
  h3 { flex: 1; margin: 0; font: inherit; font-weight: bold; }
  .wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  /* button.image-text-button */
  .text { padding-left: 9px; padding-right: 9px; }
  .accent { color: var(--adw-accent); }
</style>
