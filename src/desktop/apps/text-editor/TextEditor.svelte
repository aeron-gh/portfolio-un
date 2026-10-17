<script lang="ts">
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import { fs } from '../../fs/fs.svelte';
  import { HOME } from '../../fs/vfs';
  import { icon } from '../../icons';
  import { useWindow } from '../../wm/window-context';
  import { close, focus, guardClose, launch } from '../../wm/wm.svelte';
  import AboutDialog from '../adw/AboutDialog.svelte';
  import AlertDialog from '../adw/AlertDialog.svelte';
  import HeaderBar from '../adw/HeaderBar.svelte';
  import Popover from '../adw/Popover.svelte';
  import PopoverMenu, { type MenuSection } from '../adw/PopoverMenu.svelte';
  import StatusPage from '../adw/StatusPage.svelte';
  import TabBar from '../adw/TabBar.svelte';
  import type { AppProps } from '../registry';
  import { draftTitle, isModified, subtitleOf, subtitleVisible, suggestedName, titleOf, windowTitle, type Doc } from './document';
  import modifiedIcon from './icons/document-modified-symbolic.svg?url';
  import appIcon from './icons/org.gnome.TextEditor-symbolic.svg?url';
  import appIconLarge from './icons/org.gnome.TextEditor.png?url';
  import SaveChangesDialog from './SaveChangesDialog.svelte';
  import { findAll, replaceAll, step } from './find';
  import { highlight, type Style } from './markdown';
  import SearchBar, { type Search } from './SearchBar.svelte';
  import OpenPopover from './OpenPopover.svelte';
  import { addDraft, attach, detach, openDocument, prefs, remember, removeDoc, save, saveTo } from './session.svelte';
  import ThemeSelector from './ThemeSelector.svelte';

  // GNOME Text Editor 50 (editor-window.ui): a flat header bar and a tab bar over the pages of an AdwTabView;
  // with no pages, the "Open a Document" status page.
  let { winId, args }: AppProps = $props();

  const w = useWindow();
  const editor = attach(winId, args as { path?: string; doc?: Doc } | undefined);
  const doc = $derived(editor.docs.find((d) => d.id === editor.active));
  let view = $state<HTMLTextAreaElement>();
  let layer = $state<HTMLElement>();

  // Find/Replace (EditorSearchBar). The text is kept for the next search, as the bar keeps its entry.
  let search = $state<Search | null>(null);
  let lastSearch: Search = { query: '', replace: false, replacement: '', position: 0, regex: false, caseSensitive: false, wholeWord: false };
  let searchBar = $state<SearchBar>();
  let saved: [number, number] = [0, 0];
  const matches = $derived(search && doc ? findAll(doc.text, search.query, search) : []);

  // GtkSourceView picks the Markdown language for .md files; other files stay plain text for now. Search matches are
  // drawn in the same layer (the scheme's search-match style).
  const markdown = $derived(!!doc?.path?.toLowerCase().endsWith('.md'));
  const layered = $derived(markdown || matches.length > 0);
  const segments = $derived.by(() => {
    if (!doc || !layered) return [];
    const text = doc.text;
    const styles = markdown ? highlight(text) : [];
    const cuts = [...new Set([0, text.length, ...styles.flatMap((s) => [s.from, s.to]), ...matches.flatMap((m) => [m.from, m.to])])].sort((a, b) => a - b);
    const out: { text: string; style?: Style; match: number; first: boolean }[] = [];
    let si = 0;
    let mi = 0;
    for (let k = 0; k < cuts.length - 1; k++) {
      const [a, b] = [cuts[k], cuts[k + 1]];
      while (si < styles.length && styles[si].to <= a) si++;
      while (mi < matches.length && matches[mi].to <= a) mi++;
      const style = styles[si] && styles[si].from <= a ? styles[si].style : undefined;
      const match = matches[mi] && matches[mi].from <= a ? mi : -1;
      out.push({ text: text.slice(a, b), style, match, first: match >= 0 && matches[mi].from === a });
    }
    out.push({ text: '\n', match: -1, first: false }); // a final empty line is as tall here as in the text box
    return out;
  });

  /** gtk_text_view_scroll_to_iter (…, 0.1, …): bring a match into view, 10% in from the edge. */
  function reveal(i: number) {
    const el = layer?.querySelector<HTMLElement>(`[data-match="${i}"]`);
    if (!el || !view) return;
    const top = el.offsetTop - 12;
    if (top < view.scrollTop || top + el.offsetHeight > view.scrollTop + view.clientHeight) view.scrollTop = Math.max(0, top - view.clientHeight * 0.1);
  }

  function openSearch() {
    if (!doc || !view) return;
    saved = [view.selectionStart, view.selectionEnd];
    const selected = doc.text.slice(...saved);
    if (search) {
      if (selected) search.query = selected;
      searchBar?.focusEntry();
    } else search = { ...lastSearch, query: selected || lastSearch.query, position: 0 };
  }

  function closeSearch() {
    if (search) lastSearch = $state.snapshot(search);
    search = null;
    view?.focus({ preventScroll: true });
  }

  // Typing or changing an option: no match is chosen yet; the first one after the cursor scrolls into view.
  $effect(() => {
    if (!search) return;
    void [search.query, search.regex, search.caseSensitive, search.wholeWord];
    untrack(() => {
      search!.position = 0;
      void tick().then(() => reveal(step(matches, saved[0], 1)));
    });
  });

  function move(dir: 1 | -1) {
    if (!search || !view || !matches.length) return;
    const i = step(matches, dir === 1 ? view.selectionEnd : view.selectionStart, dir);
    view.setSelectionRange(matches[i].from, matches[i].to);
    search.position = i + 1;
    reveal(i);
  }

  function replaceOne() {
    if (!search || !doc || !view) return;
    if (!search.position) return move(1);
    const m = matches[search.position - 1];
    const by = replaceAll(doc.text.slice(m.from, m.to), search.query, search.replacement, search).text;
    doc.text = doc.text.slice(0, m.from) + by + doc.text.slice(m.to);
    void tick().then(() => {
      view!.setSelectionRange(m.from + by.length, m.from + by.length);
      move(1);
    });
  }

  $effect(() => {
    w.win.title = doc ? windowTitle(doc) : 'Text Editor';
  });
  // The theme picker restyles Text Editor's windows only (AdwStyleManager's color scheme for this app).
  $effect(() => {
    w.win.style = prefs.style === 'follow' ? undefined : prefs.style;
  });

  // Zoom (editor-source-view.c): each step adds 1pt to the 11pt monospace font; each page keeps its own.
  const FONT_PT = 11;
  let scales = $state<Record<string, number>>({});
  const scale = $derived(doc ? (scales[doc.id] ?? 0) : 0);
  const zoomLabel = $derived(`${Math.round(((FONT_PT + scale) / FONT_PT) * 100)}%`);
  function zoom(step: -1 | 0 | 1) {
    if (doc) scales[doc.id] = step === 0 ? 0 : Math.max(1 - FONT_PT, scale + step);
  }

  let menuOpen = $state(false);
  // The tab bar's menu-model (editor-window.ui tab_menu), at the pointer.
  let tabMenu = $state<{ id: string; x: number; y: number; anchor: HTMLElement } | null>(null);
  function moveTab(id: string, by: -1 | 1) {
    const i = editor.docs.findIndex((d) => d.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= editor.docs.length) return;
    [editor.docs[i], editor.docs[j]] = [editor.docs[j], editor.docs[i]];
  }
  function toNewWindow(id: string) {
    const doc = editor.docs.find((d) => d.id === id);
    if (!doc || editor.docs.length < 2) return;
    removeDoc(editor, id);
    void launch('text-editor', { doc: $state.snapshot(doc) });
  }
  const tabSections: MenuSection[] = $derived.by(() => {
    const i = tabMenu ? editor.docs.findIndex((d) => d.id === tabMenu!.id) : -1;
    const id = tabMenu?.id ?? '';
    const n = editor.docs.length;
    return [
      [
        { label: 'Move Left', accel: 'Shift+Ctrl+Alt+Page Up', disabled: i <= 0, onactivate: () => moveTab(id, -1) },
        { label: 'Move Right', accel: 'Shift+Ctrl+Alt+Page Down', disabled: i >= n - 1, onactivate: () => moveTab(id, 1) },
      ],
      [{ label: 'Move to New Window', accel: 'Shift+Ctrl+N', disabled: n < 2, onactivate: () => toNewWindow(id) }],
      [
        { label: 'Close Other Tabs', disabled: n < 2, onactivate: () => closeTabs(editor.docs.filter((d) => d.id !== id).map((d) => d.id)) },
        { label: 'Close', accel: 'Ctrl+W', onactivate: () => closeTab(id) },
      ],
    ];
  });
  let openOpen = $state(false);
  let openButton = $state<HTMLButtonElement>();
  let menuButton = $state<HTMLButtonElement>();
  let discarding = $state(false);
  let about = $state(false);

  /** page.discard-changes: back to the text on disk. */
  function discard() {
    if (!doc?.path) return;
    const text = fs().read(doc.path);
    Object.assign(doc, { text, saved: text });
  }
  // Each tab keeps its caret and scroll position while another is in front, as every AdwTabView page is its own view.
  // (Not its undo history: the browser keeps one undo list for the whole page.) The place is noted before the old
  // text box goes, while it still has a layout and so a scroll position.
  const places = new Map<string, [number, number, number]>();
  let shown: string | undefined;
  $effect.pre(() => {
    const id = doc?.id;
    untrack(() => {
      if (shown && shown !== id && view?.isConnected) places.set(shown, [view.selectionStart, view.selectionEnd, view.scrollTop]);
      shown = id;
    });
  });
  // The page that comes to the front takes the keyboard, as GtkSourceView grabs focus.
  $effect(() => {
    const id = doc?.id;
    if (!id || !view) return;
    const place = places.get(id);
    if (place) view.setSelectionRange(place[0], place[1]);
    view.focus({ preventScroll: true });
    if (place) view.scrollTop = place[2];
  });
  onDestroy(() => detach(winId));

  // editor_window_close_request and on_tab_view_close_page_cb: unsaved documents ask first, for the whole window or
  // for the one tab being closed.
  let asking = $state<{ docs: Doc[]; tabs: string[] | null } | null>(null);
  onMount(() =>
    guardClose(winId, () => {
      const unsaved = editor.docs.filter(isModified);
      if (!unsaved.length) return true;
      focus(winId);
      asking = { docs: unsaved, tabs: null };
      return false;
    }),
  );

  /** Close these tabs: unchanged ones at once, the rest after "Save Changes?" (win.close-current-page / close-other-pages). */
  function closeTabs(ids: string[]) {
    const unsaved = editor.docs.filter((d) => ids.includes(d.id) && isModified(d));
    for (const id of ids) if (!unsaved.some((d) => d.id === id)) dropTab(id);
    if (unsaved.length) asking = { docs: unsaved, tabs: unsaved.map((d) => d.id) };
  }
  const closeTab = (id: string) => closeTabs([id]);

  /** A closed tab's button had the focus: like GtkNotebook, hand it to the page now in front. */
  function dropTab(id: string) {
    const path = editor.docs.find((d) => d.id === id)?.path;
    if (path) remember([path]);
    places.delete(id);
    removeDoc(editor, id);
    void tick().then(() => view?.focus({ preventScroll: true }));
  }

  function answer(response: 'cancel' | 'discard' | 'save', keep: Doc[]) {
    const ask = asking!;
    asking = null;
    if (response === 'cancel') return;
    if (response === 'save') {
      for (const d of keep) if (!(d.path ? save(d) : saveTo(d, `${HOME}/Documents/${suggestedName(d)}`))) return; // stay open
    }
    if (ask.tabs) for (const id of ask.tabs) dropTab(id);
    else close(winId, true);
  }

  /** The window's shortcuts (editor-window.c). A normal browser keeps Ctrl+T and Ctrl+W; the full-screen session passes them. */
  function keys(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && (e.key === 'PageUp' || e.key === 'PageDown') && doc) {
      e.preventDefault();
      return moveTab(doc.id, e.key === 'PageUp' ? -1 : 1);
    }
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (e.shiftKey && k === 'n' && doc) toNewWindow(doc.id);
    else if (k === '+' || k === '=') zoom(1);
    else if (k === '-') zoom(-1);
    else if (k === '0') zoom(0);
    else if (e.shiftKey) return;
    else if (k === 's' && doc) save(doc);
    else if (k === 't') addDraft(editor);
    else if (k === 'k') openOpen = true; // win.focus-search pops the Open menu
    else if (k === 'f') openSearch();
    else if (k === 'w' && doc) closeTab(doc.id);
    else return;
    e.preventDefault();
  }

  // editor-window.ui primary_menu_model, with the theme and zoom rows added by editor-window.c. Items that need parts
  // not built yet are shown insensitive.
  const sections: MenuSection[] = $derived([
    themeRow,
    zoomRow,
    [{ label: 'New Window', accel: 'Ctrl+N', onactivate: () => void launch('text-editor') }],
    [
      { label: 'Save', accel: 'Ctrl+S', disabled: !doc?.path || doc.readonly, onactivate: () => doc && save(doc) },
      { label: 'Save As…', accel: 'Shift+Ctrl+S', disabled: true },
      { label: 'Discard Changes…', disabled: !(doc?.path && isModified(doc)), onactivate: () => (discarding = true) },
    ],
    [
      { label: 'Find/Replace…', accel: 'Ctrl+F', onactivate: () => void tick().then(openSearch) },
      { label: 'Print…', accel: 'Ctrl+P', disabled: true },
    ],
    [{ label: 'Fullscreen', accel: 'F11', disabled: true }],
    [
      { label: 'Preferences', accel: 'Ctrl+,', disabled: true },
      { label: 'Keyboard Shortcuts', disabled: true },
      { label: 'About Text Editor', onactivate: () => (about = true) },
    ],
  ]);

  const tabs = $derived(
    editor.docs.map((d) => ({ id: d.id, title: titleOf(d), tooltip: d.path ?? draftTitle(d.text) ?? '', icon: isModified(d) ? modifiedIcon : undefined })),
  );
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="app" onkeydown={keys}>
  <HeaderBar flat>
    {#snippet start()}
      <button bind:this={openButton} class="adw-button flat open" title="Recently Used Documents" aria-haspopup="dialog" aria-expanded={openOpen} onclick={() => (openOpen = !openOpen)}>
        <span>Open</span><span class="sym" style:--icon={`url(${icon('pan-down-symbolic')})`}></span>
      </button>
      <button class="adw-button flat image" aria-label="New Tab" title="New Tab" onclick={() => addDraft(editor)}>
        <span class="sym" style:--icon={`url(${icon('tab-new-symbolic')})`}></span>
      </button>
    {/snippet}
    {#snippet end()}
      <button class="adw-button flat image" aria-label="Document Properties" title="Document Properties" disabled>
        <span class="sym" style:--icon={`url(${icon('info-outline-symbolic')})`}></span>
      </button>
      <button
        bind:this={menuButton}
        class="adw-button flat image"
        aria-label="Main Menu"
        title="Main Menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onclick={() => (menuOpen = !menuOpen)}
      >
        <span class="sym" style:--icon={`url(${icon('open-menu-symbolic')})`}></span>
      </button>
    {/snippet}
    {#snippet title()}
      {#if doc}
        <div class="doc-title">
          <span class="row"><span class="modified">{isModified(doc) ? '•' : ''}</span><span class="title">{titleOf(doc)}</span><span></span></span>
          {#if subtitleVisible(doc)}<span class="row"><span></span><span class="subtitle">{subtitleOf(doc)}</span><span></span></span>{/if}
        </div>
      {/if}
    {/snippet}
  </HeaderBar>
  {#if editor.docs.length > 1}
    <TabBar {tabs} selected={editor.active} onselect={(id) => (editor.active = id)} onclose={closeTab} oncontext={(id, x, y, anchor) => (tabMenu = { id, x, y, anchor })} />
  {/if}
  <div class="pages">
    {#if doc}
      {#key doc.id}
        <!-- The coloured text sits behind a see-through text box, which keeps the caret, selection, undo and spell check. -->
        <div class="view" style:font-size="{FONT_PT + scale}pt">
          {#if layered}<pre bind:this={layer} class="layer" aria-hidden="true">{#each segments as seg, i (i)}{#if seg.style || seg.match >= 0}<span class={[seg.style, seg.match >= 0 && 'match']} data-match={seg.first ? seg.match : undefined}>{seg.text}</span>{:else}{seg.text}{/if}{/each}</pre>{/if}
          <textarea
            bind:this={view}
            bind:value={doc.text}
            class="editor"
            class:over={layered}
            aria-label={titleOf(doc)}
            spellcheck="true"
            readonly={doc.readonly}
            onscroll={(e) => layer && (layer.scrollTop = e.currentTarget.scrollTop)}
          ></textarea>
        </div>
      {/key}
    {:else}
      <StatusPage icon={appIcon} title="Open a Document" description="Create a new document (Ctrl+N), or open an existing one (Ctrl+O)">
        <button class="adw-button suggested pill" onclick={() => addDraft(editor)}>New Empty File</button>
      </StatusPage>
    {/if}
  </div>
  {#if search && doc}
    <SearchBar
      bind:this={searchBar}
      {search}
      count={matches.length}
      onmove={move}
      onaccept={() => {
        if (!search?.position) move(1);
        closeSearch();
      }}
      oncancel={() => {
        view?.setSelectionRange(...saved);
        closeSearch();
      }}
      onclose={closeSearch}
      onreplace={replaceOne}
      onreplaceall={() => {
        if (!search || !doc) return;
        doc.text = replaceAll(doc.text, search.query, search.replacement, search).text;
      }}
    />
  {/if}
  {#if asking}<SaveChangesDialog docs={asking.docs} onresponse={answer} />{/if}
  {#if discarding && doc}
    <AlertDialog
      heading={`Discard Changes to “${titleOf(doc)}”?`}
      body="Unsaved changes will be permanently lost."
      responses={[{ id: 'cancel', label: 'Cancel' }, { id: 'discard', label: 'Discard', appearance: 'destructive' }]}
      onresponse={(id) => {
        discarding = false;
        if (id === 'discard') discard();
      }}
    />
  {/if}
  {#if about}
    <!-- editor-application-actions.c: adw_show_about_dialog. Ubuntu builds it with Launchpad as the bug tracker (debian/rules). -->
    <AboutDialog
      name="Text Editor"
      appIcon={appIconLarge}
      developer="The GNOME Project"
      version="50.1"
      website="https://gitlab.gnome.org/GNOME/gnome-text-editor"
      issueUrl="https://bugs.launchpad.net/ubuntu/+source/gnome-text-editor/+filebug?no-redirect"
      credits={[
        { title: 'Code by', people: ['Christian Hergert', 'Christopher Davis', 'Günther Wagner', 'Lukáš Tyrychtr', 'Matthias Clasen', 'Michael Catanzaro', 'Nick Richards', 'scootergrisen', 'vanadiae'] },
        { title: 'Design by', people: ['Allan Day', 'Jakub Steiner', 'Tobias Bernard'] },
        { title: 'Documentation by', people: ['Anders Jonsson', 'Christian Hergert', 'Günther Wagner'] },
      ]}
      copyright="© 2020-2025 Christian Hergert, et al."
      license={{ name: 'GNU General Public License, version 3 or later', url: 'https://www.gnu.org/licenses/gpl-3.0.html' }}
      onclose={() => (about = false)}
    />
  {/if}
</div>
{#if openOpen && openButton}
  <OpenPopover
    anchor={openButton}
    onclose={() => (openOpen = false)}
    onopen={(path) => void openDocument(path, winId)}
    refocus={() => view?.focus({ preventScroll: true })}
  />
{/if}
{#if tabMenu}
  <Popover anchor={tabMenu.anchor} point={{ x: tabMenu.x, y: tabMenu.y }} arrow={false} align="start" label="Tab" menu onclose={() => (tabMenu = null)}>
    <PopoverMenu sections={tabSections} onclose={() => (tabMenu = null)} />
  </Popover>
{/if}
{#if menuOpen && menuButton}
  <Popover anchor={menuButton} label="Main Menu" menu onclose={() => (menuOpen = false)}>
    <PopoverMenu {sections} onclose={() => (menuOpen = false)} />
  </Popover>
{/if}

{#snippet themeRow()}
  <ThemeSelector />
{/snippet}
{#snippet zoomRow()}
  <div class="zoom">
    <button class="adw-button flat circular" aria-label="Zoom out" title="Zoom Out" onclick={() => zoom(-1)}>
      <span class="sym" style:--icon={`url(${icon('zoom-out-symbolic')})`}></span>
    </button>
    <button class="adw-button flat pill" title="Reset Zoom" onclick={() => zoom(0)}>{zoomLabel}</button>
    <button class="adw-button flat circular" aria-label="Zoom in" title="Zoom In" onclick={() => zoom(1)}>
      <span class="sym" style:--icon={`url(${icon('zoom-in-symbolic')})`}></span>
    </button>
  </div>
{/snippet}

<style>
  .app { display: contents; }
  /* editor-window.ui title-widget: two centred rows, the "•" just before the title; headerbar .title / .subtitle. */
  .doc-title { display: flex; flex-direction: column; justify-content: center; margin: 0 12px; min-width: 0; }
  .row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: baseline; min-width: 0; }
  .modified { justify-self: end; }
  .title { padding: 0 12px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .subtitle { padding: 0 12px; font-size: .8333em; opacity: .55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pages { flex: 1; min-height: 0; display: flex; background: var(--view-bg); }
  /* GtkSourceView 5.18 with the Adwaita style scheme (styles/Adwaita.xml, Adwaita-dark.xml): text, cursor and the
     def: styles markdown.lang maps to. Selection: libadwaita's text selection (accent 30% focused, text 10% not). */
  .view {
    position: relative; flex: 1; min-width: 0; display: flex; color: var(--gsv-text);
    --gsv-text: #504e55; --gsv-cursor: #77767b; --gsv-heading: #218787; --gsv-list: #c64600; --gsv-code: #4e57ba;
    --gsv-quote: #77767b; --gsv-link: #e01b24; --gsv-url: #3584e4; --gsv-label: #c64600; --gsv-special: #ed333b; --gsv-note: #fcf7b5;
  }
  :global(:root[data-style="dark"]) .view, :global(.window[data-style="dark"]) .view {
    --gsv-text: #c0bfbc; --gsv-cursor: #c0bfbc; --gsv-heading: #33b2a4; --gsv-list: #e66100; --gsv-code: #7d8ac7;
    --gsv-quote: #9a9996; --gsv-link: #ed333b; --gsv-url: #62a0ea; --gsv-label: #e66100; --gsv-special: #f66151; --gsv-note: #f5c211;
  }
  :global(.window[data-style="light"]) .view {
    --gsv-text: #504e55; --gsv-cursor: #77767b; --gsv-heading: #218787; --gsv-list: #c64600; --gsv-code: #4e57ba;
    --gsv-quote: #77767b; --gsv-link: #e01b24; --gsv-url: #3584e4; --gsv-label: #c64600; --gsv-special: #ed333b; --gsv-note: #fcf7b5;
  }
  .editor, .layer {
    margin: 0; padding: 12px; border: 0; font: inherit; font-family: var(--font-ubuntu-mono), monospace; line-height: 1.2;
    tab-size: 8; white-space: pre-wrap; overflow-wrap: break-word; scrollbar-gutter: stable;
  }
  .layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .editor { flex: 1; min-width: 0; resize: none; outline: none; overflow: auto; background: none; color: inherit; caret-color: var(--gsv-cursor); }
  .editor.over { color: transparent; }
  .editor::selection { background: color-mix(in srgb, var(--accent) 30%, transparent); }
  .editor:not(:focus)::selection { background: color-mix(in srgb, var(--gsv-text) 10%, transparent); }
  .heading { color: var(--gsv-heading); font-weight: bold; }
  .list-marker { color: var(--gsv-list); font-weight: bold; }
  .inline-code, .preformatted-section, .constant { color: var(--gsv-code); }
  .shebang { color: var(--gsv-quote); font-weight: bold; }
  .link-text { color: var(--gsv-link); }
  .link-destination { color: var(--gsv-url); font-style: italic; text-decoration: underline; text-underline-position: under; }
  .preprocessor { color: var(--gsv-label); }
  .emphasis { font-style: italic; }
  .strong-emphasis { font-weight: bold; }
  .special-char { color: var(--gsv-special); }
  .note { color: #3d3846; background: var(--gsv-note); font-weight: bold; }
  /* search-match: yellow_2 under dark_4; dark: rgba(246, 211, 45, .5) under dark_5. */
  .match { color: #3d3846; background: #f8e45c; }
  :global(:root[data-style="dark"]) .match, :global(.window[data-style="dark"]) .match { color: #241f31; background: rgb(246 211 45 / .5); }
  :global(.window[data-style="light"]) .match { color: #3d3846; background: #f8e45c; }
  /* editor-window.c zoom_box: 12px apart, 18px in from the menu's sides; the label fills the middle. */
  .zoom { display: flex; align-items: center; gap: 12px; margin: 0 18px; }
  .zoom .pill { flex: 1; }
</style>
