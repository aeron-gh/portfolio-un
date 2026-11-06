// One tab's own state (NautilusWindowSlot): where it is, where it has been, what is selected and how far it has scrolled.
import type { History } from './history';
import { NO_SEARCH, type SearchText } from './query';
import { none, type Selection } from './selection';
import type { Sort } from './sort';

/** What a closed or moved tab takes with it (NautilusNavigationState). */
export type SavedSearch = { search: SearchText; global: boolean };

let count = 0;

export class Slot {
  readonly id = `slot-${++count}`;
  history = $state.raw<History>({ past: [], current: '/', future: [] });
  selection = $state<Selection>(none);
  /** get_directory_sort_by: the Trash and Recent always open their own way; a choice there lasts until you leave. */
  sortChoice = $state.raw<Sort | null>(null);
  /** search-visible: the entry is showing. search-global: Search Everywhere. A search stays out of the history. */
  searchOpen = $state(false);
  searchGlobal = $state(false);
  search = $state.raw<SearchText>(NO_SEARCH);
  searchSort = $state.raw<Sort | null>(null);
  /** down_list: where Alt+Down goes after Up. Any other move forgets it. */
  downList: string[] = [];
  scrollTop = 0;

  constructor(history: History, saved?: SavedSearch) {
    this.history = history;
    if (saved) {
      this.search = saved.search;
      this.searchGlobal = saved.global;
      this.searchOpen = true;
    }
  }

  /** hide_query_editor */
  leaveSearch() {
    this.searchOpen = false;
    this.searchGlobal = false;
    this.search = NO_SEARCH;
    this.searchSort = null;
  }
}
