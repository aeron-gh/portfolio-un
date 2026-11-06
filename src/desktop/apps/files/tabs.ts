// The order of a window's tabs (adw-tab-view.c). Each remembers the tab it was opened from, which decides where it goes
// and which tab comes forward when it closes.
export type Tab = { id: string; parent: string | null };

function descends(tabs: Tab[], id: string | null, from: string): boolean {
  for (let at = id; at; at = tabs.find((t) => t.id === at)?.parent ?? null) if (at === from) return true;
  return false;
}

/** adw_tab_view_add_page: after its parent and everything already opened from it; with no parent, at the end. */
export function addTab(tabs: Tab[], tab: Tab): Tab[] {
  let at = tabs.length;
  if (tab.parent) {
    at = tabs.findIndex((t) => t.id === tab.parent) + 1;
    while (at < tabs.length && descends(tabs, tabs[at].id, tab.parent)) at++;
  }
  return [...tabs.slice(0, at), tab, ...tabs.slice(at)];
}

/** select_previous_page, for the tab in front; anything else leaves the selection alone. */
export function closeTab(tabs: Tab[], id: string, selected: string): { tabs: Tab[]; selected: string | null } {
  const at = tabs.findIndex((t) => t.id === id);
  const closing = tabs[at];
  let next: string | null = selected;
  if (id === selected) {
    const previous = tabs[at - 1];
    if (closing.parent && previous && descends(tabs, previous.id, closing.parent)) next = previous.id;
    else next = tabs[at + 1]?.id ?? previous?.id ?? null;
  }
  // page_parent_weak_notify: its children pass to its own parent.
  const left = tabs.filter((t) => t.id !== id).map((t) => (t.parent === id ? { ...t, parent: closing.parent } : t));
  return { tabs: left, selected: next };
}

export function moveTab(tabs: Tab[], id: string, by: 1 | -1): Tab[] {
  const at = tabs.findIndex((t) => t.id === id);
  const to = at + by;
  if (to < 0 || to >= tabs.length) return tabs;
  const out = [...tabs];
  [out[at], out[to]] = [out[to], out[at]];
  return out;
}

/** Ctrl+Page Up and Page Down: past either end they wrap round. */
export function nextTab(tabs: Tab[], id: string, by: 1 | -1): string {
  const at = tabs.findIndex((t) => t.id === id);
  return tabs[(at + by + tabs.length) % tabs.length].id;
}
